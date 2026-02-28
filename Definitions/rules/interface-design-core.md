---
name: Interface Design Core
dcc_uri: dev/rules/interface-design-core
description: Guardrails and craft standards for designing product interfaces (dashboards, admin panels, SaaS tools).
schema: v1
alwaysApply: true
rule: |
  Scope
  - Use this rule for product interfaces: dashboards, admin panels, SaaS apps, internal tools, settings pages, and data interfaces.
  - Do NOT use this rule for landing pages, campaigns, or marketing websites.

  Intent-first requirements
  - Before designing, explicitly identify:
    1) the specific human using the interface,
    2) the concrete job they must complete,
    3) the intended feeling of the interface in specific language.
  - If any are missing, ask for clarification instead of defaulting.

  Mandatory domain exploration before proposing direction
  - Produce all four outputs before proposing a direction:
    1) Domain concepts (minimum 5),
    2) Color world from the product domain (minimum 5 real-world colors/material cues),
    3) One signature element unique to this product,
    4) Three obvious defaults to reject (including structural defaults).
  - Every proposal must reference those four outputs and explicitly state what replaces each default.

  Systemic consistency
  - Every visual decision must map back to intent and domain.
  - Use a coherent token architecture (foreground, background, border, brand, semantic).
  - Use a clear text hierarchy (primary, secondary, tertiary, muted).
  - Use a border progression scale rather than one border intensity.
  - Choose one depth strategy per interface (borders-only, subtle shadows, layered shadows, or surface color shifts) and do not mix.

  Craft checks before presenting work
  - Run and pass:
    - Swap test,
    - Squint test,
    - Signature test,
    - Token test.
  - If any check fails, iterate before showing results.

  Component-level checkpoint (required before writing UI code)
  - State:
    - Intent,
    - Palette and why it fits the product world,
    - Depth strategy and why,
    - Surface elevation scale and temperature,
    - Typography choice and why,
    - Spacing base unit.

  Avoid
  - Harsh borders, dramatic surface jumps, inconsistent spacing,
  - Mixed depth strategies, missing interaction/data states,
  - Decorative gradients/colors without meaning,
  - Multiple accent colors, arbitrary surface hue changes.

  Completion behavior
  - After completing interface work, offer:
    "Want me to save these patterns for future sessions?"
  - If yes, save to `.interface-design/system.md`:
    direction/feel, depth strategy, spacing base unit, and reusable component patterns.
---
