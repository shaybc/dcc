# Feature List

This document enumerates the main features implemented in DCC and explains how each one works.

## 1) Repository Configuration and Sync

### What it does
Lets users configure a remote repository URL and local clone path, then synchronize that repository.

### Why it matters
Centralizes team definitions in a version-controlled source of truth.

### How it works
- Save `repoUrl` + `repoPath` in `settings` table.
- `POST /api/clone-pull` runs:
  - `git clone <url> <path>` if path does not exist,
  - otherwise `git pull` in existing path.

---

## 2) Definition Discovery and Indexing

### What it does
Scans definition files and indexes metadata into SQLite.

### Why it matters
Provides a searchable local catalog rather than requiring manual file navigation.

### How it works
- `POST /api/load-definitions` triggers repository scanning.
- Each file is parsed (YAML or Markdown frontmatter).
- Type and metadata are normalized and inserted into `definitions`.

---

## 3) Multi-Type Definition Support

### Supported definition families
1. Prompt
2. Model
3. MCP Server
4. Rule
5. Agent
6. Workflow
7. Context
8. Unknown (fallback categorization for UI)

### Why it matters
Supports heterogeneous AI workflows from one control center.

---

## 4) Definition Browser (Hub)

### What it does
Displays definition cards with metadata and actions.

### Included capabilities
- free-text search,
- type-based filtering,
- tag pills and tag click-to-filter behavior,
- detail view with metadata and source/preview tabs,
- status rendering (`saved`, `repo`, `local-only`, with untracked hints).

---

## 5) Definition Editor

### What it does
Provides a typed form editor plus raw source editor for create/edit operations.

### Included capabilities
- Create mode and edit mode.
- Auto type detection endpoint (`/api/editor/detect-type`).
- Form-to-text and text-to-form synchronization.
- YAML and Markdown/frontmatter serialization.

### Why it matters
Lowers editing friction while preserving direct access to source text.

---

## 6) Save Definitions into Active Dev Project

### What it does
Copies selected definitions into the currently selected local dev project.

### How it works
- `POST /api/definitions/:id/save`:
  - For non-context types, copy files into `.continue/<mapped>/team/<type>/`.
  - For context type, merge provider entries into `agents/team/project_config.yaml`.
- Save state is tracked in `project_definition_copies` for project-specific status.

---

## 7) Remove Definitions from Active Dev Project

### What it does
Reverts save-to-project operations.

### How it works
- `POST /api/definitions/:id/remove` deletes copied file (or removes context provider entries) and clears mapping row.

---

## 8) Duplicate Definition Files

### What it does
Creates a new definition file derived from an existing one.

### Included behavior
- new name and new file name validation,
- duplicate path conflict checking,
- content rewrite to update top-level `name` field/frontmatter name,
- index refresh and new row lookup.

---

## 9) Push Local/Untracked Definitions Upstream

### What it does
Commits and pushes existing local definition files to configured team repository.

### How it works
- `POST /api/definitions/:id/push-upstream` runs git pull/add/commit/push sequence.
- Commit message can be provided by caller.

---

## 10) Publish Definition to Repository

### What it does
Copies selected definition into repo type folder and pushes it.

### How it works
- `POST /api/definitions/:id/publish`:
  - ensure destination folder,
  - pull latest,
  - copy file,
  - git add/commit/push,
  - update local DB row (`source='repo'`, `status='saved'`).

---

## 11) Delete Definition from Repository or Local Untracked Files

### What it does
Removes definitions from storage source with safety handling.

### Included behavior
- untracked/local file deletion flow,
- repository deletion flow with pull-before-delete,
- push conflict and permission error classification,
- rollback attempts (`reset`, `clean`, `pull --rebase`) on failure paths.

---

## 12) Dev Project Root Management and Discovery

### What it does
Manages root directories and scans for git projects.

### How it works
- Roots are stored in `dev_project_roots`.
- Recursive scan finds directories containing `.git`.
- Results materialized in `dev_projects` and shown in UI.

---

## 13) OpenAI-Compatible API Facade (`/v1`)

### What it does
Exposes OpenAI-like endpoints while using Gemini provider APIs.

### Endpoints
1. `GET /v1/models`
2. `POST /v1/completions`
3. `POST /v1/chat/completions`
4. `POST /v1/embeddings`

### Included behavior
- Zod validation for request payloads,
- optional streaming responses via SSE,
- stop-sequence handling,
- tool-call mapping for chat responses,
- model-name normalization.

---

## 14) Theme Support

### What it does
Provides light/dark theme preference toggling from settings page.

---

## 15) Feature Footprint Summary

| Category | Approximate footprint |
|---|---|
| REST endpoints in core server | 20 `/api/*` routes |
| OpenAI-compatible routes | 4 `/v1/*` routes |
| Definition editing forms | 7 type-specific form modules |
| Persistent tables | 5 SQLite tables |

