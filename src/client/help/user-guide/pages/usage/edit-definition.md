# Edit Definition

Use the editor to modify existing definitions safely and quickly.

## Editing capabilities

- **Structured form editing** for common fields.
- **Autocomplete** support in specific fields to improve speed and consistency.
- **Raw YAML / Markdown editing** for advanced control.
- Ability to switch between form and raw editing paths as needed.

## Rule attributes to include when editing rule definitions

When editing a **rule** definition, make sure these properties are present when needed:

- **`globs`** (optional): include the rule when matching files are in context. Supports a single glob or an array.
- **`regex`** (optional): include the rule when file content matches one or more regex patterns.
- **`alwaysApply`** (optional): controls unconditional inclusion.
  - `true`: always include the rule.
  - `false`: include only when `globs` match or when the agent pulls it in based on `description`.
  - omitted: default behavior (include when no `globs` are set, or when `globs` match).

## Typical edit flow

1. Open a definition and click **Edit**.
2. Update fields in the form (using autocomplete where offered).
3. Optionally switch to raw YAML/MD for direct source edits.
4. Save and validate the updated definition.

![Definition edit form with autocomplete and raw source options](../images/usage-edit-definition-form-and-raw.png)
