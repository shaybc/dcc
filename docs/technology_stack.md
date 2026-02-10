# Technology Stack

## Runtime & language
- **Node.js (ESM)** runtime for server and test execution.
- **JavaScript** across frontend and backend.

## Backend
- **Express 4** for HTTP routing and static asset serving.
- **sqlite3** for local persistence.
- **dotenv** for environment configuration.
- **zod** for request schema validation (notably `/v1` facade).
- **yaml** + **gray-matter** for definition parsing/serialization.

## Frontend
- **Vanilla HTML/CSS/JavaScript** (no heavy SPA framework).
- Modular page scripts for Hub, Settings, and Editor.
- Design-token style organization in CSS (`styles/tokens`, `styles/components`, `styles/themes`).

## AI integration
- Gemini API integration through `GeminiAIStudioClient`.
- OpenAI-compatible API surface at `/v1/models`, `/v1/completions`, `/v1/chat/completions`, `/v1/embeddings`.

## Storage & state
- **SQLite database** at `data/dcc.sqlite` (or `DCC_DB_PATH`).
- **Local filesystem + git** as authoritative source for definition artifacts.
- **Browser localStorage** for theme preference.

## Testing
- **Node test runner** (`node --test`) with fixture-driven tests.

## Operational model
- Single-process local app (`npm start` runs `node src/server/server.js`).
- Server defaults to `PORT=3000` unless overridden.
