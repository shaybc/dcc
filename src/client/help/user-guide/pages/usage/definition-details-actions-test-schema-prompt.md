## Test tab schema: prompt structure (`prompts`)

- `prompt` - optional single prompt text.
- `messages` - optional structured chat message array.

```yaml
name: Bug Fix Prompt
dcc_uri: dcc://prompts/bug-fix
description: Prompt template for fixing bugs
prompt: |
  Analyze the issue and propose a minimal fix.
messages:
  - role: system
    content: You are a careful coding assistant.
  - role: user
    content: Fix the failing test.
```
