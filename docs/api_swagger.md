# API Reference (OpenAPI-style Summary)

This is a concise route map derived from the current Express route modules.

## Base URLs
- Application API: `http://localhost:3000/api`
- OpenAI-compatible facade: `http://localhost:3000/v1`

---

## Settings

### `GET /api/settings`
Returns `{ repoUrl, repoPath }`.

### `POST /api/settings`
Body: `{ repoUrl?: string, repoPath?: string }`.
Returns `{ ok: true }`.

### `GET /api/current-dev-project`
Returns `{ path }`.

### `POST /api/current-dev-project`
Body: `{ path: string }`.
Returns `{ ok: true, path }`.

---

## Repository sync

### `POST /api/clone-pull`
Clones repo when `repoPath` does not exist; otherwise runs git pull.

### `POST /api/load-definitions`
Loads/refreshes definitions into local DB index.

---

## Definitions catalog

### `GET /api/definition-tags`
Returns unique sorted tags array.

### `GET /api/definitions/references`
Returns extracted DCC URI references from indexed definitions.

### `GET /api/definitions`
Returns list of definitions. Includes per-project status when `currentDevProject` is set.

### `GET /api/definitions/suggestions`
Returns project-aware ranked suggestions:
```json
{
  "projectPath": "...",
  "projectType": "python",
  "suggestions": [
    {
      "definitionId": 1,
      "score": 28,
      "reasons": ["..."]
    }
  ]
}
```

### `GET /api/definitions/:id`
Returns full definition row + resolved content + file creation timestamp.

---

## Definition lifecycle

### `POST /api/definitions/:id/duplicate`
Duplicates definition with requested metadata/path overrides.

### `POST /api/definitions/:id/push-upstream`
Commits/pushes local or untracked definitions to team repo.

### `POST /api/definitions/:id/save`
Saves definition into current dev project.

### `POST /api/definitions/:id/publish`
Publishes definition changes to repo (with versioning flow).

### `POST /api/definitions/:id/delete-repo`
Deletes definition file in repo and refreshes catalog.

### `POST /api/definitions/:id/remove`
Removes definition from local project and copy tracking.

---

## Validation

### `POST /api/definitions/:id/validate`
Runs validation with optional rules config.

### `GET /api/definitions/:id/validate/latest`
Returns latest validation result for definition key.

### `GET /api/definitions/:id/validate/history?limit=20`
Returns recent validation runs (limit 1..100).

---

## Version history

### `GET /api/definitions/:id/versions`
Returns cached version list for a definition.

### `GET /api/definitions/:id/versions/:version`
Returns content and metadata for a specific historical version.

### `POST /api/definitions/:id/versions/:version/restore`
Restores selected version into current repo file and reloads definitions.

---

## Editor

### `GET /api/editor/definition?path=<relativePath>`
Loads definition data/content for editor.

### `POST /api/editor/detect-type`
Body: `{ content, path }`.
Returns `{ type }`.

### `POST /api/editor/save`
Body includes `mode`, `path`, `content`, `format`, and optional target metadata.
Enforces DCC URI uniqueness before saving.

---

## Dev projects

### `GET /api/dev-project-roots`
Returns configured root paths.

### `POST /api/dev-project-roots`
Body: `{ roots: string[] }`.
Replaces stored roots and refreshes discovered projects.

### `GET /api/dev-projects`
Returns discovered projects with `projectType`, `detectedSignals`, `lastScannedAt`.

---

## OpenAI-compatible facade (`/v1`)

### `GET /v1/models`
Lists Gemini-backed models in OpenAI model-list shape.

### `POST /v1/completions`
OpenAI-style text completion request/response.
Supports `stream: true` SSE.

### `POST /v1/chat/completions`
OpenAI-style chat completion.
Supports tool call mapping and SSE streaming.

### `POST /v1/embeddings`
OpenAI-style embeddings endpoint backed by Gemini.

---

## Error format

Most API errors return:
```json
{ "error": "message" }
```

`/v1` endpoints generally return OpenAI-style envelopes:
```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```
