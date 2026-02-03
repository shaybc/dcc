# Developer Control Center (DCC) - Node.js

Local server + web UI to:
- Manage Continue definitions stored in a Bitbucket repo (via PR-based workflow; scaffolded here)
- Create Bitbucket Data Center pull requests for the current git branch
- Track workflow/prompt/agent run history locally (SQLite)
- Provide an IDE-agnostic UI (basic)

## Requirements
- Node.js 18+ (for native fetch + ESM)
- Git installed and available on PATH
- Access to Bitbucket Data Center (Basic Auth: username/password)

## Setup
```bash
copy .env.example .env
npm install
npm run db:migrate
npm run build:ui
npm start
```

Then open:
- UI: http://localhost:7331
- API: http://localhost:7331/api

If the server is running, open the UI in your browser at `http://localhost:7331`.

## UI build workflow (same-origin)
The Angular UI lives in `dcc_hub`. For local development without CORS or a proxy, build the UI and serve it from the Express server so both the UI and API share the same origin.

```bash
npm run build:ui
npm run dev
```

This serves the built Angular assets from the Node server at the same base URL as `/api`.

## What works now
- Run history stored locally in SQLite
- List workflows (scaffold)
- Start a workflow run (scaffold)
- Create a Bitbucket PR for the current branch (real; requires Bitbucket DC + correct repo parsing)

## What is scaffolded (placeholders)
- Full config editing with PR creation against the config registry repo
- Full workflow runner with AI steps (OpenAI shim integration) and deterministic tools like OpenRewrite

## Security notes
- If `DCC_AUTH_TOKEN` is set, every request must include header `x-dcc-token: <token>`.
- Passwords should not be stored in plain text. Prefer using environment injection or OS keychain.



## What this project does

This project is a local web server called Developer Control Center (DCC). It provides a web interface and an API to help developers with their workflows.

Key features include:
- **Configuration Management**: It helps manage "Continue definitions" which are stored in a Bitbucket repository. Changes are managed through a pull-request-based workflow.
- **Bitbucket Integration**: It can create Pull Requests in Bitbucket Data Center for the current Git branch.
- **Workflow Tracking**: It keeps a history of workflow runs, storing the data locally in a SQLite database.
- **IDE Agnostic UI**: It offers a basic web UI that can be used from any environment, independent of a specific IDE.

## API Endpoints

The server exposes the following REST API endpoints under the `/api` prefix.

### OpenAI Compatible Shim API

These endpoints provide an OpenAI-compatible interface that internally connects to Gemini. This allows tools like Continue to use the DCC server as a local AI proxy.

- `GET /api/openai/models`
  - Lists available AI models.
- `POST /api/openai/completions`
  - Creates a legacy text completion (for `text-` models).
- `POST /api/openai/chat/completions`
  - Creates a chat-based completion, supporting streaming and function calling.
- `POST /api/openai/embeddings`
  - Generates vector embeddings for a given text input.

### DCC APIs

These endpoints are specific to the Developer Control Center's functionality.

- `GET /api/ai-calls`
  - Lists a history of AI calls made through the server.
- `GET /api/ai-calls/:id`
  - Retrieves details for a single AI call by its ID.
- `GET /api/configs`
  - Lists available Continue definitions from the config repository.
- `POST /api/pr/create`
  - Creates a Bitbucket Data Center pull request for the current git branch.
- `GET /api/runs`
  - Lists historical workflow runs.
- `GET /api/runs/:id`
  - Retrieves details for a single workflow run by its ID.
- `GET /api/workflows`
  - Lists all available workflows.
- `POST /api/workflows/:id/run`
  - Starts a new run for a specific workflow.
