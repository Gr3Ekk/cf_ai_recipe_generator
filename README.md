# The Cookbook - AI Recipe Generator

🚀 **Live Demo**: https://cf_ai_recipe_generator.pensonluis57.workers.dev

A futuristic AI-powered recipe generator that transforms your ingredients into complete recipes with multiple difficulty levels. Built with Angular and powered by Cloudflare's cutting-edge infrastructure.

## ✨ Features

- **Multiple Recipe Difficulty Levels**: Get 3 different recipes (Quick & Easy, Balanced Effort, Gourmet Quality) for any ingredient combination
- **Dietary Options**: Specialized buttons for Vegan, Keto, High-Protein, Low-Carb, and Gluten-Free recipes
- **Futuristic Design**: Modern UI with smooth animations, dark/light mode, and professional typography
- **Fast Generation**: Optimized typing animations and responsive interface
- **Smart Navigation**: Browse between recipe variations with instant switching

## 🛠 Technology Stack

**Frontend**: Angular 18 with standalone components, TypeScript, responsive CSS Grid
**Backend**: Cloudflare Worker + Durable Objects for session management
**AI Model**: Llama 3.3 70B Fast via Cloudflare Workers AI
**Deployment**: Cloudflare Workers with automatic scaling

## 🏗 Architecture

- **LLM**: Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast)
- **Workflow/Coordination**: Cloudflare Worker + Durable Object for stateful per-session memory
- **Frontend**: Angular SPA with SSR, served by the Worker
- **State Management**: Durable Object stores chat history per session cookie
- **Fonts**: Google Fonts (Orbitron, Exo 2, Rajdhani) for futuristic branding

## 📋 Requirements

- Node.js 18+
- Wrangler CLI: `npm i -g wrangler`
- A Cloudflare account with Workers + Durable Objects + Workers AI enabled

## 🚀 Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd cf_ai_recipe_generator
   npm install
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm ci
   cd ..
   ```

3. **Log in to Cloudflare**
   ```bash
   wrangler login
   ```

4. **Start development server**
   ```bash
   npm run dev -- --remote
   ```
   Open http://localhost:8787

   *Note: Use `--remote` flag so AI + Durable Object bindings work properly*

## 🌐 Deployment

1. **Enable Workers AI in your Cloudflare account**
   - Go to Dashboard > AI > Workers AI > Enable

2. **Build the Angular frontend**
   ```bash
   cd frontend
   npx ng build --configuration production
   cd ..
   ```

3. **(Optional) Set account_id in wrangler.toml** if wrangler didn't auto-inject it

4. **Deploy to Cloudflare**
   ```bash
   npx wrangler deploy
   ```
   
   *On free plan: Durable Objects require a migration with SQLite-backed classes. This repo includes the migration configuration - wrangler runs it automatically on first deploy.*

5. **Access your deployed app** at the workers.dev URL (printed after deploy)

## 🔧 API Reference

### Generate Recipe
```http
POST /api/recipe
Content-Type: application/json

{
  "ingredients": ["eggs", "tomatoes", "spinach"],
  "extras": "vegetarian, 20 minutes",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
}
```

**Response:**
```json
{
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "recipe": "**Mediterranean Veggie Scramble**\n\nIngredients:\n- 3 eggs..."
}
```

### Reset Session
```http
POST /api/reset
```
Clears chat history for the current session.

## 🎨 Design Features

- **Futuristic Logo**: Custom typography with gradient effects and subtle glow
- **Smart Typography**: Futuristic fonts (Orbitron, Exo 2) for branding, Times New Roman for recipe content
- **Responsive Grid**: 2-column layout on desktop, single column on mobile
- **Dark Mode**: System preference detection with manual override
- **Smooth Animations**: Fast typing effects, hover transitions, loading spinners

## 🔍 Implementation Highlights

- **Durable Object**: SessionDO maintains last 20 messages per session cookie
- **Model Fallback**: Automatic fallback to backup model if primary fails
- **Error Handling**: Robust client-side error management with user feedback
- **Performance**: Optimized bundle size, lazy loading, efficient change detection

## 🛡 Cloudflare-Specific Optimizations

- Proper `[ai]` binding configuration in wrangler.toml
- Correct Workers AI model IDs from official documentation  
- Durable Object migration using `new_sqlite_classes` for free plan compatibility
- Remote development setup for full feature access

## 📁 Project Structure

```
cf_ai_recipe_generator/
├── src/worker.ts              # Main Cloudflare Worker
├── frontend/                  # Angular application
│   ├── src/app/              # Angular components
│   └── dist/                 # Built frontend assets
├── wrangler.toml             # Cloudflare configuration
└── README.md                 # This file
```

## 🔗 Repository Requirements

- ✅ Name prefixed with `cf_ai_`  
- ✅ Comprehensive README.md with setup instructions
- ✅ PROMPTS.md documenting AI prompts used
- ✅ MIT License

## 📄 License

MIT License - Feel free to use this project as a foundation for your own AI-powered applications!
