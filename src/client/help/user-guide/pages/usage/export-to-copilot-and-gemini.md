# Export to Copilot and Gemini

Use this flow when you want to project Continue definitions into destination-specific files for **GitHub Copilot** or **Gemini CLI**.

> Recommendation: keep DCC/Continue definitions as your source of truth and treat exported destination files as generated outputs.

## Before you export

1. Select the target dev project in the Hub header.
2. Open a definition in **Definition details**.
3. In **Destination**, choose:
   - **GitHub Copilot**, or
   - **Gemini CLI**.

Then click **Install definition in current project** to run export for that definition.

## v1 supported types per destination

For v1 destination export, both destinations support:

- `rules`
- `prompts`

## Output locations

### GitHub Copilot

- Rules are written to:
  - `.github/copilot-instructions.md`
- Prompts are written to:
  - `.github/prompts/<dcc-uri-slug>.prompt.md`

### Gemini CLI

- Rules are written to:
  - `.gemini/instructions.md`
- Prompts are written to:
  - `.gemini/commands/<dcc-uri-slug>.md`

## What gets skipped in v1 (and why)

Definitions with types outside `rules` and `prompts` are skipped for Copilot/Gemini export in v1.

Why:

- Their destination-specific format mappings are not finalized yet.
- Skipping avoids accidental lossy conversions or ambiguous output files.

## Idempotent update behavior

Export is designed to be safe to run repeatedly.

- **Rules** are managed as DCC-marked blocks in the destination instructions file.
  - Re-export updates/replaces the same managed block.
  - It does not append duplicate blocks for the same definition.
- **Prompts** are generated to a stable file path derived from the DCC URI slug.
  - Re-export overwrites that same file.

This means you can export after every definition edit without manually cleaning up duplicate artifacts.

## Source-of-truth guidance

Keep authoring and reviewing in Continue definitions inside DCC.

- Version and governance stay centralized.
- Destination files remain derived artifacts.
- Re-export whenever definitions change to keep Copilot/Gemini outputs aligned.
