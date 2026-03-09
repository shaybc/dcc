# Run Agent Page

Use the **Run Agent** top navigation tab to launch an agent run with an explicit pipeline.

## Run pipeline

The page is organized as a step-by-step flow:

1. **Select Agent** (required)
2. **Select Config** (required)
3. **Prompt** (optional)
4. **Command Line Parameters** (optional)

You can run only when both required selections are complete.

## Picker and filters

For Agent and Config selection, the right-side picker supports:

- source tabs: **Installed**, **Available**, **Recent**,
- free-text filtering,
- quick apply/select actions.

## Optional prompt

Use the prompt field to provide initial run instructions. Leave it empty to use default behavior.

## Optional command-line permissions

You can enable optional run parameters such as:

- **Verbose**,
- **Readonly mode**,
- deny flags (for example read/list/search/fetch/diff),
- allow flags (for example write/edit/multiedit/terminal),
- allow-write pattern list,
- deny-terminal command list.

These options help constrain or expand what the run can do.
