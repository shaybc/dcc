# DCC System Architecture

## Overview

DCC (Definition Catalog & Coordinator) is a **local-first web application** that manages software definitions — structured configuration or code artifacts — across a team catalog and multiple local development projects. It provides a browser-based UI, a local Express backend, and optional AI-assisted inference, all running on the developer's own machine with no cloud dependency beyond an optional Gemini API integration.

The system is composed of three conceptual layers:

- **Browser UI** — Hub, Settings, and Editor interfaces
- **Backend Server** — REST API, validation engine, and an OpenAI-compatible inference facade
- **Local Data Layer** — SQLite database, local filesystem, a team git repository, and the Google Gemini API

---

## 1. High-Level Topology

```mermaid
flowchart TB
  subgraph Browser["🖥️ Browser (Client)"]
    Hub["Hub\nindex.html + app.js"]
    Settings["Settings\nsettings.html + settings.js"]
    Editor["Editor\neditor/editor.html + editor.js"]
  end

  subgraph Backend["⚙️ Backend (Express Server)"]
    API["/api/*\nREST API"]
    V1["/v1/*\nOpenAI-compatible Facade"]
    DefMods["Definition Modules\ndefinitions/*"]
  end

  subgraph Data["💾 Data Layer"]
    DB[("SQLite\nDatabase")]
    TeamRepo[("Team Git Repo\n(remote or local path)")]
    DevProjects[("Local Dev Projects\n(filesystem)")]
    Gemini[("Google Gemini API\n(optional)")]
  end

  Hub -->|REST calls| API
  Settings -->|REST calls| API
  Editor -->|REST calls| API

  API --> DefMods
  API --> DB
  API --> TeamRepo
  API --> DevProjects

  V1 -->|proxied inference| Gemini
```

The Hub is the primary workspace for browsing, installing, and validating definitions. The Settings page configures the git repo source and project roots. The Editor provides a structured form-based interface for authoring or modifying definitions. All three communicate exclusively through the backend REST API.

---

## 2. Data Model & Persistence

The server initializes a SQLite database with **7 core tables** on startup. The schema is designed around definitions as the central entity, with supporting tables for versioning, project placement, and validation history.

```mermaid
erDiagram
  settings {
    string key PK
    string value
  }

  definitions {
    string key PK
    string type
    string content
    string source_path
  }

  definition_versions {
    int id PK
    string definition_key FK
    string git_hash
    string content
    datetime created_at
  }

  dev_project_roots {
    int id PK
    string path
    string label
  }

  dev_projects {
    int id PK
    int root_id FK
    string name
    string path
  }

  project_definition_copies {
    int id PK
    string definition_key FK
    int dev_project_id FK
    string installed_path
    datetime installed_at
  }

  validation_results {
    int id PK
    string definition_key FK
    string status
    string report
    datetime run_at
  }

  definitions ||--o{ definition_versions : "versioned by"
  definitions ||--o{ project_definition_copies : "installed into"
  definitions ||--o{ validation_results : "validated as"
  dev_project_roots ||--o{ dev_projects : "contains"
  dev_projects ||--o{ project_definition_copies : "receives"
```

**Key relationships:**

- `definitions.key` is the canonical identifier used throughout the system.
- `definition_versions` caches git history per definition, keyed to a git commit hash.
- `project_definition_copies` is the mapping table that tracks exactly which definitions are installed into which local project.
- `validation_results` stores each validation run's outcome, enabling both latest-result lookups and historical auditing.

---

## 3. Core Runtime Flows

### 3.1 Repository Sync & Indexing

Definitions are sourced from a shared team git repository. Syncing brings the local cache up to date.

```mermaid
sequenceDiagram
  actor User
  participant Settings as Settings UI
  participant API as Express API
  participant Git as Git (local/remote)
  participant DB as SQLite

  User->>Settings: Enter repo URL or local path
  Settings->>API: POST /api/clone-pull
  API->>Git: Clone or pull latest
  Git-->>API: Working tree updated
  API->>API: POST /api/load-definitions
  API->>Git: Scan repo for definition files
  API->>API: Parse definition files
  API->>DB: Upsert definitions & versions
  DB-->>API: OK
  API-->>Settings: Sync complete
```

### 3.2 Definition Install & Remove

Users can materialize a catalog definition into any active local development project. The install process copies or merges definition files into the project's `.continue` directory structure, and the database mapping table is updated accordingly.

```mermaid
sequenceDiagram
  actor User
  participant Hub as Hub UI
  participant API as Express API
  participant FS as Filesystem
  participant DB as SQLite

  User->>Hub: Select dev project + definition
  Hub->>API: POST /api/definitions/:id/save
  API->>FS: Copy/merge files into .continue/
  API->>DB: Insert into project_definition_copies
  DB-->>API: OK
  API-->>Hub: Installed

  User->>Hub: Remove definition
  Hub->>API: POST /api/definitions/:id/remove
  API->>FS: Delete or unmerge files
  API->>DB: Delete from project_definition_copies
  API-->>Hub: Removed
```

### 3.3 Validation

Definitions can be validated against schema, lint rules, and cross-reference checks. Results are persisted so users can view the latest run or browse historical outcomes.

```mermaid
sequenceDiagram
  actor User
  participant Hub as Hub UI
  participant API as Express API
  participant Engine as Validation Engine
  participant DB as SQLite

  User->>Hub: Trigger validation
  Hub->>API: POST /api/definitions/:id/validate
  API->>Engine: Run schema check
  API->>Engine: Run lint check
  API->>Engine: Run reference check
  Engine-->>API: Aggregated result
  API->>DB: INSERT into validation_results
  DB-->>API: OK
  API-->>Hub: Pass / Fail + report

  User->>Hub: View history
  Hub->>API: GET /api/definitions/:id/validation-history
  API->>DB: SELECT * FROM validation_results
  DB-->>API: Historical results
  API-->>Hub: Render history list
```

### 3.4 Version History

Definition versions are lazily hydrated from git history and cached in SQLite. The cache is invalidated when the current git commit hash for a file has changed since the last cache write.

```mermaid
sequenceDiagram
  actor User
  participant Hub as Hub UI
  participant API as Express API
  participant DB as SQLite
  participant Git as Git

  User->>Hub: Open version history
  Hub->>API: GET /api/definitions/:id/versions
  API->>DB: Lookup cached versions + latest hash
  alt Cache is fresh
    DB-->>API: Return cached versions
  else Cache is stale or missing
    API->>Git: Read full commit history for file
    Git-->>API: Commit log + blobs
    API->>DB: Upsert definition_versions
    DB-->>API: Updated cache
  end
  API-->>Hub: Version list

  User->>Hub: Restore a version
  Hub->>API: POST /api/definitions/:id/restore?hash=abc123
  API->>DB: Fetch content at that hash
  API-->>Hub: Historical content loaded into editor
```

### 3.5 OpenAI-Compatible Inference

The `/v1/*` routes expose an OpenAI-compatible API surface backed by Google Gemini. This allows tools or extensions that expect an OpenAI endpoint to work transparently with local Gemini-powered inference.

```mermaid
flowchart LR
  Client["Client\n(any OpenAI-compatible tool)"]
  Router["/v1/* Router\n(routes/openai.js)"]
  Zod["Zod\nPayload Validator"]
  Adapter["Gemini Adapter"]
  Gemini["Google Gemini API"]
  Normalizer["Response Normalizer\n(OpenAI JSON / SSE)"]

  Client -->|POST /v1/chat/completions| Router
  Router --> Zod
  Zod -->|validated payload| Adapter
  Adapter --> Gemini
  Gemini -->|raw response| Adapter
  Adapter --> Normalizer
  Normalizer -->|normalized response| Client
```

---

## 4. API Surface

### Product API — `/api/*`

Served by `server.js`. Covers all core application functionality.

| Area | Endpoints |
|---|---|
| **Settings** | Read/write app configuration |
| **Repository** | Clone, pull, load definitions from git repo |
| **Projects** | Manage dev project roots and discovered projects |
| **Definitions** | List, read, save, remove, and validate definitions |
| **Validation** | Trigger validation runs; read latest and historical results |
| **Versions** | List versions, fetch content at a given hash, restore |
| **Editor** | Helper endpoints for structured definition authoring |

### Inference API — `/v1/*`

Served by `routes/openai.js`. Provides an OpenAI-compatible interface backed by Gemini.

| Route | Purpose |
|---|---|
| `POST /v1/chat/completions` | Chat completions (streaming and non-streaming) |
| Other `/v1/*` routes | Additional OpenAI-compatible endpoints as implemented |

---

## 5. Architectural Characteristics

### Local-First
All state — the SQLite database, synced definition files, and installed project copies — lives on the local machine. The only network calls are to the team git remote (for sync) and optionally to the Gemini API (for inference). No user data is sent to a cloud service.

### Git-Native
Git is the authoritative source for the definition catalog. Sync, version history extraction, and any publish or push workflows are all implemented directly as git operations, ensuring that definitions are always traceable and recoverable.

### Type-Aware Definition Platform
The validation engine, editor form generation, and file merge logic are all definition-type aware. Each definition type can have its own schema, lint rules, and install behavior, making the platform extensible to new definition kinds without changing the core runtime.

### Project-Aware Deployment
A single catalog definition can be installed into multiple local development projects simultaneously. The `project_definition_copies` table tracks the installed state of every definition in every project, enabling the Hub to surface per-project installation status at a glance.
