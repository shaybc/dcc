# User Guide

## 1. Start DCC

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## 2. Configure repository settings

Go to **Settings** and set:
- **Repository URL** (`repoUrl`)
- **Local repository path** (`repoPath`)

Click save.

## 3. Sync team definitions

From the Hub/controls, run:
1. **Clone/Pull** (uses `/api/clone-pull`)
2. **Load Definitions** (uses `/api/load-definitions`)

This refreshes the catalog from the repository files.

## 4. Set up dev project discovery

In Settings:
1. Add one or more dev project root paths.
2. Save roots to trigger scan.
3. Review discovered projects and detected project types/signals.
4. Choose a current dev project for save/remove operations.

## 5. Browse and find definitions

In the Hub you can:
- Search definitions by text.
- Filter by type.
- Filter using tags.
- Inspect full definition details.

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

## 11. Optional AI endpoints

If Gemini credentials are configured, DCC exposes OpenAI-like endpoints under `/v1/*` for models/completions/chat/embeddings.

## 12. Theme preferences

Use the Settings theme toggle to switch light/dark mode. Preference is saved in browser storage.
