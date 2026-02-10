# Feature List

This document summarizes the currently implemented user-facing and system features in DCC.

## 1) Workspace + Repository Management
- Persist repository settings (`repoUrl`, `repoPath`) via `/api/settings`.
- Sync team repository via `/api/clone-pull` with clone-or-pull behavior.
- Classify and report git failures (conflict, permission, dirty working tree, missing upstream).

## 2) Definition Discovery and Cataloging
- Load definitions from the configured repo via `/api/load-definitions`.
- Parse YAML, JSON, and Markdown-frontmatter definitions.
- Infer type and metadata and upsert into the `definitions` table.
- Track tags, source type (`repo`, `local-only`, `untracked`), and update timestamps.

## 3) Supported Definition Types
DCC recognizes and renders:
- models
- prompts
- rules
- agents
- workflows
- context
- mcp servers
- docs
- configs
- unknown fallback

## 4) Hub Catalog UX
- Full-card browsing with type icons, status pills, and tag pills.
- Free-text search and tag-aware search.
- Type filtering menu.
- Details panel with preview/source/test tabs.
- Copy raw definition content and edit/create shortcuts.

## 5) Validation and Test Panel
- Run validation per definition from the hub detail page.
- Toggle validation modes: strict schema checks, lint checks, reference checks, auto-run.
- Filter findings by severity.
- Persist validation reports into `validation_results` and expose latest/history endpoints.

## 6) Definition Version History
- Build and cache per-definition git history in `definition_versions`.
- Browse versions from the detail page.
- Search and expand version list.
- Load historical content without overwriting current file.
- Restore a historical version back to current file content.

## 7) Editor Workbench
- Create or edit definitions using type-specific forms.
- Keep form and raw source synchronized with parse/serialize safeguards.
- Detect type server-side (`/api/editor/detect-type`).
- Save from editor (`/api/editor/save`) with metadata persistence.
- Prompt enhancer integration in the editor flow through OpenAI-compatible completions path.

## 8) Save / Remove Definitions in Dev Projects
- Select current dev project.
- Save definition to project via `/api/definitions/:id/save`.
  - Non-context assets are copied into `.continue/.../team/...` paths.
  - Context assets are merged into `project_config.yaml` provider arrays.
- Remove definition via `/api/definitions/:id/remove` with path-aware inverse operations.
- Track per-project saved state in `project_definition_copies`.

## 9) Definition Lifecycle Actions
- Duplicate (`/api/definitions/:id/duplicate`) with path/name conflict safety.
- Push upstream (`/api/definitions/:id/push-upstream`) for local/untracked artifacts.
- Publish to repo (`/api/definitions/:id/publish`) with git add/commit/push.
- Delete from repo (`/api/definitions/:id/delete-repo`) or remove local entry (`/api/definitions/:id/remove`).

## 10) Dev Project Discovery
- Manage root directories in settings.
- Recursively discover nested git projects.
- Materialize discovered projects in `dev_projects`.
- Use the selected project to drive save/remove actions.

## 11) OpenAI-Compatible `/v1` Facade (Gemini-backed)
- `GET /v1/models`
- `POST /v1/completions` (JSON + SSE)
- `POST /v1/chat/completions` (JSON + SSE + tool-call mapping)
- `POST /v1/embeddings`

The facade validates payloads with Zod and normalizes Gemini responses into OpenAI-compatible envelopes.

## 12) UI Theming
- Dark/light mode toggle on Settings page.
- Theme preference is persisted in local storage and applied globally.
