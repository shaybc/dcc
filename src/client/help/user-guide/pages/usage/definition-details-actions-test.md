## Test tab: validation actions

The Test tab focuses on quality checks for the currently selected definition.

### How validation works
When you click **Run Validation** (or auto-run is enabled), DCC:

1. Sends the selected definition ID to the server (`POST /api/definitions/:id/validate`).
2. Loads that definition's current content from storage.
3. Validates it against server-side saved schema rules for that definition type.
4. Adds optional lint and reference checks.
5. Returns and stores a validation report that you can review and copy.

In short: the Test tab validates the definition you selected in Details, not a hard-coded example.

### Validation toggles
You can enable or disable checks before running validation:

- **Strict mode** for stricter schema validation behavior,
- **Lint checks** for style/content quality,
- **Reference checks** for cross-reference integrity,
- **Auto-run on open** to run validation automatically when opening the Test tab.

Use these controls to match the level of validation you need for your workflow.

### Auto-run on open (Auto test) explained
The **Auto-run on open** checkbox controls whether DCC triggers validation automatically when the **Test** tab becomes active.

- If enabled, opening the Test tab schedules a validation run.
- The run is delayed briefly (about 350ms) to avoid redundant calls during rapid UI changes.
- If disabled, validation runs only when you click **Run Validation**.

Use auto-run when you want immediate feedback each time you inspect a definition.

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

## Schema reference subsections

The schema guidance is split into focused pages per definition structure:

- [Common fields (all definition types)](/user-guide.html?page=definition-details-actions-test-schema-common)
- [Rule structure (`rules`)](/user-guide.html?page=definition-details-actions-test-schema-rule)
- [Prompt structure (`prompts`)](/user-guide.html?page=definition-details-actions-test-schema-prompt)
- [Workflow structure (`workflows`)](/user-guide.html?page=definition-details-actions-test-schema-workflow)
- [Agent structure (`agents`)](/user-guide.html?page=definition-details-actions-test-schema-agent)
- [Model structure (`models`)](/user-guide.html?page=definition-details-actions-test-schema-model)
- [Context structure (`context`)](/user-guide.html?page=definition-details-actions-test-schema-context)
- [MCP Server structure (`mcpservers`)](/user-guide.html?page=definition-details-actions-test-schema-mcpserver)
- [Config structure (`configs`)](/user-guide.html?page=definition-details-actions-test-schema-config)
- [Docs structure (`docs`)](/user-guide.html?page=definition-details-actions-test-schema-docs)
