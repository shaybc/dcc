## Test tab schema: workflow structure (`workflows`)

- `steps` - required non-empty list of workflow step objects.
- `steps[].id` - optional per-step identifier.

```yaml
name: PR Review Workflow
dcc_uri: dcc://workflows/pr-review
description: Review and prepare a pull request
steps:
  - id: gather-context
  - id: run-validation
```
