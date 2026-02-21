## Agent structure (`agents`)

Agent definition is a complete worker configuration. It defines an agent (models + tools + rules + prompts/context) to execute a workflow end-to-end.

they are explicitly chosen to run (IDE agent mode / cn CLI run). It defines what rules/tools/models are in play for that run.

- Uses common fields only in schema checks.

```yaml
name: Senior Engineer Agent
dcc_uri: dev/agents/senior-engineer
description: Agent persona for implementation and review
invokable: true
```
