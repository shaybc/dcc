# Feature List

This document reflects the currently implemented capabilities in DCC.

## 1) Local-first application runtime
- Express server that serves the browser client and docs locally.
- SQLite database initialized on startup for settings, catalog, validations, and activity state.
- Local git/file operations against configured asset repositories and development projects.

## 2) App metadata, updates, and onboarding
- App metadata endpoint: `GET /api/app/about`.
- App self-update trigger endpoint: `POST /api/app/update`.
- Onboarding completion state APIs:
  - `GET /api/onboarding-status`
  - `POST /api/onboarding-status`

## 3) Settings and environment management
- General settings read/write: `GET/POST /api/settings`.
- Current development project selection:
  - `GET /api/current-dev-project`
  - `POST /api/current-dev-project`
- Context window estimation for selected project:
  - `GET /api/current-dev-project/context-window`
- Settings backup/export and import:
  - `POST /api/settings/export`
  - `POST /api/settings/import`
- Database backup/restore:
  - `POST /api/database/backup`
  - `POST /api/database/restore`

## 4) Asset repository management and sync
- CRUD for AI asset repositories:
  - `GET /api/asset-repos`
  - `POST /api/asset-repos`
  - `PUT /api/asset-repos/:id`
  - `DELETE /api/asset-repos/:id`
- Repository sync (clone missing / pull existing): `POST /api/asset-repos/sync`.
- Definition loading/indexing from configured repositories: `POST /api/load-definitions`.

## 5) Definition catalog, search, and recommendations
- Retrieve catalog tags: `GET /api/definition-tags`.
- Resolve DCC URI references: `GET /api/definitions/references`.
- Query definitions list: `GET /api/definitions`.
- Retrieve single definition details: `GET /api/definitions/:id`.
- AI-assisted/project-aware recommendation endpoint: `GET /api/definitions/suggestions`.

## 6) Supported definition types
Detected and handled definition types include:
- `model`
- `prompt`
- `rule`
- `agent`
- `workflow`
- `context`
- `mcp server`
- `doc`
- `config`
- `unknown` (fallback)

## 7) Development project discovery
- Manage dev project scan roots:
  - `GET /api/dev-project-roots`
  - `POST /api/dev-project-roots`
- List detected projects: `GET /api/dev-projects`.
- Technology/signal-based project scanning for recommendation and install workflows.

## 8) Definition lifecycle and project install flows
- Duplicate definitions: `POST /api/definitions/:id/duplicate`.
- Push definition changes upstream: `POST /api/definitions/:id/push-upstream`.
- Install definition into selected dev project: `POST /api/definitions/:id/save`.
- Remove installed definition from selected project: `POST /api/definitions/:id/remove`.
- Update persisted tags for a definition: `POST /api/definitions/:id/tags`.
- Publish tracked definitions with versioning: `POST /api/definitions/:id/publish`.
- Delete definition files from repository: `POST /api/definitions/:id/delete-repo`.

## 9) Validation and test history
- Run validation: `POST /api/definitions/:id/validate`.
- Read latest validation result: `GET /api/definitions/:id/validate/latest`.
- Read validation history: `GET /api/definitions/:id/validate/history`.

## 10) Version history and restore
- List version history: `GET /api/definitions/:id/versions`.
- Fetch a specific historical version: `GET /api/definitions/:id/versions/:version`.
- Restore a historical version: `POST /api/definitions/:id/versions/:version/restore`.

## 11) Editor workbench APIs
- Load definition file for editor: `GET /api/editor/definition`.
- Detect definition type from content/path: `POST /api/editor/detect-type`.
- Save created/edited definitions: `POST /api/editor/save`.

## 12) Agent run packs and execution activity
- Manage reusable agent run packs:
  - `GET /api/agent-run-packs`
  - `POST /api/agent-run-packs`
- Start and inspect agent runs:
  - `POST /api/agent-runs`
  - `POST /api/agent-runs/debug`
  - `GET /api/agent-runs`
  - `GET /api/agent-runs/:runId`
  - `GET /api/agent-runs/:runId/logs`
  - `GET /api/agent-runs/:runId/stream`
  - `POST /api/agent-runs/:runId/kill`

## 13) OpenAI-compatible AI API facade (Gemini-backed)
- `GET /v1/models`
- `POST /v1/completions` (JSON + SSE)
- `POST /v1/chat/completions` (JSON + SSE, with tool-call mapping)
- `POST /v1/embeddings`

## 14) Browser UI capabilities
- Hub for searching/filtering definitions and viewing recommendation results.
- Definition details experience with preview/source/test/version actions.
- Create/edit/duplicate workflows with type-aware editor and raw mode.
- Project-aware install/remove/export actions (including Continue/Copilot/Gemini flows).
- Settings area for repositories, dev project roots, AI API service, theme, onboarding, and backup/restore.
- Activity/agent-runs surfaces for execution monitoring.
