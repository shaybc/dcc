## Config structure (`configs`)

A `config` definition is the **composition layer** in DCC: it assembles models, context providers, rules, prompts, docs, and MCP servers into a single reusable setup.

Think of this as the "wiring" file for an agent or IDE experience:

- definitions like `models/*`, `rules/*`, and `mcpservers/*` hold the actual implementation details
- the `config` tells DCC **which ones to include together**

---

### Required fields

- `dcc_config_type` (**required**) — selects the config runtime target:
  - `agents`: config is intended for agent-style workflows.
  - `ide`: config is intended for IDE-assistant workflows.

---

### Optional composition arrays

Each section below is optional. If omitted, that capability is simply not included in the assembled config.

- `models[]`
  - Purpose: attach one or more model definitions that will be available to this config.
  - Item shape:
    - `dcc_use` (**required**): reference to a model definition (for example `models/gpt-5-2-codex`).

- `context[]`
  - Purpose: add context provider definitions to control what context sources can be used.
  - Item shape:
    - `dcc_use` (**required**): reference to a context definition (for example `context/codebase`).

- `rules[]`
  - Purpose: include reusable rule definitions that shape assistant behavior and system instructions.
  - Item shape:
    - `dcc_use` (**required**): reference to a rule definition (for example `rules/js-style`).

- `prompts[]`
  - Purpose: include reusable prompt definitions (slash commands, canned tasks, templates).
  - Item shape:
    - `dcc_use` (**required**): reference to a prompt definition (for example `prompts/bug-fix`).

- `docs[]`
  - Purpose: include documentation index definitions that can be used as knowledge sources.
  - Item shape:
    - `dcc_use` (**required**): reference to a docs definition (for example `docs/platform-docs`).

- `mcpServers[]`
  - Purpose: attach MCP server definitions that expose tools/resources to the config.
  - Item shape:
    - `dcc_use` (**required**): reference to an MCP server definition (for example `mcpservers/browser`).

---

### How `dcc_use` works

`dcc_use` is a pointer to another definition by path-like ID. In practice:

- you define each resource (`models/*`, `rules/*`, etc.) separately
- your config references them with `dcc_use`
- validation checks that each referenced definition exists and has a compatible type

This keeps configs modular and easier to maintain across teams.

---

### Example

```yaml
name: Team IDE Config
dcc_uri: dcc://configs/team-ide
description: IDE config for team setup
dcc_config_type: ide
models:
  - dcc_use: models/gpt-5-2-codex
context:
  - dcc_use: context/repository
  - dcc_use: context/diff
rules:
  - dcc_use: rules/js-style
prompts:
  - dcc_use: prompts/bug-fix
docs:
  - dcc_use: docs/platform-docs
mcpServers:
  - dcc_use: mcpservers/browser
```

> Note: Common metadata fields such as `name`, `dcc_uri`, and `description` are documented in [Common fields](/user-guide.html?page=definition-details-actions-test-schema-common).
