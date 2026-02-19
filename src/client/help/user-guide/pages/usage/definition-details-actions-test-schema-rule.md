## Test tab schema: rule structure (`rules`)

- `globs` - optional file glob or list of globs.
- `regex` - optional regex matcher string.
- `alwaysApply` - optional boolean to force application.

```yaml
name: JS Style Rule
dcc_uri: dcc://rules/js-style
description: Apply JavaScript style guidance
globs:
  - "**/*.js"
regex: "console\\.log"
alwaysApply: false
```
