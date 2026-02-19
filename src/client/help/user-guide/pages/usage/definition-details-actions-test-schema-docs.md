## Docs structure (`docs`)

Use `docs` when you want DCC to ingest one or more external documentation websites and make them available for search, selection, and downstream tooling.

- `docs` - required, non-empty list of documentation site objects.
- `docs[].name` (required) - human-readable name of the documentation source. This is what users will see in selectors and dropdowns, so keep it short and recognizable.
- `docs[].startUrl` (required) - entry-point URL where crawling begins (typically the docs home page, intro page, or section root).
- `docs[].favicon` (optional) - explicit URL for the site icon. If omitted, the favicon is resolved from `startUrl` using `/favicon.ico`.
- `docs[].useLocalCrawling` (optional) - when `true`, skips the default crawler and crawls only with the local crawler.

```yaml
name: My Config
version: 1.0.0
schema: v1
docs:
  - name: Continue
    startUrl: https://docs.continue.dev/intro
    favicon: https://docs.continue.dev/favicon.ico
    useLocalCrawling: true
```

Tip: if you are adding multiple doc sources, give each `name` a distinct, product-specific label so users can quickly identify the right source.
