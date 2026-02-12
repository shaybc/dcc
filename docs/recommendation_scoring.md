# Recommendation Scoring

This document describes how `/api/definitions/suggestions` ranks definitions.

## Inputs

The scorer receives:
- current project path (from `currentDevProject` setting),
- current project type (from `dev_projects.projectType`),
- project technologies (from `dev_projects.projectTechnologies` and detected signals),
- candidate definitions (`id`, `key`, `name`, `description`, `tags`, `type`).

## Project profiles

Current built-in recommendation profiles exist for:
- `node`
- `python`

Each profile contains weighted boosts for:
- definition types,
- tags,
- keywords.

### Node profile
- definitionTypes: `configs`, `workflows`, `prompts`
- tags/keywords: `typescript`, `npm`, `eslint`, `jest`

### Python profile
- definitionTypes: `configs`, `workflows`, `prompts`
- tags/keywords: `pytest`, `ruff`, `poetry`, `fastapi`

## Match signals and base weights

Base multipliers:
- `projectType`: **6**
- `projectTypeContext`: **5**
- `definitionType`: **4**
- `tag`: **3**
- `projectTechnologyTag`: **3**
- `keyword`: **2**
- `dccMetadata`: **2**
- `projectTechnologyKeyword`: **2**
- `projectTechnologyMetadata`: **2**
- `projectPathTag`: **2**
- `projectPathKeyword`: **1**

## How scoring works

For each candidate definition:
1. Normalize tokens to lowercase (including splitting hyphenated values like `acme-portal` into `acme` and `portal`).
2. Add score for exact projectType/type match.
3. Add profile definition-type boosts.
4. Add boosts for matching tags.
5. Add boosts for matching keywords in `name + description`.
6. Add boosts for matching `dcc_*` metadata tokens if present.
7. Add boosts when project technologies (languages/frameworks detected during project scan) match tags, text, or metadata.
8. Add small boosts when project path tokens appear in `name + description`.
9. Add boosts when project path tokens appear in definition tags.

Each positive match appends a human-readable entry into `reasons`.

## Output behavior

- Only definitions with `score > 0` are candidates.
- Candidates are then ordered in stages:
  1. definitions matching the inferred project core platform (`web`, `mobile`, or `backend`),
  2. definitions matching detected project technologies,
  3. up to 3 fallback items from remaining scored candidates.
- Within each stage, sorting is deterministic by:
  1. higher `score`,
  2. `name` ascending,
  3. `key` ascending,
  4. original list order.

## Response shape

The API maps ranked items to:
- `definitionId`
- `score`
- `reasons[]`

along with top-level context:
- `projectPath`
- `projectType`
