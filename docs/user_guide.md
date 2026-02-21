# User Guide

## 1. Start DCC

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## 2. Configure AI asset repositories

Go to **Settings** and add one or more asset repositories:
- **Name**
- **Remote URL** (`remoteUrl`)
- **Clone Folder** (`localPath`)
- **Enabled** toggle

Save each row to persist it.

## 3. Sync repositories and load definitions

From **Settings**, run:
1. **Pull all / Clone missing** (uses `/api/asset-repos/sync`)
2. **Load Definitions** (uses `/api/load-definitions`)

This refreshes the catalog from all enabled repository files.

## 4. Set up dev project discovery

In Settings:
1. Add one or more dev project root paths.
2. Save roots to trigger scan.
3. Review discovered projects and detected project types/signals.
4. Choose a current dev project for save/remove operations.

## 5. Browse and find definitions

In the Hub you can:
- Search definitions by text.
- Use semantic intent-search fallback when text search returns no matches ("Search with AI").
- Filter by type.
- Filter using tags.
- Inspect full definition details.

When text search returns zero results, DCC offers an AI prompt in the cards area. Selecting **Search with AI** sends your query plus definition metadata for ranking and shows results in the normal cards/pagination flow. Those AI-ranked results remain active until the search text changes.

## 6. Save/remove definitions in your local project

With current dev project selected:
- **Save** adds/copies (or merges context providers) into the project.
- **Remove** reverts the saved copy behavior.

Saved status is reflected using project copy tracking.

## 7. Validate definitions

Open a definition and run validation.
- View latest validation result.
- Review validation history for prior runs.
- Use strict/lint/reference options from the UI.

## 8. Manage lifecycle operations

Available actions include:
- Duplicate definition (new name/path/dcc URI)
- Push upstream (for local/untracked definitions)
- Publish (commit and push with version bump)
- Delete from repository

## 9. Use version history

For definitions tracked in git:
- Open version list,
- Inspect specific historical revisions,
- Restore a selected revision.

## 10. Use the editor workbench

Create/edit definitions with:
- Type-aware forms,
- Raw source editing,
- Type auto-detection,
- DCC URI uniqueness checks on save.

## 11. Export to GitHub Copilot and Gemini CLI (v1)

When installing a definition into a project, choose destination:
- **Continue** (default install flow),
- **GitHub Copilot**, or
- **Gemini CLI**.

In v1, destination export currently supports `rules` and `prompts` only.

## 12. Optional AI endpoints

If Gemini credentials are configured, DCC exposes OpenAI-like endpoints under `/v1/*` for models/completions/chat/embeddings.

## 13. Theme preferences

Use the Settings theme toggle to switch light/dark mode. Preference is saved in browser storage.
