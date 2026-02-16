# Definition Details Actions

This page explains every action you can perform from the **Definition details** view so you can confidently inspect, validate, and manage a definition.

## Navigation and view controls

### Back to hub
Use **Back to hub** to close the details page and return to the definition grid.

Use this when you are done reviewing one definition and want to continue browsing others.

### Preview / Source / Test tabs
The details page is split into three tabs:

- **Preview**: shows a rendered, human-readable view of the definition.
- **Source**: shows the raw definition content (for example YAML/Markdown) and version comparison tools.
- **Test**: runs validation checks and displays validation results.

A practical flow is: start in Preview for quick understanding, verify exact content in Source, and then run validation in Test.

## Definition action buttons (top-right)

These are the action buttons shown next to the tab bar.

### Install definition in current project
Click **Install definition in current project** to apply the current definition to the project currently selected in the Hub.

- If no project is selected, the button is disabled.
- If the definition is already installed in that project, the button is disabled.

Use this after you verify the definition is the right one and ready to be used.

### Edit definition
Click **Edit definition** to open the editor for this definition.

Use this when you need to change prompts, rules, metadata, or structure before installation.

### Duplicate definition
Click **Duplicate definition** to create a copy that you can safely modify.

During duplication, you can provide:

- a new name,
- a file name,
- a DCC URI,
- and optionally adjusted content.

Use duplication when you want a variant without changing the original definition.

### Copy definition
Click **Copy definition** to copy the full definition content to your clipboard.

Use this for quick sharing, backup snippets, or external review.

### Version history
Click **Version history** to open historical versions of the definition.

From version history you can:

- open and inspect an older version,
- compare versions in diff mode,
- restore a historical version as a new current version (after confirmation).

Use this when debugging regressions, auditing changes, or rolling back problematic edits.

### Push definition to upstream (when available)
**Push definition to upstream** appears for untracked/local definitions that can be published upstream.

Use this when a local definition should become shared in the team repository.

### Delete definition (when available)
**Delete definition** appears only when deletion is permitted.

Use this to remove a definition from its source repository. The UI asks for confirmation before deletion.

## Source tab: version and diff actions

When viewing Source, additional actions help you review changes deeply.

### Compare versions toggle
Enable **Compare versions** to switch from raw source view to diff comparison tools.

Use this to inspect what changed between two versions before restoring or editing.

### From / To version selectors
Choose the two versions you want to compare.

Use this to compare:

- historical → current,
- historical → historical,
- or current → current-adjacent versions.

### Ignore whitespace
Enable **Ignore whitespace** to focus only on meaningful content changes.

Use this to avoid noise from formatting-only edits.

### Diff mode: Side-by-side / Inline
Switch between:

- **Side-by-side**: easier for broad structural comparison,
- **Inline**: easier for reading one continuous stream of edits.

### Change navigation
Use **Previous** and **Next** controls to jump between detected diff hunks.

Use this to review large changes quickly without manually scrolling.

### Version banner actions (when viewing a historical version)
When you open a historical version, a banner appears with two important actions:

- **Restore this version**: previews diff and then restores that version as the latest definition after confirmation.
- **Back to current**: exits historical mode and returns to the current version.

## Test tab: validation actions

The Test tab focuses on quality checks for the current definition.

### Validation toggles
You can enable or disable checks before running validation:

- **Strict mode** for stricter validation behavior,
- **Lint checks** for style/content quality,
- **Reference checks** for cross-reference integrity,
- **Auto-run on open** to run validation automatically when opening definitions.

Use these controls to match the level of validation you need for your workflow.

### Severity filter
Use **Severity filter** to show only errors, warnings, info, or all findings.

Use this to focus on blockers first and then follow up on lower-severity issues.

### Run Validation
Click **Run Validation** to execute checks and refresh results.

Use this after any edit or before installing/publishing a definition.

### Copy JSON report
Click **Copy JSON report** to copy the raw validation report.

Use this when you need to share exact machine-readable validation output in tickets, PRs, or chat.
