# Product Wishlist

> Note: This file tracks forward-looking ideas. Several earlier wishlist items are already implemented and marked accordingly.

## Already delivered (from earlier wishlist)
- ✅ Definition versioning/history with restore.
- ✅ Definition validation with history.
- ✅ Project profiles + context-aware recommendations.
- ✅ Prompt enhancement flow through `/v1/completions`.

## High-value next candidates

### 1) Dependency graph & relationship validation
- Build explicit reference graph between definitions.
- Show graph in UI.
- Warn/block save when required dependencies are missing.

### 2) Bulk operations in Hub
- Multi-select definitions.
- Batch save/remove/tag/publish actions.
- Batch status feedback.

### 3) Conflict resolution UX
- Rich conflict workflow for git pull/publish collisions.
- Side-by-side diff + guided accept/merge choices.

### 4) Advanced search
- Semantic search using embeddings.
- Similar-definition suggestions.
- Saved search filters.

### 5) Usage analytics
- Track definition usage frequency and recency by project.
- Surface stale/unused definitions.
- Show recommendation quality telemetry.

### 6) Template system
- Create definition from template.
- Team-shared templates with category browsing.

### 7) CLI companion
- Common flows in terminal:
  - `dcc sync`
  - `dcc suggest`
  - `dcc save <definition>`
  - `dcc publish <path>`

### 8) Multi-repository catalogs
- Manage more than one team source repository.
- Unified merged catalog with source-aware filtering.

### 9) Safer operations mode
- Dry-run/preview for save/remove/publish/delete operations.
- Show target file diffs before applying writes.

### 10) Team collaboration metadata
- Reviewer/approval state per definition.
- Comment threads and ownership history.
