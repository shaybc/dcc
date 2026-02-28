---
name: Interface Design Direction
dcc_uri: dev/prompts/interface-design-direction
description: Generate intent-first domain exploration and a non-generic interface direction proposal.
schema: v1
invokable: true
---
Use this structure and do not skip any section:

Domain: [at least 5 concepts from the product's world]
Color world: [at least 5 colors/material cues that naturally exist in that world]
Signature: [one structural, visual, or interaction element unique to this product]
Rejecting: [default 1] → [replacement], [default 2] → [replacement], [default 3] → [replacement]

Direction: [specific approach tied to the domain, color world, signature, and replacements]

Then ask exactly:
"Does that direction feel right?"

Constraints:
- Do not use generic labels like "clean and modern" without concrete meaning.
- If user context is missing (human, task, desired feeling), ask concise clarifying questions first.
