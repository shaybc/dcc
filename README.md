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
npm start
```

Then open:
- UI: http://localhost:7331
- API: http://localhost:7331/api

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

