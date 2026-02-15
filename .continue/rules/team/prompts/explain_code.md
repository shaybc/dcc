---
name: Explain Code
version: 1.0.0
schema: ''
description: Explain code as if you are handing it over to a new owner
invokable: true
---

Explain the selected code as if you are handing it to a developer who needs to own and modify it.

Cover:
- What it does and why it exists (not a line-by-line walkthrough)
- Non-obvious assumptions or preconditions the caller must satisfy
- Side effects, mutations, or external dependencies
- Known limitations, edge cases, or TODOs worth flagging
- Anything that would surprise a competent developer reading it for the first time

Be concise. If the code is straightforward, say so briefly rather than padding the explanation.
