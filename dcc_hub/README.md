# DCC Hub

A standalone Angular SPA that mimics the Continue Hub experience. It reads Continue definitions from a locally cloned `ai_assets` folder using the browser's File System Access API and stores selections in `localStorage`.

## Requirements

- Node 18+
- Angular CLI 17 (installed via `npm install` in this project)

## Getting started

```bash
cd dcc_hub
npm install
npm start
```

## Loading ai_assets

1. Click **Load ai_assets**.
2. Choose the root of the cloned `ai_assets` repository.
3. Definitions are cached in `localStorage` for offline access.

## Notes

- The app scans for JSON definition files and infers type from folder names such as `models`, `rules`, and `mcp`.
- If no data is found, a small sample dataset is displayed.
