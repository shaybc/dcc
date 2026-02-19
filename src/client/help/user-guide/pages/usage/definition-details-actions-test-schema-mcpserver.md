## MCP Server structure (`mcpservers`)

In addition to [common fields](/user-guide.html?page=definition-details-actions-test-schema-common), MCP server definitions support the following properties:

- `type` - optional transport type: `sse`, `stdio`, or `streamable-http`.
- `transport` - optional legacy alias for transport type.
- `command` - command used to start a local MCP server.
- `args[]` - optional argument list passed to `command`.
- `url` - endpoint URL for remote MCP servers (`sse` or `streamable-http`).
- `env` - optional environment variables (including secret references).
- `tools[]` - optional list of exposed tools.

### Example: local stdio server

```yaml
name: Browser MCP
version: 0.0.1
schema: v1
dcc_uri: dcc://mcpservers/browser
description: Browser automation MCP server
type: stdio
command: npx
args:
  - "@playwright/mcp@latest"
env:
  PLAYWRIGHT_BROWSERS_PATH: /tmp/playwright
tools:
  - name: navigate
  - name: screenshot
```

### Example: remote SSE server

```yaml
name: Docs MCP
version: 0.0.1
schema: v1
dcc_uri: dcc://mcpservers/docs
type: sse
url: https://example.com/mcp/events
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
```
