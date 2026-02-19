## Config structure (`configs`)

- `dcc_config_type` - required enum: `agents` or `ide`.
- `dcc.config_type` - optional enum: `agents` or `ide`.
- `models[]` / `context[]` / `rules[]` / `prompts[]` / `docs[]` / `mcpServers[]` - optional arrays where each item contains:
  - `dcc_use` - required string reference.

```yaml
name: Team IDE Config
dcc_uri: dcc://configs/team-ide
description: IDE config for team setup
dcc_config_type: ide
dcc:
  config_type: ide
models:
  - dcc_use: models/gpt-5-2-codex
rules:
  - dcc_use: rules/js-style
prompts:
  - dcc_use: prompts/bug-fix
docs:
  - dcc_use: docs/platform-docs
mcpServers:
  - dcc_use: mcpservers/browser
```
