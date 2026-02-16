# Source and Test Tab Actions

This page covers advanced review and validation actions available in the **Source** and **Test** tabs.

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

![Compare Versions feature](../images/compare-versions.png)

## Test tab: validation actions

The Test tab focuses on quality checks for the current definition.

### Rule matching attributes to verify for rule definitions

When the definition type is **rule**, validate that these targeting fields are configured correctly before publishing:

- **`globs`**: file-path pattern(s) used to include the rule when matching files are present in context.
- **`regex`**: content pattern(s) used to include the rule when file contents match.
- **`alwaysApply`**:
  - `true` keeps the rule always active,
  - `false` keeps it conditional (matching `globs` or agent decision via `description`),
  - omitted uses default include behavior.

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

![Definition Test tab](../images/test=tab.png)