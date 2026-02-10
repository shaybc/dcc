# Code Architecture

## Repository layout

```text
src/
  client/
    index.html, app.js                 # Hub UI entry
    settings.html, settings.js         # Settings page
    editor/                            # Editor page + forms + sync helpers
    api/                               # HTTP client wrappers
    services/                          # UI services (diff/search/loading)
    state/                             # shared client state
    styles/                            # tokenized CSS architecture
  server/
    server.js                          # Express bootstrap
    routes/                            # API modules
    definitions/                       # parse/save/load/recommend/validate helpers
    projects/scan.js                   # project discovery + type detection
    versions/                          # version cache and git version helpers
    db/                                # sqlite init + query helpers
    services/ai/                       # Gemini adapter
    utils/                             # env, logger, git, settings, file utils
tests/
  *.test.js                            # node test runner suites
  fixtures/                            # scan and parser fixtures
docs/
  *.md                                 # product + technical documentation
```

## Backend module boundaries

### Route layer (`src/server/routes/*`)
Thin HTTP controllers responsible for:
- request/response shape,
- input extraction,
- status code and error envelope handling,
- delegating business logic.

### Domain helpers (`src/server/definitions/*`)
Core definition logic:
- type detection and normalization,
- metadata extraction (including DCC URI handling),
- parsing/serialization helpers,
- validation,
- recommendation scoring,
- save/install content transformations.

### Infra helpers
- `db/*` abstracts sqlite callback APIs into promise helpers.
- `utils/git.js` centralizes shell git calls and error parsing.
- `projects/scan.js` contains filesystem traversal + project-type detection.
- `services/ai/geminiAIStudioClient.js` encapsulates Gemini API calls.

## Frontend architecture

### Page-level entry points
- `src/client/app.js`: main hub app bootstrap.
- `src/client/settings.js`: settings/project-root management UI.
- `src/client/editor/editor.js`: create/edit definition workbench.

### Supporting layers
- `src/client/api/*`: fetch wrappers per domain.
- `src/client/ui/appController.js`: hub page orchestration.
- `src/client/editor/forms/*`: type-specific form rendering/collection.
- `src/client/editor/components/yamlEditorSync.js`: form/source synchronization.
- `src/client/state/appState.js`: mutable app state container.
- `src/client/services/*`: reusable UI services.

## Data flow patterns

1. UI event triggers API call.
2. Route delegates to domain helper(s).
3. Helpers interact with DB/filesystem/git/Gemini as needed.
4. Route returns normalized JSON.
5. UI updates state and re-renders.

## Testing organization

- Uses Node's built-in test runner (`node --test`).
- Route-level and helper-level tests live in `tests/*.test.js`.
- Project scan behavior validated with fixture directories under `tests/fixtures/project-scan`.

## Architectural characteristics

- **Single deployable process**: one Node process serves UI and API.
- **Local-first persistence**: SQLite + filesystem as source of truth.
- **Stateless HTTP layer**: sessionless REST patterns, settings persisted in DB.
- **Explainable recommendation logic**: deterministic score + reasons.
- **Progressive enhancement for AI**: app works without Gemini unless `/v1` endpoints are used.
