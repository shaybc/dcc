# Copilot instructions for Developer Control Center (DCC)

This file contains focused, actionable guidance for AI coding agents working on this repository.

Overview
- **Entry point**: `src/server.js` — Express server that mounts API routers and serves the UI.
- **Routes**: `src/routes/*` — main APIs: `openai.js`, `aiCalls.js`, `pr.js`, `workflows.js`, `configs.js`, `runs.js`.
- **Services**: `src/services/*` — encapsulate integrations (Bitbucket, git, AI clients, run history).
- **DB**: `src/db/*.js` — SQLite persisted under the developer home directory at `~/.dcc/history.db`.

Key patterns & conventions
- Configuration is environment-driven (see `src/utils/env.js`). Expect feature toggles like `AI_LOG_ENABLED`, `DCC_AUTH_TOKEN`, and credentials `GEMINI_API_KEY`, `BITBUCKET_*`.
- AI calls are implemented as an OpenAI-compatible shim at `src/routes/openai.js` (POST `/v1/chat/completions`) delegating to `src/services/ai/geminiAIStudioClient.js`.
- AI logging/audit is centralized in `src/services/ai/aiLogService.js` and stored in table `ai_calls`; logging is conditional on `AI_LOG_ENABLED`.
- Database migrations run automatically at startup via `src/db/migrate.js` (called from `src/server.js`). Prefer idempotent updates.
- Git operations assume the server runs on a developer machine and operate on local repo paths (`src/services/gitService.js` uses `simple-git`).
- Bitbucket PR creation uses Basic Auth and `BITBUCKET_BASE_URL`; parsing of remote URLs is in `src/services/bitbucketService.js`.

How to run locally (developer workflow)
- Node 18+ required (ESM + native fetch). Follow `README.md` setup:

```bash
copy .env.example .env
npm install
npm run db:migrate   # idempotent; migrations also run on server start
npm start
```

- UI: `http://localhost:7331` — static files are served from `src/ui`.
- API root: `http://localhost:7331/api` and OpenAI shim under `/v1`.

Notable implementation details (examples to reference)
- OpenAI-compatible streaming and non-streaming responses are implemented in `src/routes/openai.js` (look for `parsed.stream` handling and `writeSse`).
- Gemini client: `src/services/ai/geminiAIStudioClient.js` — small, explicit wrapper that requires `GEMINI_API_KEY` and posts to Google Generative Language API.
- PR workflow: `src/routes/pr.js` + `src/services/bitbucketService.js` + `src/services/gitService.js` — ensure branches are pushed, parse remote to obtain `projectKey` and `repoSlug`, then call the Bitbucket REST API.
- AI call heuristics: `extractContextRefs` in `src/routes/openai.js` attempts to infer file/path context from prompt text; keep changes compatible with that output shape.

What to avoid / what the agent should know
- Do not assume a central cloud DB — run history is local SQLite stored under the developer's home dir.
- Avoid adding long-running background jobs that assume cloud services; the app is designed as a local developer utility.
- Respect `DCC_AUTH_TOKEN` and `authMiddleware` in `src/utils/authMiddleware.js` for API access.

Suggested tasks for AI agents (starter list)
- Add a new API route: follow pattern in `src/routes/*.js`, add minimal service logic in `src/services/*`, and update any migrations if persistent data is needed.
- When touching AI-related code, update `ai_calls` logging where appropriate and follow the shape stored by `aiLogService.js`.
- For changes that affect environment variables, update `README.md` and ensure `src/utils/env.js` reads the new variables.

If anything above is unclear or a section is missing examples you need, tell me which part to expand and I'll update this file.
