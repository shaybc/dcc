## Common fields

These fields appear in many definition schemas. Use this as a practical guide for what each field means and what value to provide.

`name` (**required**)
  - **What it is:** A clear, human-friendly title shown in DCC lists and detail views.
  - **What to fill in:** A short descriptive name that helps teammates understand intent at a glance.
  - **Tips:** Prefer specific names over generic ones.
  - **Example:** `"Code Review Assistant"`, `"Java API Docs Pack"`.

`dcc_uri` (**required**)
  - **What it is:** The unique, stable identifier for the definition.
  - **What to fill in:** A URI-style string that should remain constant even when the definition is updated.
  - **Tips:** Keep it globally unique and avoid changing it after publication, because installs and references depend on it.
  - **Example:** `"dev/agents/code-review-assistant"`.

`description` (**required**)
  - **What it is:** A short summary of what the definition does.
  - **What to fill in:** 1–2 sentences focused on behavior and use case.
  - **Tips:** Start with an action verb when possible (`Generates...`, `Validates...`, `Provides...`).
  - **Example:** `"Generates concise pull request summaries with risk and test-impact notes."`

`version` (optional)
  - **What it is:** The release/version label for this definition.
  - **What to fill in:** A semantic version (`major.minor.patch`) whenever possible.
  - **Tips:** Bump the version whenever behavior/config changes in a meaningful way.
  - **Example:** `"1.3.0"`.

`schema` (optional)
  - **What it is:** The schema contract this definition follows.
  - **What to fill in:** The schema identifier expected by your tooling/workflow.
  - **Tips:** Keep this aligned with the definition type and validation rules of Continue.dev schema version.
  - **Example:** `"v1"`.

`dcc_tags` (optional)
  - **What it is:** Search/filter tags that categorize the definition.
  - **What to fill in:** A list of short keywords (or a single tag string if supported).
  - **Tips:** Use consistent vocabulary across your team (for example `frontend`, `security`, `docs`).
  - **Example:** `["assistant", "review", "quality"]`.
