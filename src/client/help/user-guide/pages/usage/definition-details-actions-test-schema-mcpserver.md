## MCP Server structure (`mcpservers`)

- `transport` - optional transport type.
- `tools` - optional list of exposed tools.

```yaml
name: Browser MCP
dcc_uri: dcc://mcpservers/browser
description: Browser automation MCP server
transport: stdio
tools:
  - name: navigate
  - name: screenshot
```
