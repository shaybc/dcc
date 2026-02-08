# User Guide (for Developers)

This guide explains what DCC can do, how to run it, and how to use each major feature end-to-end.

## 1) What DCC does for you
DCC is a local control hub for AI-related project definitions.

It helps you:
- manage definition artifacts (prompts, models, workflows, rules, agents, MCP servers, context),
- sync them from a team repository,
- copy/remove them into local dev projects under `.continue` conventions,
- edit definitions with form + raw-source workflows,
- optionally expose an OpenAI-compatible endpoint backed by Gemini.

---

## 2) Prerequisites
- Node.js/npm installed.
- Git installed and configured for repository access.
- Local filesystem access to your target dev project directories.
- (Optional) Gemini API key configured for `/v1` API usage.

---

## 3) Start the application

```bash
npm install
npm start
```

By default, the server runs on `http://localhost:3000` unless `PORT` is set.

---

## 4) First-time setup workflow

## Step 1: Open Settings page
Use `/settings` in the browser.

## Step 2: Configure repository
Fill:
- **Repo URL** (remote git URL),
- **Repo Path** (local clone destination).

Click **Save settings**.

## Step 3: Sync repo
Click **Clone/Pull**.
- If path is new: clone.
- If path exists: pull latest.

## Step 4: Load definitions
Click **Load definitions** to scan and index files.

## Step 5: Configure dev project roots
Add one or more root paths and click **Save roots**.
DCC will recursively discover git projects and populate the project list.

---

## 5) Everyday usage on Hub page

## 5.1 Select current dev project
Choose one discovered project as active target.
This controls where **Save** and **Remove** operations apply.

## 5.2 Find definitions
Use:
- search box (text and tags),
- type filters,
- tag pill clicks.

## 5.3 Inspect details
Open a definition card to view:
- name, description, tags,
- type and creation date,
- status,
- rendered preview and raw source tabs.

## 5.4 Common actions
- **Save**: copy to active project (or merge context providers).
- **Remove**: undo save for active project.
- **Duplicate**: clone file with new name/file name.
- **Edit**: open in editor.
- **Push upstream**: commit/push untracked/local definition.
- **Delete**: remove from repo/local source with safety handling.

---

## 6) Editing definitions

## 6.1 Create new definition
- Click “New Definition”.
- Pick type.
- Fill structured form fields.
- Validate raw source pane if desired.
- Save through editor endpoint.

## 6.2 Edit existing definition
- Open definition detail.
- Click “Edit”.
- Modify form or raw source.
- Save.

## 6.3 How form/text sync works
- Form changes re-serialize into YAML/Markdown.
- Raw text edits re-parse into structured form state when valid.
- Parse errors are shown to prevent silent corruption.

---

## 7) Using OpenAI-compatible API (`/v1`)

This is useful for tools expecting OpenAI endpoints (e.g., compatible clients/extensions).

## 7.1 List models
```bash
curl http://localhost:3000/v1/models
```

## 7.2 Text completion
```bash
curl -X POST http://localhost:3000/v1/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gemini-2.5-pro",
    "prompt": "Summarize this diff:",
    "max_tokens": 256
  }'
```

## 7.3 Chat completion
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [
      {"role":"system","content":"You are concise."},
      {"role":"user","content":"Write a commit message for this patch."}
    ]
  }'
```

## 7.4 Embeddings
```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "text-embedding-004",
    "input": "developer control center"
  }'
```

---

## 8) Recommended team workflow
1. Configure shared team repo in Settings.
2. Refresh definitions daily (pull + load).
3. Select active project before saving/removing definitions.
4. Use duplicate/edit flow for custom variants.
5. Push upstream for reusable artifacts.
6. Keep context definitions curated to avoid provider duplication.

---

## 9) Troubleshooting

## Repo sync fails
- Verify git credentials and repository URL.
- Ensure repo path is writable.

## Definitions not appearing
- Run “Load definitions” after sync.
- Confirm files are valid YAML or Markdown/frontmatter.

## Save/remove does not affect expected project
- Check active current dev project selection.

## Push/delete errors
- Could be permission or merge conflict related.
- Resolve manually in git workspace when necessary.

## `/v1` errors
- Verify Gemini API key/model environment configuration.
- Validate request schema (`messages`, `prompt`, token fields, etc.).

---

## 10) Developer Notes
- DCC is local-first and stateful; SQLite contents influence UI status.
- Some actions run shell git commands directly from server process.
- Always validate resulting files in your project `.continue` folders after save/remove operations.

