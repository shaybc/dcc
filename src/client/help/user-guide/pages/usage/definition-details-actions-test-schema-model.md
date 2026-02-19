## Model structure (`models`)

A model definition can be written as either:

- **Single entry fields** on one document (`provider`, `model`, etc.).
- A **pack-style document** using top-level `version`, `schema`, and a `models` array.

Supported model fields include:

- `provider` - optional model provider name.
- `model` - optional model identifier.
- `apiKey` - optional provider API key input reference.
- `env` - optional provider environment/auth configuration object.
- `roles` - optional list of supported roles (for example: `chat`, `edit`, `apply`).
- `defaultCompletionOptions` - optional default completion config (for example: `contextLength`, `maxTokens`).
- `capabilities` - optional list of model capabilities (for example: `tool_use`, `image_input`).

### Single model definition example

```yaml
name: GPT-5.2 Codex
dcc_uri: dev/models/gpt-5-2-codex
description: Primary coding model
provider: openai
model: gpt-5.2-codex
apiKey: ${{ inputs.OPENAI_API_KEY }}
roles:
  - chat
  - edit
  - apply
defaultCompletionOptions:
  contextLength: 400000
  maxTokens: 128000
capabilities:
  - tool_use
```

### Pack-style model definition example

```yaml
name: Claude Sonnet 4
version: 1.0.5
schema: v1
models:
  - name: Claude Sonnet 4
    provider: bedrock
    model: us.anthropic.claude-sonnet-4-20250514-v1:0
    env:
      region: ${{ inputs.AWS_REGION }}
      profile: ${{ inputs.AWS_PROFILE }}
      accessKeyId: ${{ inputs.AWS_ACCESS_KEY_ID }}
      secretAccessKey: ${{ inputs.AWS_SECRET_ACCESS_KEY }}
    roles:
      - chat
      - edit
      - apply
    defaultCompletionOptions:
      contextLength: 200000
    capabilities:
      - tool_use
      - image_input
```
