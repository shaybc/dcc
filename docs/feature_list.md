# Feature List

This document reflects the currently implemented capabilities in DCC.

## 1) Local-first web app
- Express server serving a static browser client from `src/client`.
- SQLite persistence initialized automatically on server startup.
- All data and git operations are local to the developer machine.

## 2) Repository settings and sync
- Save/load repository settings (`repoUrl`, `repoPath`) via `/api/settings`.
- Clone or pull the configured team repository via `/api/clone-pull`.
- Load and index definitions from the repository via `/api/load-definitions`.

## 3) Definition catalog and metadata
- Persist definitions in SQLite with key metadata (`type`, `name`, `tags`, `filePath`, `version`, `source`, `status`).
- Retrieve catalog list via `/api/definitions`.
- Get normalized tag list via `/api/definition-tags`.
- Resolve DCC URI references via `/api/definitions/references`.
- Fetch individual definition details (including best-effort live file content) via `/api/definitions/:id`.

## 4) Supported definition types
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
- `unknown` fallback

## 5) Recommendation engine
- Project-aware recommendation endpoint: `/api/definitions/suggestions`.
- Uses current selected dev project + detected project type metadata.
- Produces deterministic ranked suggestions with transparent `score` and `reasons`.

## 6) Dev project discovery
- Configure scan roots using `/api/dev-project-roots`.
- Recursively discover nested git projects and detect project type signals.
- Store project metadata (`projectType`, `detectedSignals`, `lastScannedAt`).
- List discovered projects via `/api/dev-projects`.

## 7) Save/remove definitions to local projects
- Save a definition to selected dev project: `/api/definitions/:id/save`.
- Remove an installed definition: `/api/definitions/:id/remove`.
- Track installed copies in `project_definition_copies`.
- Context definitions merge provider entries into config files instead of simple copy.

## 8) Definition lifecycle actions
- Duplicate definitions with new name/file/path/dcc URI: `/api/definitions/:id/duplicate`.
- Push local/untracked definitions upstream: `/api/definitions/:id/push-upstream`.
- Publish tracked definitions with version bump support: `/api/definitions/:id/publish`.
- Delete definition files from repo and refresh catalog: `/api/definitions/:id/delete-repo`.

## 9) Validation
- Run validation checks with configurable options: `/api/definitions/:id/validate`.
- Read latest validation result: `/api/definitions/:id/validate/latest`.
- Read validation history with limit control: `/api/definitions/:id/validate/history`.
- Validation records are persisted in `validation_results`.

## 10) Version history
- Load cached git-backed version history: `/api/definitions/:id/versions`.
- Fetch specific historical version content: `/api/definitions/:id/versions/:version`.
- Restore a historical version into current file content: `/api/definitions/:id/versions/:version/restore`.

## 11) Editor workbench API
- Load a specific definition for editing: `/api/editor/definition?path=...`.
- Detect type from content/path: `/api/editor/detect-type`.
- Save create/edit operations with DCC URI uniqueness enforcement: `/api/editor/save`.

## 12) OpenAI-compatible facade (Gemini backend)
- `GET /v1/models`
- `POST /v1/completions` (JSON + SSE streaming)
- `POST /v1/chat/completions` (JSON + SSE streaming with tool call mapping)
- `POST /v1/embeddings`

## 13) UI capabilities
- Hub for browsing/searching/filtering definitions.
- Definition detail panel with content/test/version actions.
- Separate settings view for repo/project/theme controls.
- Dedicated editor UI with structured forms + raw content sync.
- Dark/light theme preference persisted in browser storage.
