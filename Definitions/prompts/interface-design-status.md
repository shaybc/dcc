---
name: Interface Design Status
dcc_uri: dev/prompts/interface-design-status
description: Report the current interface-design system state for the active project.
schema: v1
invokable: true
---
Inspect `.interface-design/system.md` and summarize:
1) Direction and feel,
2) Depth strategy,
3) Spacing base unit,
4) Saved reusable component patterns,
5) Any mismatches or missing decisions.

If `.interface-design/system.md` does not exist, report that and provide a concise checklist to establish it.
