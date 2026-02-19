## Context structure (`context`)

Context definitions use the [common fields](/user-guide.html?page=definition-details-actions-test-schema-common)
(`name`, `dcc_uri`, `description`, `version`, `schema`, and `dcc_tags`) plus
a `context` list that declares one or more providers.

- `context` - list of context provider entries (required).
  - `provider` - context provider identifier (required).
  - `params` - optional list of provider parameters.
    - `key` - parameter name.
    - `value` - parameter value.

```yaml
name: "@Operating System"
dcc_uri: dev/context/operating_system
version: "1.1"
schema: v1
description: Reference the architecture and platform of your current operating system.
dcc_tags: []
context:
  - provider: os
```

```yaml
name: "@Open"
dcc_uri: dev/context/open
version: "1.1"
schema: v1
description: Reference the contents of all of your open files. Set onlyPinned to true to only reference pinned files.
dcc_tags: []
context:
  - provider: open
    params:
      - key: onlyPinned
        value: "true"
```

```yaml
name: "@Debugger"
dcc_uri: dev/context/debugger
version: "1.1"
schema: v1
description: Reference the contents of the local variables in the debugger. Currently only available in VS Code. Uses the top n levels (defaulting to 3) of the call stack for that thread.
dcc_tags: []
context:
  - provider: debugger
    params:
      - key: stackDepth
        value: "3"
```
