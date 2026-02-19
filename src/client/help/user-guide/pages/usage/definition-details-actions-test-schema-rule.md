## Rule structure (`rules`)

A `rule` definition tells the assistant **what instruction text should be injected into the system message**, and **when** that instruction should be included.

In practice, rules are how you enforce coding standards, documentation conventions, architecture constraints, or team preferences across Agent/Chat/Edit interactions.

### Field-by-field reference

- `name` (**recommended**)  
  Human-readable title shown in UI and logs. Keep it short and specific (for example, `TypeScript Style Guide`).

- `dcc_uri` (**required in DCC**)  
  Canonical identifier for the definition, usually in the format `dev/rules/<slug>`. Other definitions can reference this rule using `dcc_use`.

- `description` (optional, but strongly recommended)  
  Plain-language explanation of what the rule is for and when it should apply. This helps users quickly understand intent before opening full content.

- `globs` (optional)  
  File path pattern(s) used to include the rule when matching files are present in context.
  - Accepts a single glob string or a list of glob strings.
  - Useful for language- or area-specific rules (for example `"**/*.{ts,tsx}"` or `"docs/**/*.md"`).

- `regex` (optional)  
  Content pattern(s) used to include the rule when contextual file contents match.
  - Accepts a single regex string or a list of regex strings.
  - Useful when application depends on code/content characteristics rather than file paths.

- `alwaysApply` (optional boolean)  
  Controls whether the rule is always added or only conditionally:
  - `true`: always included.
  - `false`: conditionally included (for example based on matching context and selection logic).
  - unset: default behavior defined by rule loading logic (typically context-driven).

- `rule` or Markdown body (**required**)  
  The actual instruction text sent to the model. This is the most important part: write explicit, actionable guidance.

### Inclusion behavior (practical model)

Think of matching in two phases:

1. **Targeting** (`globs` / `regex`) narrows where the rule is relevant.
2. **Inclusion policy** (`alwaysApply`) decides whether matching is required or optional.

A common setup is:
- `alwaysApply: false`
- language/file-specific `globs`
- clear `description`
- concise instruction body with bullet points

This keeps rules focused and avoids polluting unrelated prompts.

### Example rule definition

```yaml
name: JS Style Rule
dcc_uri: dev/rules/js-style
description: Enforce JavaScript style and discourage debug logging in production code
globs:
  - "**/*.js"
  - "**/*.mjs"
regex:
  - "console\\.log"
alwaysApply: false
rule: |
  - Use single quotes unless template literals are required.
  - Prefer const by default; use let only when reassignment is needed.
  - Avoid console.log in committed production code.
  - Keep functions small and focused on one responsibility.
```

### Authoring tips

- Prefer **one concern per rule** (style, testing, docs, security) instead of one giant rule.
- Use `globs` to scope rules tightly and reduce irrelevant instruction noise.
- Write requirements as concrete bullets ("Do X") instead of vague guidance ("Try to...").
- Keep `description` user-oriented: explain **intent**, not just implementation.
