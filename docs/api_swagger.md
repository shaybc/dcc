# DCC Hub API Swagger (Endpoint Catalog)

This document describes the API surface exposed by the DCC Hub server in a Swagger-style format.

- Product API base path: `/api`
- OpenAI-compatible API base path: `/v1`
- Default server: `http://localhost:3000`
- Content type: `application/json` unless otherwise noted

---

## Minimal OpenAPI 3.0 Skeleton

```yaml
openapi: 3.0.3
info:
  title: DCC Hub API
  version: 0.1.0
servers:
  - url: http://localhost:3000
paths: {}
```

> The detailed operation list below can be translated directly into `paths` entries.

---

## `/api` Endpoints

### Editor

#### `GET /api/editor/definition`
- **Purpose:** Load one definition file from the configured repository path.
- **Query params:**
  - `path` (string, required): definition relative path.
- **200:** loaded definition payload.
- **400:** missing `repoPath` setting or missing `path` query.
- **500:** server error.

#### `POST /api/editor/detect-type`
- **Purpose:** Detect definition type from raw content/path.
- **Body:**
  - `content` (string)
  - `path` (string)
- **200:** `{ "type": "..." }`
- **400:** invalid payload/parse issue.

#### `POST /api/editor/save`
- **Purpose:** Save/create a definition from editor flow.
- **Body:**
  - `mode` (string)
  - `path` (string)
  - `content` (string)
  - `format` (string, default `yaml`)
  - `filename` (string, optional)
  - `targetPath` (string, optional)
- **200:** `{ ok: true, ...result }`
- **400:** repo not configured.
- **500:** save/validation errors.

### Settings & Project Context

#### `GET /api/settings`
- **Purpose:** Get persisted repository settings.
- **200:** `{ repoUrl: string, repoPath: string }`

#### `POST /api/settings`
- **Purpose:** Update repository settings.
- **Body:** `{ repoUrl?: string, repoPath?: string }`
- **200:** `{ ok: true }`

#### `GET /api/current-dev-project`
- **Purpose:** Get currently selected development project path.
- **200:** `{ path: string }`

#### `POST /api/current-dev-project`
- **Purpose:** Set currently selected development project path.
- **Body:** `{ path: string }`
- **200:** `{ ok: true, path: string }`

### Dev Project Discovery

#### `GET /api/dev-project-roots`
- **Purpose:** List configured roots used for dev-project scanning.
- **200:** array of `{ id, path }`.

#### `POST /api/dev-project-roots`
- **Purpose:** Replace roots and refresh discovered projects.
- **Body:** `{ roots: string[] }`
- **200:** `{ ok: true, projects: string[] }`

#### `GET /api/dev-projects`
- **Purpose:** List discovered dev projects.
- **200:** array of `{ id, path }`.

### Repository Sync

#### `POST /api/clone-pull`
- **Purpose:** Clone repository if missing, otherwise pull latest.
- **Body:** none.
- **200:** `{ ok: true }`
- **400:** missing `repoUrl` or `repoPath`.

#### `POST /api/load-definitions`
- **Purpose:** Reload definitions from source files into DB index.
- **Body:** none.
- **200:** `{ ok: true, result: ... }`

### Definition Listing & Metadata

#### `GET /api/definition-tags`
- **Purpose:** Return unique sorted tag strings from indexed definitions.
- **200:** `string[]`

#### `GET /api/definitions/references`
- **Purpose:** Return reference-friendly list of definitions with extracted `dcc_uri`.
- **200:** array of `{ type, name, dcc_uri }`.

#### `GET /api/definitions`
- **Purpose:** List definitions. If a current dev project is selected, status is decorated as `saved`/`repo`.
- **200:** definition summary array.

#### `GET /api/definitions/:id`
- **Purpose:** Get full definition by numeric id (including content, createdAt when available).
- **200:** definition object.
- **404:** not found.

### Definition Lifecycle

#### `POST /api/definitions/:id/duplicate`
- **Purpose:** Duplicate definition file with a new display name/file name.
- **Body:**
  - `name` (string, required)
  - `fileName` (string, required)
- **200:** `{ ok: true, id, message }`
- **400/404/409:** validation/not found/conflict cases.

#### `POST /api/definitions/:id/push-upstream`
- **Purpose:** Add/commit/push an untracked definition file into the configured repo.
- **Body:** `{ commitMessage?: string }`
- **200:** `{ ok: true, message }`
- **400/404/500:** validation/not found/git errors.

#### `POST /api/definitions/:id/save`
- **Purpose:** Install/copy definition into current dev project and mark as saved.
- **Body:** none.
- **200:** `{ ok: true }`
- **400/404/500:** project selection, type support, filesystem errors.

#### `POST /api/definitions/:id/publish`
- **Purpose:** Copy a local definition into repo type folder, commit, and push.
- **Body:** none.
- **200:** `{ ok: true }`
- **400/404/500:** settings/not found/git errors.

#### `POST /api/definitions/:id/delete-repo`
- **Purpose:** Delete definition from local untracked file set or from cloned repo with git commit+push.
- **Body:** none.
- **200:** `{ ok: true, message }`
- **403/404/409/500:** permission, not found, merge conflict, general errors.

#### `POST /api/definitions/:id/remove`
- **Purpose:** Remove previously saved definition artifacts from current dev project and mark as repo state.
- **Body:** none.
- **200:** `{ ok: true }`

### Validation

#### `POST /api/definitions/:id/validate`
- **Purpose:** Run definition validation and persist validation result history.
- **Body:** `{ options?: object }`
- **200:** validation report object.

#### `GET /api/definitions/:id/validate/latest`
- **Purpose:** Get most recent persisted validation result.
- **200:** `{ found: boolean, result, createdAt? }`

#### `GET /api/definitions/:id/validate/history`
- **Purpose:** Get recent validation history.
- **Query params:**
  - `limit` (number, optional, default 20, max 100)
- **200:** `{ history: [{ id, status, durationMs, createdAt, result }] }`

### Version History

#### `GET /api/definitions/:id/versions`
- **Purpose:** Get git/version history metadata for one definition.
- **200:** `{ versions: [...], currentVersion: string }`

#### `GET /api/definitions/:id/versions/:version`
- **Purpose:** Get content and metadata for a specific version label.
- **200:** `{ version, content, metadata, commitInfo }`
- **404:** version/definition not found.

#### `POST /api/definitions/:id/versions/:version/restore`
- **Purpose:** Restore file content from historical version and optionally bump patch version.
- **Body:** `{ createNewVersion?: boolean }` (default `true`)
- **200:** `{ success: true, newVersion, message }`

---

## `/v1` OpenAI-Compatible Endpoints

> Mounted with `app.use("/v1", openaiRouter)` and intended for OpenAI-compatible clients.

#### `GET /v1/models`
- **Purpose:** List Gemini-backed models in OpenAI list format.
- **200:** `{ object: "list", data: [{ id, object, created, owned_by }] }`

#### `POST /v1/completions`
- **Purpose:** Text completions compatible with OpenAI completions API.
- **Body (core fields):**
  - `model?: string`
  - `prompt: string`
  - `stream?: boolean`
  - `temperature?: number (0..2)`
  - `max_tokens?: number`
  - `stop?: string | string[]`
- **200 non-stream:** OpenAI-style completion JSON.
- **200 stream:** `text/event-stream` with SSE chunks and `[DONE]`.
- **400:** schema/validation or runtime error.

#### `POST /v1/chat/completions`
- **Purpose:** Chat completions with optional streaming and tool-call mapping.
- **Body (core fields):**
  - `model?: string`
  - `messages: [{ role, content }]` (must include at least one message)
  - `stream?: boolean`
  - `temperature?: number`
  - `max_tokens?: number`
  - `tools?: any[]`
  - `tool_choice?: any`
- **200 non-stream:** OpenAI-style chat completion JSON.
- **200 stream:** `text/event-stream` chat chunks and `[DONE]`.
- **400:** schema/validation or runtime error.

#### `POST /v1/embeddings`
- **Purpose:** Embedding generation in OpenAI embeddings response shape.
- **Body:**
  - `model?: string`
  - `input: string | string[]`
- **200:** `{ object: "list", data: [{ object: "embedding", index, embedding: number[] }], usage }`
- **400:** schema/runtime error.

---

## Common Error Shape

Most `/api` errors use:

```json
{ "error": "message" }
```

Most `/v1` errors use OpenAI-like shape:

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

