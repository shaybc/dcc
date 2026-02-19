## Prompt structure (`prompts`)

A `prompt` definition packages reusable instructions that Continue can inject as a user message when you run a task in **Chat**, **Plan**, or **Agent** mode.

Use prompt definitions when you want consistent behavior for repeated work (for example: code review checklists, SQL generation standards, migration playbooks, or debugging flows).

### Core prompt body fields

At least one of these should be present:

- `prompt` (string, optional)
  - A single block of text instructions.
  - Best for straightforward templates where one instruction block is enough.
  - Supports multiline content with YAML `|` syntax.

> Tip: Use yaml `prompt` for simple reusable instructions, or in a markdown file for a more advanced prompt engineering (you can use both, but MD is easier to format and is a more human readable format).

### Common metadata fields used with prompts

Prompt definitions also use common fields shared across schema types:

- `name` (required)
  - Human-friendly display name shown in DCC and Continue prompt pickers.

- `dcc_uri` (required)
  - Stable unique identifier (for example: `dev/prompts/bug-fix`).
  - Used for tracking, versioning, and installs.

- `description` (required)
  - Short summary of what the prompt helps accomplish.

- `invokable` (optional, boolean)
  - When `true`, the prompt is exposed as a slash command in Continue (type `/` to find it).
  - This is what turns the definition into an easy-to-run reusable command across Chat/Plan/Agent.

- `version`, `schema`, `dcc_tags`, `key`, `type` (optional)
  - Additional metadata for compatibility, categorization, and tooling.

### Example: simple prompt text

```yaml
name: Bug Fix Prompt
dcc_uri: dev/prompts/bug-fix
description: Prompt template for fixing bugs
invokable: true
prompt: |
  Analyze the issue and propose a minimal, safe fix.
  Explain root cause, code change, and regression risk.
```

### Tips

- When writing `prompt`:
  - keep a concise instruction template.
  - specify a system-level behavior constraints.
  - Build a more deterministic setup before user input.
