# DCC System Architecture

## Overview

DCC (Developer Control Center) is a local-first monolith composed of:
1. A static browser client (`src/client`) served by Express.
2. A Node.js + Express API server (`src/server`).
3. A SQLite data store (`data/dcc.sqlite` by default).
4. Local filesystem + git integration for definition files and dev projects.
5. Optional AI integrations for OpenAI-compatible chat endpoints and managed agent runs.

## Runtime topology

```mermaid
flowchart LR
  Browser[Browser UI\nHub + Editor + Settings + Help]
  Server[Express Server\nREST + /v1 facade + agent runs]
  DB[(SQLite)]
  Repos[(Asset Repos / Git)]
  Projects[(Local Dev Projects)]
  AI[(Gemini + Connector providers)]

  Browser --> Server
  Server --> DB
  Server --> Repos
  Server --> Projects
  Server --> AI
```

## Frontend composition

`src/server/server.js` wires middleware, static assets, and route modules.

- `routes/settings.js` — repository and active dev project settings.
- `routes/projects.js` — dev root management + project scanning metadata.
- `routes/repo.js` — clone/pull and load-definition sync.
- `routes/definitions.js` — catalog, tags, references, suggestions, and export APIs.
- `routes/lifecycle.js` — duplicate/save/remove/publish/delete/push-upstream operations.
- `routes/validation.js` — validation execution and history retrieval.
- `routes/versions.js` — git version history listing/fetch/restore.
- `routes/editor.js` — editor load/detect/save endpoints.
- `routes/openai.js` — OpenAI-compatible `/v1/*` endpoints backed by Gemini connectors.
- `routes/agentRuns.js` and `routes/agentRunPacks.js` — managed local agent runs and reusable run-pack flows.

## Domain and infrastructure layers

- `src/server/definitions/*` — type detection, parse/serialize, metadata extraction, install/save, validation, recommendations, and export services.
- `src/server/projects/scan/*` — project discovery, technology detection, AI signal enrichment, and repository signal extraction.
- `src/server/services/agentRunManager/*` — lifecycle management for local agent subprocesses.
- `src/server/services/ai/*` — Gemini connector and AI Studio clients.
- `src/server/versions/*` — git history helpers plus version cache.
- `src/server/db/*` — sqlite initialization and promise-based query helpers.
- `src/server/utils/*` — shared utilities (git/files/settings/env/logging/AI settings).

## Persistence model

SQLite schema is initialized/migrated in `src/server/db/index.js`.

### Main tables

- `settings`
- `asset_repos`
- `definitions`
- `definition_versions`
- `dev_project_roots`
- `dev_projects`
- `project_definition_copies`
- `project_definition_destinations`
- `validation_results`
- `agent_run_packs`
- `agent_runs`
- `agent_run_logs`

The `definitions` table remains the central catalog, while supporting tables track:
- version snapshots and commit metadata,
- install destinations per project,
- validation reports over time,
- project scan metadata for recommendation ranking,
- agent run execution and logs.

## Key flows

### Definition lifecycle flow

```mermaid
sequenceDiagram
  participant UI as Browser UI
  participant API as Express API
  participant FS as Filesystem/Git
  participant DB as SQLite

  UI->>API: save/publish/remove/install/export action
  API->>FS: write files and execute git operations
  API->>DB: refresh/update indexed metadata
  API-->>UI: normalized response payload
```

### Recommendation flow

1. User selects current dev project.
2. Scanner persists project signals/type/technologies.
3. Suggestions endpoint scores definitions against project context + tags/keywords.
4. UI receives ranked results and explanation metadata.

### Agent run flow

1. User chooses installed agent + config in a project.
2. API validates payload and resolves file paths.
3. AgentRunManager launches process and writes status/log rows.
4. UI polls or subscribes to stream endpoint for live updates/log output.
5. Optional kill endpoint requests cancellation.

## AI and agent-run flows

- `/v1/*` endpoints validate payloads, invoke Gemini clients, and return OpenAI-shaped responses (including SSE streaming).
- Agent run endpoints orchestrate local subprocess execution through `agentRunManager`, with normalized run options and tracked run state.

## Frontend composition

Primary client entry points:
- `src/client/app.js` — Hub bootstrap.
- `src/client/settings.js` — Settings and project-root management.
- `src/client/editor/editor.js` — Definition authoring/editor workbench.

Supporting frontend layers:
- `src/client/api/*` — API wrappers.
- `src/client/ui/appController/*` — hub orchestration.
- `src/client/editor/forms/*` and `src/client/editor/components/*` — type-specific UI + source sync.
- `src/client/state/*` and `src/client/services/*` — shared app state and reusable UI services.

## Operational characteristics

- **Single-process deployment:** one Node server hosts both static client and API.
- **Local-first source of truth:** filesystem/git + SQLite, no required external DB/service.
- **Progressive AI integration:** app remains usable without Gemini configuration.
- **Deterministic recommendation + validation:** explainable scoring and persisted reports.
- **Observability hooks:** configurable AI traffic logging and file logger settings loaded at startup.
