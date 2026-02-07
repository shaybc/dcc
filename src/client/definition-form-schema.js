(function initDefinitionFormSchema() {
  const TYPE_CONFIG = {
    prompts: { label: "Prompt", format: "yaml", rootListKey: "prompts", rootListFields: ["name", "description", "prompt"] },
    "mcp servers": { label: "MCP Server", format: "yaml", rootListKey: "mcpServers", rootListFields: ["name", "command", "args"] },
    agents: { label: "Agent", format: "markdown", bodyLabel: "Instructions" },
    rules: { label: "Rule", format: "markdown", bodyLabel: "Rule Content" },
    models: { label: "Model", format: "yaml", rootListKey: "models", rootListFields: ["name", "provider", "model", "apiKey", "roles", "defaultCompletionOptions"] },
    workflows: { label: "Workflow", format: "yaml", specialSections: ["models", "context", "mcpServers", "rules"] },
    context: { label: "Context", format: "yaml", rootListKey: "context", rootListFields: ["provider", "params"] }
  };

  function stringifyValue(value, indent = 0) {
    if (Array.isArray(value)) {
      return value.map((entry) => `${" ".repeat(indent)}- ${typeof entry === "string" ? entry : ""}${typeof entry === "object" && entry ? `\n${stringifyObject(entry, indent + 2)}` : ""}`).join("\n");
    }
    if (value && typeof value === "object") {
      return stringifyObject(value, indent);
    }
    return String(value ?? "");
  }

  function stringifyObject(obj, indent = 0) {
    return Object.entries(obj || {})
      .filter(([, value]) => value !== "" && value != null && (!Array.isArray(value) || value.length > 0))
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          const lines = value.map((entry) => {
            if (typeof entry === "object" && entry) {
              const [firstKey, firstValue] = Object.entries(entry)[0] || ["", ""];
              const firstLine = `${" ".repeat(indent + 2)}- ${firstKey}: ${String(firstValue || "")}`;
              const rest = Object.entries(entry).slice(1).map(([nestedKey, nestedValue]) => {
                if (typeof nestedValue === "string" && nestedValue.includes("\n")) {
                  return `${" ".repeat(indent + 4)}${nestedKey}: |\n${nestedValue.split("\n").map((line) => `${" ".repeat(indent + 6)}${line}`).join("\n")}`;
                }
                if (Array.isArray(nestedValue)) {
                  return `${" ".repeat(indent + 4)}${nestedKey}:\n${nestedValue.map((item) => `${" ".repeat(indent + 6)}- ${item}`).join("\n")}`;
                }
                if (nestedValue && typeof nestedValue === "object") {
                  return `${" ".repeat(indent + 4)}${nestedKey}:\n${stringifyObject(nestedValue, indent + 6)}`;
                }
                return `${" ".repeat(indent + 4)}${nestedKey}: ${String(nestedValue ?? "")}`;
              }).join("\n");
              return [firstLine, rest].filter(Boolean).join("\n");
            }
            return `${" ".repeat(indent + 2)}- ${entry}`;
          }).join("\n");
          return `${" ".repeat(indent)}${key}:\n${lines}`;
        }
        if (value && typeof value === "object") {
          return `${" ".repeat(indent)}${key}:\n${stringifyObject(value, indent + 2)}`;
        }
        return `${" ".repeat(indent)}${key}: ${String(value)}`;
      })
      .join("\n");
  }

  function parseSimpleYaml(raw) {
    const result = {};
    const lines = String(raw || "").replace(/\r\n/g, "\n").split("\n");
    for (const line of lines) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!m) continue;
      const [, key, value] = m;
      if (["name", "version", "schema", "description", "tags"].includes(key)) result[key] = value.trim();
    }
    const tags = String(result.tags || "").split(",").map((x) => x.trim()).filter(Boolean);
    const extraIndex = lines.findIndex((line) => !line.trim());
    const extra = extraIndex >= 0 ? lines.slice(extraIndex + 1).join("\n").trim() : "";
    return { ...result, tags, extra: { raw: extra } };
  }

  function parseMarkdownFrontmatter(raw) {
    const text = String(raw || "").replace(/\r\n/g, "\n");
    const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const data = { body: text };
    if (!match) return data;
    const [, header, body] = match;
    for (const line of header.split("\n")) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!m) continue;
      const [, key, value] = m;
      data[key] = value.trim();
    }
    data.tags = String(data.tags || "").split(",").map((x) => x.trim()).filter(Boolean);
    data.body = body.trim();
    return data;
  }

  function serialize({ type, values }) {
    const cfg = TYPE_CONFIG[type];
    if (!cfg) return "";
    if (cfg.format === "markdown") {
      const header = {
        name: values.name || "",
        description: values.description || "",
        tags: (values.tags || []).join(", "),
        ...(type === "agents" ? { tools: values.tools || "", rules: values.rules || "" } : {})
      };
      return `---\n${stringifyObject(header)}\n---\n\n${values.body || ""}`;
    }

    const base = {
      name: values.name || "",
      version: values.version || "",
      schema: values.schema || "v1",
      description: values.description || "",
      tags: (values.tags || []).join(", ")
    };
    const extraRaw = String(values.extra?.raw || "").trim();
    return [stringifyObject(base), extraRaw].filter(Boolean).join("\n\n");
  }

  window.DefinitionFormSchema = {
    TYPE_CONFIG,
    parseSimpleYaml,
    parseMarkdownFrontmatter,
    serialize
  };
})();
