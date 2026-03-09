# User Guide

## 1. Start DCC

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## 2. Add and sync AI asset repositories

In **Settings → Asset Repositories**:

1. Click **Add Repository**.
2. Fill **Repository Name**, **Repository Remote URL**, and **Clone Folder**.
3. Save the entry.
4. Run **Pull all / Clone missing**.
5. Run **Load Definitions** to refresh the Hub catalog.

Sync behavior is automatic per enabled repo: missing folders are cloned, existing git repos are pulled.

## 3. Configure development project roots

In **Settings → Dev Project Roots**:

1. Add one or more root folders.
2. Save roots.
3. Click **Scan** to discover git projects.
4. Confirm projects appear in **Detected Projects**.

Detected projects are then available in the Hub project selector and are used for install/remove operations.

## 4. Configure general settings

In **Settings** you can also configure:

- **Theme** (light/dark toggle)
- **Recommendations** (max suggested definitions: 3–8)
- **Loading Timeout** (15–300 seconds)
- **AI Logging** toggles and max response length

These values are persisted and applied to runtime behavior.

## 5. Configure AI API Service (optional)

In **Settings → AI API Service**, select a Gemini backend for OpenAI-compatible routes:

- **Gemini Connector**, or
- **Gemini AI Studio**

Key endpoints include:

- `GET /v1/models`
- `POST /v1/chat/completions`

Use **Save AI API settings** to persist credentials/model settings and **Get Models** to validate connectivity.

## 6. Search and filter definitions

From the Hub:

- Use text search for names/descriptions/metadata.
- Use filters and tags to narrow results.
- If text search has no matches, use **Search with AI** for semantic intent ranking.

AI-ranked results remain active until search text changes.

## 7. Inspect definition details

Definition details include:

- **Preview** tab for rendered content
- **Source** tab for raw definition content and comparisons
- **Test** tab for validation runs and results

Use **Back to hub** to return to the grid.

## 8. Install definitions into a selected project

First choose a project in the Hub header (**Dev project** selector), then install from definition details.

Supported destinations:

- **Continue** (default install flow)
- **GitHub Copilot** (export)
- **Gemini CLI** (export)

Installed definitions are marked per selected project. You can filter for installed items or hide installed definitions.

### Export behavior for Copilot/Gemini (v1)

Currently supported types:

- `rules`
- `prompts`

Output locations:

- **Copilot rules:** `.github/copilot-instructions.md`
- **Copilot prompts:** `.github/prompts/<dcc-uri-slug>.prompt.md`
- **Gemini rules:** `.gemini/instructions.md`
- **Gemini prompts:** `.gemini/commands/<dcc-uri-slug>.md`

Other definition types are skipped for Copilot/Gemini v1.

## 9. Use definition action buttons

From definition details, available actions include:

- **Install / Uninstall** in current project
- **Edit definition**
- **Duplicate definition**
- **Copy definition**
- **Version history** (inspect/compare/restore)
- **Push definition to upstream** (when available)
- **Delete definition** (when permitted)

## 10. Validate and test definitions

Use the **Test** tab to run validation checks and review latest/history results.

Use this before install/publish to catch schema or structure issues.

## 11. Edit and create definitions

The editor supports:

- Type-aware forms
- Raw source editing
- Type detection
- URI/path/name controls during create/duplicate flows

Use **Create new Definition** for net-new assets and **Edit**/**Duplicate** for iterations.
