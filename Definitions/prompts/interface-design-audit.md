---
name: Interface Design Audit
dcc_uri: dev/prompts/interface-design-audit
description: Audit code against interface-design system decisions and craft principles.
schema: v1
invokable: true
---
Audit the current implementation against `.interface-design/system.md` and the following checks:
- Token architecture consistency,
- Spacing grid adherence,
- Depth strategy consistency,
- Navigation and hierarchy clarity,
- Interaction/data states coverage,
- Swap/squint/signature/token craft checks.

Return:
- Findings grouped by severity,
- Exact components/files affected,
- Concrete fixes with rationale.
