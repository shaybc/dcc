## Prompt structure (`prompts`)

A `prompt` definition packages reusable instructions that Continue can inject as a user message when you run a task in **Chat**, **Plan**, or **Agent** mode.

Use prompt definitions when you want consistent behavior for repeated work (for example: code review checklists, SQL generation standards, migration playbooks, or debugging flows).

### Core prompt body fields

At least one of these should be present:

- `prompt` (string, optional)
  - A single block of text instructions.
  - Best for straightforward templates where one instruction block is enough.
  - Supports multiline content with YAML `|` syntax.

- `messages` (array, optional)
  - A structured conversation history.
  - Best when you want role-based behavior (`system`, `user`, optionally `assistant`) or multi-step setup context.
  - Each item should include:
    - `role`: who is speaking.
    - `content`: what that message says.

> Tip: Use `prompt` for simple reusable instructions, and `messages` for more advanced prompt engineering where role separation matters.

### Common metadata fields used with prompts

Prompt definitions also use common fields shared across schema types:

- `name` (required)
  - Human-friendly display name shown in DCC and Continue prompt pickers.

- `dcc_uri` (required)
  - Stable unique identifier (for example: `dcc://prompts/bug-fix`).
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
dcc_uri: dcc://prompts/bug-fix
description: Prompt template for fixing bugs
invokable: true
prompt: |
  Analyze the issue and propose a minimal, safe fix.
  Explain root cause, code change, and regression risk.
```

### Example: structured `messages`

```yaml
name: Bug Fix Prompt (Structured)
dcc_uri: dcc://prompts/bug-fix-structured
description: Bug-fix prompt with role-based setup
invokable: true
messages:
  - role: system
    content: You are a careful coding assistant focused on minimal, safe fixes.
  - role: user
    content: Fix the failing test and explain why it was failing.
```

### When to choose each format

- Choose `prompt` when:
  - You want a concise instruction template.
  - You do not need role separation.

- Choose `messages` when:
  - You need system-level behavior constraints.
  - You want more deterministic setup before user input.
  - You need to model a specific multi-message context.
