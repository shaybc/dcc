# Developer Control Center (DCC)
## Local, Team-Governed AI Control Plane for Continue + Bitbucket Data Center

---

## 1. Goal

Build a **local-first “Developer Control Center” (DCC)** that acts as the **central governance, execution, and PR automation layer** for AI-assisted development, while:

- Keeping **Continue un-forked** (or minimally touched)
- Supporting **Bitbucket Data Center** (username/password auth)
- Allowing developers to use **any IDE** (VS Code, JetBrains, others)
- Allowing developers to use **other AI tools in parallel** (Copilot, Gemini CLI, etc.)
- Enforcing **team-wide prompts, agents, workflows, and guardrails**
- Using **organization-approved Gemini REST API** (via a shim if needed)
- Running **entirely locally per developer machine**
- Being **future-proof** for GitHub/cloud migration

The DCC is **not** an IDE plugin.  
It is a **local server + web UI** that coordinates Continue configs, AI workflows, and PR creation.

---

## 2. Non-Goals

- Replacing Continue IDE UX
- Rebuilding Continue’s cloud Mission Control
- Central multi-user orchestration across machines (each dev runs their own DCC)
- Logging every IDE keystroke or Continue chat interaction

---

## 3. High-Level Concept

- Continue remains unchanged
- Continue reads shared, versioned configs from a Bitbucket repo via `configPath`
- DCC manages that repo, workflows, PRs, and run history
- DCC optionally runs AI workflows locally and produces commits/PRs
- DCC integrates with Bitbucket Data Center via REST
- AI access goes through a local OpenAI-compatible shim that calls org Gemini REST

---

## 4. Feature List

### 4.1 Configuration Governance
- Create / edit / delete / view prompts, agents, workflows, rules
- All configs stored as code in Bitbucket
- Changes submitted via PRs
- Schema validation before PR creation
- Versioning via git tags / commits

### 4.2 Developer UX (Web UI)
- View available prompts / agents / workflows
- Run workflows locally
- See workflow execution history
- Create PR from current working branch
- View PR links created by DCC
- Sync configs (git pull)

### 4.3 AI Workflow Execution
- Pipeline-based execution
- Deterministic steps preferred (OpenRewrite)
- AI used for planning, glue, documentation

### 4.4 Bitbucket PR Automation
- Create PR for current or generated branch
- Auto-generate PR title/body
- Optional reviewers
- Link PR to workflow run

### 4.5 Run History & Auditing
- Local SQLite DB
- Track workflow version, repo, branch, status, PR URL

---

## 5. Architecture

See original specification for full architecture diagram and explanation.

---

## 6. Continue Integration (No Fork)

- Use ~/.continue/config.json with configPath
- Disable cloud usage by not authenticating Mission Control
- Use OpenAI-compatible shim for Gemini access

---

## 7. Repo Structure

continue-configs-repo/
  .continue/
    config.yaml
    prompts/
    agents/
    workflows/
    rules/
    tools/
    schemas/

---

## 8. Bitbucket Data Center Integration

- REST API under /rest/api/1.0
- HTTP Basic Auth (username + password)
- PR creation handled by DCC

---

## 9. AI Integration

- Local OpenAI-compatible shim
- Maps to org Gemini REST
- Used by Continue and DCC

---

## 10. Workflow Execution

- YAML-defined pipelines
- Patch-first, commit-last
- Abort on validation errors

---

## 11. Upstream Maintainability

- No Continue fork required
- Use configPath and external services
- Fork only if absolutely required

---

## 12. Minimal Internal APIs

GET  /api/configs
POST /api/configs/pr
POST /api/workflows/{id}/run
GET  /api/runs
POST /api/pr/create

---

## 13. Summary

This document defines the authoritative design for implementing the Developer Control Center.
