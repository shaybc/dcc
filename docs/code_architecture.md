# Code Architecture

## 1) Repository Structure
```text
src/
  client/
    app.js
    settings.js
    theme.js
    index.html
    settings.html
    styles.css
    editor/
      editor.js
      editor.html
      editor.css
      components/
      forms/
  server/
    server.js
    routes/openai.js
    definitions/
    services/ai/
    utils/
```

## 2) Backend Architecture

### `src/server/server.js`
Single orchestration module handling:
- DB bootstrap and migrations
- static web hosting
- primary `/api/*` routes
- git command execution and error mapping
- definition indexing, project scanning, save/remove/publish flows
- validation + version-history APIs

### `src/server/routes/openai.js`
Compatibility facade for OpenAI-style APIs:
- request validation with Zod
- Gemini request translation
- SSE and JSON output modes
- tool-call normalization for chat APIs

### `src/server/definitions/*`
Focused helpers:
- type detection
- definition load/save
- version bumping
- schema/lint/reference validation

## 3) Frontend Architecture

### Hub (`app.js`)
- catalog loading and rendering
- filtering/search/tag interactions
- detail panel actions (save/remove/edit/duplicate/publish/push/delete)
- validation and version-history interactions

### Settings (`settings.js`)
- repository configuration and sync actions
- dev root management and project discovery trigger
- theme toggle controls

### Editor (`editor/editor.js` + forms)
- type-specific form handlers
- source/form synchronization layer
- definition load/save integration with `/api/editor/*`

## 4) Data Flow Summary
1. Settings drives repo sync and indexing.
2. Indexed definitions power hub search/filter/detail actions.
3. Save/remove targets the selected dev project.
4. Validation/version history enrich detail workflows.
5. `/v1/*` facade supports external model clients.
