// src/worker.ts
export interface Env {
  AI: Ai;
  SESSION_DO: DurableObjectNamespace;
  // Static assets fetcher provided by [assets] in wrangler.toml
  ASSETS?: Fetcher;
}

// Durable Object to keep per-session memory/state
export class SessionDO {
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  private state: DurableObjectState;
  private env: Env;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const storage = this.state.storage;

    if (request.method === "GET" && url.pathname === "/history") {
      const history = (await storage.get<any[]>("history")) ?? [];
      return Response.json({ history });
    }

    if (request.method === "POST" && url.pathname === "/append") {
      const body = await request.json().catch(() => ({} as any));
      const { role, content } = (body as any) ?? {};
      if (!role || !content) return new Response("Bad Request", { status: 400 });
      const history = (await storage.get<any[]>("history")) ?? [];
      history.push({ role, content, ts: Date.now() });
      // keep last 20
      const trimmed = history.slice(-20);
      await storage.put("history", trimmed);
      return Response.json({ ok: true, size: trimmed.length });
    }

    if (request.method === "POST" && url.pathname === "/reset") {
      await storage.delete("history");
      return Response.json({ ok: true });
    }

    return new Response("Not Found", { status: 404 });
  }
}

function resolveModel(model?: string): string {
  const DEFAULT = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  if (!model) return DEFAULT;
  const m = model.toLowerCase();
  // Alias unsupported requests to a safe default
  if (m === "gpt-5" || m === "gpt5" || m === "gpt-4.1") return DEFAULT;
  return model;
}

function buildSystemPrompt(): string {
  const END = "<<<END_OF_RECIPE>>>";
  return [
    "You are a helpful, safety-conscious recipe generator.",
    "Given a list of ingredients the user has on hand, produce:",
    "- a recipe title",
    "- 1-2 sentence summary",
    "- ingredients list (quantities if possible)",
    "- step-by-step instructions",
    "- optional tips and substitutions",
    "Format as plain text with clear sections.",
    `At the very end of your response, append a single line containing ${END}. Do not output anything after this marker.`,
  ].join("\n");
}

function userPromptFromInputs(ingredients: string[], extras?: string): string {
  const list = ingredients.map((s) => `- ${s.trim()}`).join("\n");
  const extra = extras?.trim() ? `\nConstraints or preferences: ${extras.trim()}` : "";
  return `Here are the ingredients I have:\n${list}${extra}\nGenerate one approachable recipe. If crucial items are missing, suggest substitutions.`;
}

async function getOrCreateSessionId(request: Request): Promise<string> {
  const cookie = request.headers.get("Cookie") || "";
  const match = /sid=([^;]+)/.exec(cookie);
  if (match) return match[1];
  // create a new random session id
  const sid = crypto.randomUUID();
  return sid;
}

function setSessionCookieHeaders(sid: string): HeadersInit {
  const h = new Headers();
  h.set("Set-Cookie", `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`); // 30 days
  h.set("Content-Type", "application/json");
  return h;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route API requests first
    if (url.pathname === "/api/recipe" && request.method === "POST") {
      const sid = await getOrCreateSessionId(request);
      const id = env.SESSION_DO.idFromName(sid);
      const stub = env.SESSION_DO.get(id);

      const body = await request.json().catch(() => ({} as any));
      const ingredients: string[] = Array.isArray((body as any).ingredients) ? (body as any).ingredients : [];
      const extras: string | undefined = typeof (body as any).extras === "string" ? (body as any).extras : undefined;
      const model = resolveModel((body as any).model);

      if (!ingredients.length) {
        const headers = setSessionCookieHeaders(sid);
        return new Response(JSON.stringify({ error: "Provide at least one ingredient." }), { status: 400, headers });
      }

      // Load history from DO
      const historyResp = await stub.fetch("https://do/history");
      const { history } = (await historyResp.json()) as { history: Array<{ role: string; content: string }>; };

      // Build messages for the LLM
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      messages.push({ role: "system", content: buildSystemPrompt() });
      for (const h of history ?? []) {
        if (h.role === "user" || h.role === "assistant") messages.push(h as any);
      }
      const userMsg = { role: "user" as const, content: userPromptFromInputs(ingredients, extras) };
      messages.push(userMsg);

      try {
        const END = "<<<END_OF_RECIPE>>>";
        const runOnce = async (msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>) => {
          const result = await env.AI.run(model, { messages: msgs, stream: false, max_tokens: 3072, temperature: 0.6, top_p: 0.9 });
          return (result as any).response ?? (result as any).output_text ?? (typeof result === "string" ? result : JSON.stringify(result));
        };

        // First attempt
        let full = await runOnce(messages);

        // Auto-continue until END marker or max rounds
        let rounds = 0;
        while (!full.includes(END) && rounds < 4) {
          const contMsgs = [
            { role: "system", content: buildSystemPrompt() },
          ] as Array<{ role: "system" | "user" | "assistant"; content: string }>;
          for (const h of (history ?? [])) {
            if (h.role === "user" || h.role === "assistant") contMsgs.push(h as any);
          }
          contMsgs.push(userMsg);
          contMsgs.push({ role: "assistant", content: full });
          contMsgs.push({
            role: "user",
            content: `Continue exactly where you left off. Do not repeat completed sections. Finish any remaining sections. When you are completely finished, append the end marker ${END}.`
          });
          const more = await runOnce(contMsgs);
          full += (full.endsWith("\n") ? "" : "\n") + more;
          rounds++;
        }

        const clean = full.replaceAll(END, "").trim();

        // Persist to DO
        await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify(userMsg), headers: { "Content-Type": "application/json" } });
        await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify({ role: "assistant", content: clean }), headers: { "Content-Type": "application/json" } });

        const headers = setSessionCookieHeaders(sid);
        return new Response(JSON.stringify({ model, recipe: clean }), { headers });
      } catch (err: any) {
        const headers = setSessionCookieHeaders(sid);
        const fallback = "@cf/meta/llama-3.1-8b-instruct-fast";
        if (model !== fallback) {
          try {
            const END = "<<<END_OF_RECIPE>>>";
            const runOnce = async (msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>) => {
              const result = await env.AI.run(fallback, { messages: msgs, stream: false, max_tokens: 3072, temperature: 0.6, top_p: 0.9 });
              return (result as any).response ?? (result as any).output_text ?? String(result);
            };
            let full = await runOnce(messages);
            let rounds = 0;
            while (!full.includes(END) && rounds < 4) {
              const contMsgs = [
                { role: "system", content: buildSystemPrompt() },
              ] as Array<{ role: "system" | "user" | "assistant"; content: string }>;
              for (const h of (history ?? [])) {
                if (h.role === "user" || h.role === "assistant") contMsgs.push(h as any);
              }
              contMsgs.push(userMsg);
              contMsgs.push({ role: "assistant", content: full });
              contMsgs.push({ role: "user", content: `Continue exactly where you left off and finish with ${END}. Do not repeat.` });
              const more = await runOnce(contMsgs);
              full += (full.endsWith("\n") ? "" : "\n") + more;
              rounds++;
            }
            const clean = full.replaceAll(END, "").trim();
            await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify(userMsg), headers: { "Content-Type": "application/json" } });
            await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify({ role: "assistant", content: clean }), headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify({ model: fallback, recipe: clean, note: "Auto-fallback used." }), { headers });
          } catch (_) {
            // fall-through to error
          }
        }
        return new Response(JSON.stringify({ error: "AI request failed", detail: String(err?.message || err) }), { status: 500, headers });
      }
    }

    // Streaming recipe endpoint
    if (url.pathname === "/api/recipe/stream" && request.method === "POST") {
      const sid = await getOrCreateSessionId(request);
      const id = env.SESSION_DO.idFromName(sid);
      const stub = env.SESSION_DO.get(id);

      const body = await request.json().catch(() => ({} as any));
      const ingredients: string[] = Array.isArray((body as any).ingredients) ? (body as any).ingredients : [];
      const extras: string | undefined = typeof (body as any).extras === "string" ? (body as any).extras : undefined;
      const model = resolveModel((body as any).model);

      if (!ingredients.length) {
        const headers = setSessionCookieHeaders(sid);
        return new Response(JSON.stringify({ error: "Provide at least one ingredient." }), { status: 400, headers });
      }

      // Load history and build messages
      const historyResp = await stub.fetch("https://do/history");
      const { history } = (await historyResp.json()) as { history: Array<{ role: string; content: string }>; };

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      messages.push({ role: "system", content: buildSystemPrompt() });
      for (const h of history ?? []) {
        if (h.role === "user" || h.role === "assistant") messages.push(h as any);
      }
      const userMsg = { role: "user" as const, content: userPromptFromInputs(ingredients, extras) };
      messages.push(userMsg);

      try {
        const aiStream = (await env.AI.run(model, { messages, stream: true, max_tokens: 1536, temperature: 0.6, top_p: 0.9 })) as unknown as ReadableStream;
        // tee the stream so we can both return it to the client and persist to history
        const [s1, s2] = aiStream.tee();

        // Persist asynchronously after completion
        ctx.waitUntil((async () => {
          const reader = s2.getReader();
          const decoder = new TextDecoder();
          let acc = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) acc += decoder.decode(value, { stream: true });
          }
          acc += decoder.decode(); // flush
          // Save conversation
          try {
            await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify(userMsg), headers: { "Content-Type": "application/json" } });
            await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify({ role: "assistant", content: acc }), headers: { "Content-Type": "application/json" } });
          } catch (_) {}
        })());

        const headers = new Headers(setSessionCookieHeaders(sid));
        headers.set("Content-Type", "text/plain; charset=utf-8");
        headers.set("Cache-Control", "no-cache");
        return new Response(s1, { headers });
      } catch (err: any) {
        // Fallback to non-streaming on failure
        try {
          const result = await env.AI.run(model, { messages, stream: false, max_tokens: 1536, temperature: 0.6, top_p: 0.9 });
          const text = (result as any).response ?? (result as any).output_text ?? String(result);
          await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify(userMsg), headers: { "Content-Type": "application/json" } });
          await stub.fetch("https://do/append", { method: "POST", body: JSON.stringify({ role: "assistant", content: text }), headers: { "Content-Type": "application/json" } });
          const headers = setSessionCookieHeaders(sid);
          return new Response(JSON.stringify({ model, recipe: text, note: "Stream fallback used." }), { headers });
        } catch (e2: any) {
          const headers = setSessionCookieHeaders(sid);
          return new Response(JSON.stringify({ error: "AI streaming failed", detail: String(err?.message || err) }), { status: 500, headers });
        }
      }
    }

    if (url.pathname === "/api/reset" && request.method === "POST") {
      const sid = await getOrCreateSessionId(request);
      const id = env.SESSION_DO.idFromName(sid);
      const stub = env.SESSION_DO.get(id);
      await stub.fetch("https://do/reset", { method: "POST" });
      return new Response(JSON.stringify({ ok: true }), { headers: setSessionCookieHeaders(sid) });
    }

    // Serve static frontend built by Angular
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Fallback (dev without built assets): inline HTML
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(renderHtml(), { headers: { "Content-Type": "text/html; charset=UTF-8" } });
    }

    return new Response("Not Found", { status: 404 });
  },
};

function renderHtml(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>cf_ai_recipe_generator</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; }
    label { display:block; margin: 0.5rem 0; }
    textarea, input, select { width: 100%; padding: 0.5rem; }
    button { padding: 0.6rem 1rem; }
    button[disabled] { opacity: 0.6; cursor: not-allowed; }
    .chat { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; margin-top:1rem; display: grid; gap: 0.5rem; min-height: 180px; }
    .msg { white-space: pre-wrap; border-radius: 6px; padding: 0.75rem; }
    .assistant { background: #f8fafc; }
    .user { background: #f1f5f9; }
    .error { color: #b91c1c; }
  </style>
</head>
<body>
  <h1>Recipe generator</h1>
  <p>Enter ingredients separated by commas. Optionally add constraints (diet, time, tools).</p>
  <label for="ingredients">Ingredients</label>
  <input id="ingredients" placeholder="eggs, tomatoes, spinach, feta" />
  <label for="extras">Extras (optional)</label>
  <input id="extras" placeholder="vegetarian, 20 minutes, one pan" />
  <label for="model">Model</label>
  <select id="model">
    <option value="@cf/meta/llama-3.3-70b-instruct-fp8-fast" selected>Llama 3.3 70B fast (recommended)</option>
    <option value="@cf/meta/llama-3.1-8b-instruct-fast">Llama 3.1 8B fast</option>
    <option value="gpt-5">GPT-5 (alias to Llama 3.3 70B fast)</option>
  </select>
  <div style="margin-top:0.75rem;">
    <button id="go" type="button">Generate recipe</button>
    <button id="reset" type="button" style="margin-left: 0.5rem;">Reset memory</button>
  </div>

  <div class="chat" id="chat" aria-live="polite" aria-busy="false"></div>

  <script>
    (function(){
      const $ = (s) => document.querySelector(s);
      const chat = $('#chat');
      const goBtn = document.getElementById('go');
      const resetBtn = document.getElementById('reset');
      const ingEl = document.getElementById('ingredients');
      const extrasEl = document.getElementById('extras');
      const modelEl = document.getElementById('model');

      function safePrepend(parent, node){
        if (parent && typeof parent.prepend === 'function') parent.prepend(node);
        else parent.insertBefore(node, parent.firstChild);
      }

      function add(role, text, isError){
        const div = document.createElement('div');
        div.className = 'msg ' + role + (isError ? ' error' : '');
        div.textContent = role.toUpperCase() + ':\\n' + text;
        safePrepend(chat, div);
      }

      async function generate(){
        const ingRaw = (ingEl && 'value' in ingEl) ? ingEl.value : '';
        const extras = (extrasEl && 'value' in extrasEl) ? extrasEl.value : '';
        const model = (modelEl && 'value' in modelEl) ? modelEl.value : '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
        const ing = String(ingRaw).split(',').map(s => s.trim()).filter(Boolean);
        if (!ing.length){ add('assistant', 'Please enter at least one ingredient.', true); return; }

        add('user', 'Ingredients: ' + ing.join(', ') + (extras ? '\\nExtras: ' + extras : ''));

        try {
          goBtn.disabled = true; chat.setAttribute('aria-busy','true'); goBtn.textContent = 'Generating...';
          const res = await fetch('/api/recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: ing, extras, model })
          });
          let data = null;
          try { data = await res.json(); } catch(e){ data = { error: 'Invalid JSON response' }; }
          if (!res.ok) {
            add('assistant', 'Error: ' + (data && (data.error || data.detail) || (res.status + ' ' + res.statusText)), true);
            return;
          }
          if (data && data.recipe) add('assistant', data.recipe);
          else add('assistant', 'No recipe received.', true);
        } catch (e){
          add('assistant', 'Network error: ' + (e && e.message ? e.message : e), true);
        } finally {
          goBtn.disabled = false; chat.setAttribute('aria-busy','false'); goBtn.textContent = 'Generate recipe';
        }
      }

      if (goBtn) goBtn.addEventListener('click', generate);
      // Allow Enter key from inputs to trigger generate
      for (const el of [ingEl, extrasEl]){
        if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') generate(); });
      }
      if (resetBtn) resetBtn.addEventListener('click', async () => {
        try { await fetch('/api/reset', { method: 'POST' }); } catch(_){ }
        add('assistant', 'Memory cleared.');
      });
    })();
  </script>
</body>
</html>`;
}