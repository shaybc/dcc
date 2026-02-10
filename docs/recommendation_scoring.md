# Recommendation Scoring Map

The recommendation scorer uses a project-type profile to apply deterministic boosts.

## Default project profiles

- `node`
  - tags: `typescript`, `npm`, `eslint`, `jest`
  - keywords: `typescript`, `npm`, `eslint`, `jest`
- `python`
  - tags: `pytest`, `ruff`, `poetry`, `fastapi`
  - keywords: `pytest`, `ruff`, `poetry`, `fastapi`

## Behavior

- Scores are additive.
- Explanations are emitted as `reasons` for each matched signal.
- Results are sorted deterministically by score, then name/key/index.
- Only positive-score entries are returned.
