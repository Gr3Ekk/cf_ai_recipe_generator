// Minimal ambient type shims to compile without @cloudflare/workers-types.
// Remove this file and add "types": ["@cloudflare/workers-types"] in tsconfig for full typing.

interface Ai {
  run(model: string, options: any): Promise<any>;
}

type DurableObjectNamespace = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
};

type DurableObjectId = any;

type DurableObjectStub = {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
};

type Fetcher = {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
};

type DurableObjectState = {
  storage: DurableObjectStorage;
};

type DurableObjectStorage = {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
};

type ExecutionContext = {
  waitUntil(p: Promise<any>): void;
  passThroughOnException(): void;
};
