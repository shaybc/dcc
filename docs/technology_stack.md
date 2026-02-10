# Technology Stack

## 1) Runtime + Packaging
- **Runtime:** Node.js (ES modules)
- **Package manager:** npm
- **Start command:** `npm start` → `node src/server/server.js`

## 2) Core Dependencies
- `express`: HTTP server, REST endpoints, static hosting
- `sqlite3`: embedded local database
- `gray-matter`: markdown frontmatter parsing
- `yaml`: YAML parse/stringify
- `zod`: request/schema validation
- `dotenv`: environment variable loading

## 3) Frontend Stack
- Vanilla JavaScript, HTML, CSS (no SPA framework)
- Main pages:
  - `src/client/index.html` (Hub)
  - `src/client/settings.html` (Settings)
  - `src/client/editor/editor.html` (Editor)
- Editor is modularized by definition type through dedicated form modules.

## 4) Backend Stack
- Express app in `src/server/server.js`
- OpenAI-compatible router in `src/server/routes/openai.js`
- Gemini provider adapter in `src/server/services/ai/geminiAIStudioClient.js`
- Definition services in `src/server/definitions/*`

## 5) Data + Protocols
- **SQLite** for local state and cached metadata/history
- **Filesystem + git CLI** for repository sync and project materialization
- **JSON over HTTP** for REST APIs
- **SSE** for streaming `/v1/completions` and `/v1/chat/completions`

## 6) Current Repo Snapshot Metrics
- JS files under `src/`: **26**
- `/api/*` endpoints in server: **29**
- `/v1/*` endpoints: **4**
- SQLite tables initialized at boot: **7**
- Editor form modules: **10**

These values were generated from code scans of the current repository state.
