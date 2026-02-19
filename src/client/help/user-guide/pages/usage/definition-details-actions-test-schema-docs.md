## Docs structure (`docs`)

- `docs` - required non-empty list of doc source objects.
- `docs[].name` - required display name.
- `docs[].startUrl` - required valid URL.
- `docs[].favicon` - optional valid URL.

```yaml
name: Platform Docs
dcc_uri: dcc://docs/platform
description: External documentation sources
docs:
  - name: API Reference
    startUrl: https://example.com/docs/api
    favicon: https://example.com/favicon.ico
```
