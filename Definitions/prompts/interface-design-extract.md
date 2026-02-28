---
name: Interface Design Extract Patterns
dcc_uri: dev/prompts/interface-design-extract
description: Extract reusable UI patterns from existing code into system conventions.
schema: v1
invokable: true
---
Review the codebase and extract repeatable interface patterns.

Include only patterns that are:
- Used 2+ times, or
- Clearly reusable across product surfaces, or
- Defined by specific measurements worth preserving.

Exclude one-off experiments and temporary variants.

Output:
- Candidate patterns,
- Canonical token/spacing/depth values,
- Recommended entries to add to `.interface-design/system.md`.
