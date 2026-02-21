## Agent structure (`agents`)

An `agent` definition is a reusable **worker profile** for agent-mode execution.

Think of it as the long-lived instructions and identity for a worker that can reason step-by-step, call tools (such as MCP tools), and complete multi-step tasks.

In DCC + Continue, an agent is selected explicitly (for example in IDE Agent mode or when running from the Continue CLI).

---

### Agent vs Prompt

Use an **agent** when you need a persistent worker behavior:

- has a stable persona/role (for example: "Senior Engineer", "Jira Triage Assistant")
- can execute end-to-end tasks with iterative reasoning
- can use tools and project context provided by the active config

Use a **prompt** when you need a reusable instruction template:

- usually a single task invocation
- typically lighter-weight and more command-like
- great for slash commands and repeatable one-shot instructions

Short version:

- **Prompt = what to ask now**
- **Agent = who is doing the work and how it behaves by default**

---

### How to run an agent from Continue CLI (with config)

1. Create/select an `agent` definition.
2. Create/select a `config` definition with `dcc_config_type: agents` that provides the models, rules, prompts, context, docs, and MCP servers the agent should run with.
3. Run the CLI with that config and target agent.

Example flow (command shape can vary slightly by Continue CLI version):

```bash
cn run --config .continue/agents/team/project_config.yaml --agent <agent-id-or-name> "<task>"
```

Example:

```bash
cn run --config .continue/agents/team/project_config.yaml --agent senior-engineer "Review this PR and propose a minimal fix plan"
```

> Tip: the config is the runtime assembly layer; the agent supplies behavior/persona instructions.

---

### Agent fields (and what each field means)

Agent definitions use the common DCC metadata fields plus the markdown body (agent instructions).

- `name` (**required**)
  - Human-friendly title shown in DCC/Continue UI.

- `dcc_uri` (**required**)
  - Stable unique identifier for this agent definition.

- `description` (**required**)
  - Short summary of the agent purpose and expected usage.

- `dcc_definition_type` (**required**)
  - Must be `agent`.

- `version` (optional)
  - Semantic version label for agent evolution.

- `schema` (optional)
  - Definition schema marker (for example `v1`).

- `dcc_tags` (optional)
  - Search/filter tags for discoverability.

- `invokable`, `key`, `type` (optional)
  - Additional metadata used by tooling/integration flows.

- `body` / markdown content (recommended)
  - Main agent instructions (persona, constraints, workflow preferences, quality bar, tool-use policy).

---

### Example

```markdown
---
name: Senior Engineer Agent
dcc_uri: dev/agents/senior-engineer
dcc_definition_type: agent
description: Agent persona for implementation and review
version: 1.0.0
schema: v1
dcc_tags:
  - engineering
  - review
---
You are a senior software engineer focused on safe, minimal, testable changes.

When solving tasks:
1. Clarify assumptions.
2. Prefer the smallest viable fix.
3. Run relevant tests before final output.
4. Summarize risks and rollback options.
```

> Note: Common metadata fields are also documented in [Common fields](/user-guide.html?page=definition-details-actions-test-schema-common).
