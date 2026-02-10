# User Guide

This guide covers setup, daily usage, and key workflows in DCC.

## 1) Prerequisites
- Node.js + npm
- Git installed and authenticated for your team repository
- Local filesystem access to your target dev projects
- Optional: Gemini API key for `/v1` usage

## 2) Start DCC
```bash
npm install
npm start
```
Default URL: `http://localhost:3000`

## 3) First-Time Setup
1. Open `http://localhost:3000/settings`.
2. Set **Repo URL** and **Repo Path**, then save.
3. Click **Clone/Pull** to sync repo locally.
4. Click **Load Definitions** to index definitions.
5. Add dev project root paths and click **Save Roots** to discover git projects.

## 4) Hub Workflows (`/`)

### 4.1 Browse and find definitions
- Filter by definition type.
- Search by text and tags.
- Click tag pills to refine results quickly.

### 4.2 Inspect details
Open a definition card to see:
- metadata (name, type, tags, version, status)
- preview and raw source
- validation/test panel

### 4.3 Common actions
- **Save**: install definition into active dev project.
- **Remove**: uninstall from active dev project.
- **Duplicate**: create a new definition file from the current one.
- **Edit**: open editor for full modification.
- **Push upstream**: commit/push local definition to remote.
- **Delete**: remove definition from repo/local source depending on origin.

## 5) Validation
From a definition detail panel:
- Run validation manually.
- Enable strict/lint/reference toggles.
- Filter results by severity.
- Copy report output.

Validation output is persisted and available as latest and history views.

## 6) Version History
1. Open a definition details panel.
2. Click **Version History**.
3. Select a historical version.
4. Review content in historical mode.
5. Use **Restore this version** to make it current again.

## 7) Editor (`/editor/editor.html`)

### Create new definition
- Click **New Definition** from hub.
- Choose a type.
- Fill structured form and/or raw source.
- Save.

### Edit existing definition
- Open from details panel.
- Update form fields or source directly.
- Save changes.

### Editor behavior
- Form and source stay synchronized.
- Type-specific forms exist for major definition categories.
- Type can be detected from content with server-side support.

## 8) Save/Remove behavior in dev projects
- DCC uses the currently selected dev project.
- Most definition types are copied into `.continue/.../team/...` folders.
- `context` definitions are merged into project config provider arrays.

## 9) OpenAI-Compatible API (`/v1`)

### List models
```bash
curl http://localhost:3000/v1/models
```

### Text completion
```bash
curl -X POST http://localhost:3000/v1/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemini-2.5-pro","prompt":"Write release notes","max_tokens":128}'
```

### Chat completion
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemini-2.5-pro","messages":[{"role":"user","content":"Explain this patch"}]}'
```

### Embeddings
```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H 'Content-Type: application/json' \
  -d '{"model":"text-embedding-004","input":"developer control center"}'
```

## 10) Troubleshooting
- **Repo sync failure**: verify repo URL, credentials, and local path permissions.
- **No definitions loaded**: run Load Definitions after Clone/Pull and validate file formatting.
- **Wrong project updated**: verify current dev project selection.
- **Push/publish failures**: inspect local git status and remote permissions.
- **`/v1` errors**: verify Gemini env vars and request payload schema.
