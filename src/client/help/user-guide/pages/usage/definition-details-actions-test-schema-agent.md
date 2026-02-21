## Agent structure (`agents`)

Agent definitions are Markdown files with YAML frontmatter. Validation checks this frontmatter and ensures the Markdown body (system prompt) is present.

### Required frontmatter

- `name` (**required**) - Display name shown in UI and check output.
- `description` (**required**) - Short summary of what the agent does.

### Optional frontmatter

- `model` - Model override for this agent.
- `rules` - Rule references the agent should apply.
- `mcpServers` - MCP server references available to the agent.
- `tools` - Tool configuration for local/CLI usage.

```markdown
---
name: Conventional Title
description: Updates PR title to follow conventional commit format
model: claude-3-7-sonnet
rules:
  - rules/conventional-commits
mcpServers:
  - mcpservers/github
---

You are reviewing a pull request to format its title according to conventional commit standards.

## Your Task

1. Fetch PR metadata.
2. Analyze the diff and determine a conventional type.
3. Update the PR title only if needed.
```
