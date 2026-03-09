# Code Architecture

## Repository layout

```text
src/
  client/
    index.html, app.js                 # Hub UI entry + service bootstrapping
    ui/appController.js                # Main hub controller (modularized under ui/appController/*)
    pages/                             # In-page HTML partials (hub, detail, activity, agents)
    api/                               # Domain-specific HTTP client wrappers
    services/                          # Shared UI services (loading, notifications, search, diff, auto-tag)
    state/                             # Shared mutable client state
    editor/                            # Editor page + forms + YAML sync components
    settings/                          # Settings submodules (repos, projects, imports/exports, theme)
    user-guide/                        # User-guide SPA assets and markdown rendering helpers
    styles/                            # Tokenized CSS system (base/layout/sections/components/themes)
  server/
    server.js                          # Express bootstrap + route registration + static hosting
    routes/                            # REST route modules (hub, lifecycle, editor, runs, validation)
    definitions/                       # Definition domain logic + export adapters
    projects/                          # Project scan + context window estimation
    services/
      ai/                              # Gemini AI Studio + Gemini Connector clients
      agentRunManager/                 # Agent execution lifecycle, launch options, process controls
    versions/                          # Version caching and git-backed history helpers
    db/                                # SQLite schema init and query helpers
    utils/                             # env, logger, settings, git, files, AI logging helpers
tests/
  *.test.js                            # Node test runner suites
  fixtures/                            # Parsing, project-scan, and recommendation fixtures
docs/
  *.md                                 # Product and technical documentation
```

## Backend module boundaries

### Route layer (`src/server/routes/*`)
Routes remain thin HTTP controllers responsible for:
- request parsing and validation,
- response and status shaping,
- delegating to domain/service helpers,
- translating thrown errors into JSON envelopes.

In addition to core CRUD-style routes, the server now exposes dedicated endpoints for:
- **agent run packs** (`agentRunPacks.js`) for discover/install metadata,
- **agent runs** (`agentRuns.js`) for launching, polling, cancelling, and activity history,
- **OpenAI-compatible facade** (`openai.js`) backed by Gemini clients.

### Definition domain (`src/server/definitions/*`)
The definitions package is the core business layer for:
- type detection, normalization, and parsing,
- metadata extraction and DCC URI handling,
- validation and recommendation logic,
- save/install/version bump operations,
- destination export via adapter architecture (`export/adapters/*`) for Copilot and Gemini.

### Project intelligence (`src/server/projects/*`)
Project logic is split between:
- `scan.js` orchestration,
- `scan/*` analyzers (filesystem signals, repo signals, AI metadata hints, tech inference),
- `contextWindow.js` utilities used for prompt/context sizing flows.

### Infrastructure/services
- `db/*` owns SQLite initialization and helper wrappers.
- `services/agentRunManager/*` encapsulates subprocess lifecycle management and run-option shaping.
- `services/ai/*` encapsulates provider-specific Gemini integrations (AI Studio + Connector).
- `utils/*` centralizes cross-cutting behavior (settings reads/writes, logging configuration, git shells, file ops).

## Frontend architecture

### Page-level entry points
- `src/client/app.js`: boots the hub app and global loading/notification services.
- `src/client/editor/editor.js`: boots the dedicated editor workbench.
- `src/client/settings.js`: boots settings UI.
- `src/client/user-guide/app.js`: boots the in-app user guide experience.

### Hub composition (`src/client/ui/appController*`)
The hub controller is organized as a composition root (`appController.js`) plus focused modules in `ui/appController/` for:
- definition preview/rendering utilities,
- filters, search, pagination, and favorites/preferences persistence,
- activity dashboard + run-stream UI behavior,
- onboarding and hub menu orchestration,
- validation and context-size panel workflows,
- install/export destination compatibility helpers.

### Supporting layers
- `src/client/api/*`: domain API wrappers around shared fetch client.
- `src/client/editor/forms/*`: type-specific form builders/serializers.
- `src/client/editor/components/*`: specialized UI widgets (array editors, YAML sync).
- `src/client/services/*`: reusable app services.
- `src/client/state/appState.js`: shared app-level state container.

## Data flow patterns

1. UI interaction triggers a controller action.
2. Controller invokes API wrapper(s).
3. Server route delegates to domain/services layer.
4. Domain logic may call DB, filesystem/git, project scanners, or Gemini services.
5. Route returns normalized JSON/SSE payload.
6. UI updates local state and re-renders cards, detail panes, activity logs, or editor forms.

## Testing organization

- Test runner: Node built-in test runner (`node --test`).
- Tests emphasize route and domain behavior under `tests/*.test.js`.
- Fixtures cover parsing/validation definitions and multi-language project-scan scenarios under `tests/fixtures/*`.
- Dedicated suites validate export compatibility, OpenAI/Gemini streaming adapters, and agent-run command launch behavior.

## Architectural characteristics

- **Single-process monolith**: one Node server hosts static assets and API endpoints.
- **Local-first state**: SQLite + local filesystem/git are primary persistence layers.
- **Service-oriented internals**: routes are thin; reusable domain/services modules hold behavior.
- **Deterministic recommendation + export logic**: explainable ranking and adapter-driven destination mapping.
- **Optional AI integration**: Gemini-backed endpoints enhance workflows without blocking core local features.
- **Operational observability in-product**: activity dashboard and run logs expose agent execution state in the UI.
