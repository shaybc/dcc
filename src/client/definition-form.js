(function attachDefinitionFormApi(globalScope) {
  function parseTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  function parseSimpleYaml(raw) {
    const content = String(raw || "").replace(/\r\n/g, "\n");
    const fields = { tags: [], body: [] };
    const lines = content.split("\n");
    let i = 0;
    for (; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        break;
      }
      const keyMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!keyMatch) break;
      const [, key, value] = keyMatch;
      if (["name", "version", "schema", "description"].includes(key)) {
        fields[key] = value.trim().replace(/^['"]|['"]$/g, "");
      } else if (key === "tags") {
        fields.tags = parseTags(value);
      } else {
        break;
      }
    }
    fields.body = lines.slice(i).join("\n").trim();
    return fields;
  }

  function parseMarkdownAgentOrRule(raw) {
    const content = String(raw || "").replace(/\r\n/g, "\n");
    const fm = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fm) {
      return { name: "", description: "", tags: [], tools: "", rules: "", body: content.trim() };
    }
    const [, frontmatter, body] = fm;
    const fields = { name: "", description: "", tags: [], tools: "", rules: "", body: body.trim() };
    frontmatter.split("\n").forEach((line) => {
      const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!match) return;
      const [, key, value] = match;
      if (key === "tags") fields.tags = parseTags(value);
      else fields[key] = value.trim();
    });
    return fields;
  }

  function buildPromptYaml(state) {
    const tags = state.tags.filter(Boolean).join(", ");
    const prompts = state.prompts.length ? state.prompts : [{ name: "", description: "", prompt: "" }];
    const promptBlock = prompts.map((item) => `  - name: ${item.name || ""}\n    description: ${item.description || ""}\n    prompt: |\n${String(item.prompt || "").split("\n").map((line) => `      ${line}`).join("\n")}`).join("\n");
    return `name: ${state.name || ""}\nversion: ${state.version || ""}\nschema: ${state.schema || ""}\ndescription: ${state.description || ""}\ntags: ${tags}\n\nprompts:\n${promptBlock}`;
  }

  function buildMcpYaml(state) {
    const tags = state.tags.filter(Boolean).join(", ");
    const args = state.args.length ? state.args.map((arg) => `      - ${arg}`).join("\n") : "      - ";
    return `name: ${state.name || ""}\nversion: ${state.version || ""}\nschema: ${state.schema || ""}\ndescription: ${state.description || ""}\ntags: ${tags}\n\nmcpServers:\n  - name: ${state.serverName || ""}\n    command: ${state.command || ""}\n    args:\n${args}`;
  }

  function buildRuleMd(state) {
    const tags = state.tags.filter(Boolean).join(", ");
    return `---\nname: ${state.name || ""}\ndescription: ${state.description || ""}\ntags: ${tags}\n---\n\n${state.body || ""}`;
  }

  function buildAgentMd(state) {
    const tags = state.tags.filter(Boolean).join(", ");
    return `---\nname: ${state.name || ""}\ndescription: ${state.description || ""}\ntags: ${tags}\ntools: ${state.tools || ""}\nrules: ${state.rules || ""}\n---\n\n${state.body || ""}`;
  }

  function buildGenericYaml(state, sectionKey) {
    const tags = state.tags.filter(Boolean).join(", ");
    const section = state.sectionText || "  - ";
    return `name: ${state.name || ""}\nversion: ${state.version || ""}\nschema: ${state.schema || ""}\ndescription: ${state.description || ""}\ntags: ${tags}\n\n${sectionKey}:\n${section}`;
  }

  function templateForType(type) {
    if (type === "prompts") {
      return { name: "", version: "0.0.1", schema: "v1", description: "", tags: [], prompts: [{ name: "", description: "", prompt: "" }] };
    }
    if (type === "mcp servers") {
      return { name: "", version: "0.0.1", schema: "v1", description: "", tags: [], serverName: "", command: "", args: [""] };
    }
    if (type === "agents") {
      return { name: "", description: "", tags: [], tools: "", rules: "", body: "" };
    }
    if (type === "rules") {
      return { name: "", description: "", tags: [], body: "" };
    }
    return { name: "", version: "0.0.1", schema: "v1", description: "", tags: [], sectionText: "  - " };
  }

  function parseForType(type, raw) {
    if (!raw.trim()) return templateForType(type);
    if (["agents", "rules"].includes(type)) {
      return { ...templateForType(type), ...parseMarkdownAgentOrRule(raw) };
    }
    const parsed = parseSimpleYaml(raw);
    const base = templateForType(type);
    if (type === "prompts") {
      const promptMatch = raw.match(/prompts:\n\s*-\s*name:\s*([^\n]*)\n\s*description:\s*([^\n]*)\n\s*prompt:\s*\|\n([\s\S]*)$/m);
      base.prompts = promptMatch ? [{ name: promptMatch[1].trim(), description: promptMatch[2].trim(), prompt: promptMatch[3].replace(/^\s{6}/gm, "").trimEnd() }] : base.prompts;
    }
    if (type === "mcp servers") {
      const m = raw.match(/mcpServers:\n\s*-\s*name:\s*([^\n]*)\n\s*command:\s*([^\n]*)\n\s*args:\n([\s\S]*)$/m);
      if (m) {
        base.serverName = m[1].trim();
        base.command = m[2].trim();
        base.args = m[3].split("\n").map((line) => line.match(/-\s*(.*)$/)?.[1]?.trim()).filter(Boolean);
      }
    }
    return { ...base, ...parsed };
  }

  function buildYamlForType(type, state) {
    if (type === "prompts") return buildPromptYaml(state);
    if (type === "mcp servers") return buildMcpYaml(state);
    if (type === "agents") return buildAgentMd(state);
    if (type === "rules") return buildRuleMd(state);
    if (type === "models") return buildGenericYaml(state, "models");
    if (type === "workflows") return buildGenericYaml(state, "models");
    if (type === "context") return buildGenericYaml(state, "context");
    return buildGenericYaml(state, "data");
  }

  function renderDefinitionForm({ mode, type, initialContent, onSave, onCancel }) {
    const state = parseForType(type, initialContent || "");
    const container = document.createElement("div");
    container.className = "definition-form";

    const yamlArea = document.createElement("textarea");
    yamlArea.className = "definition-yaml-area";

    function syncYaml() {
      yamlArea.value = buildYamlForType(type, state);
    }

    function createInput(label, key, isArea = false) {
      const wrap = document.createElement("label");
      wrap.className = "definition-field";
      wrap.innerHTML = `<span>${label}</span>`;
      const el = isArea ? document.createElement("textarea") : document.createElement("input");
      el.value = state[key] || "";
      el.addEventListener("input", () => {
        state[key] = el.value;
        syncYaml();
      });
      wrap.appendChild(el);
      return wrap;
    }

    container.appendChild(createInput("name", "name"));
    if (type !== "agents" && type !== "rules") {
      container.appendChild(createInput("version", "version"));
      container.appendChild(createInput("schema", "schema"));
    }
    container.appendChild(createInput("description", "description", true));
    container.appendChild(createInput("tags (comma separated)", "tagsText"));
    const tagsInput = container.lastChild.querySelector("input");
    tagsInput.value = (state.tags || []).join(", ");
    tagsInput.addEventListener("input", () => {
      state.tags = parseTags(tagsInput.value);
      syncYaml();
    });

    if (type === "prompts") {
      const p = state.prompts[0] || { name: "", description: "", prompt: "" };
      state.prompts = [p];
      container.appendChild(createInput("prompt name", "promptName"));
      container.lastChild.querySelector("input").value = p.name;
      container.lastChild.querySelector("input").addEventListener("input", (e) => { state.prompts[0].name = e.target.value; syncYaml(); });
      container.appendChild(createInput("prompt description", "promptDescription"));
      container.lastChild.querySelector("input").value = p.description;
      container.lastChild.querySelector("input").addEventListener("input", (e) => { state.prompts[0].description = e.target.value; syncYaml(); });
      container.appendChild(createInput("prompt", "promptBody", true));
      container.lastChild.querySelector("textarea").value = p.prompt;
      container.lastChild.querySelector("textarea").addEventListener("input", (e) => { state.prompts[0].prompt = e.target.value; syncYaml(); });
    } else if (type === "mcp servers") {
      container.appendChild(createInput("server name", "serverName"));
      container.appendChild(createInput("command", "command"));
      container.appendChild(createInput("args (comma separated)", "argsText"));
      const argsInput = container.lastChild.querySelector("input");
      argsInput.value = (state.args || []).join(", ");
      argsInput.addEventListener("input", () => {
        state.args = parseTags(argsInput.value);
        syncYaml();
      });
    } else if (type === "agents") {
      container.appendChild(createInput("tools", "tools"));
      container.appendChild(createInput("rules", "rules"));
      container.appendChild(createInput("body", "body", true));
    } else if (type === "rules") {
      container.appendChild(createInput("body", "body", true));
    } else {
      container.appendChild(createInput("section content", "sectionText", true));
    }

    const yamlWrap = document.createElement("label");
    yamlWrap.className = "definition-field";
    yamlWrap.innerHTML = "<span>YAML/Markdown source</span>";
    yamlArea.addEventListener("paste", () => {
      requestAnimationFrame(() => {
        const parsedState = parseForType(type, yamlArea.value);
        Object.assign(state, parsedState);
      });
    });
    yamlArea.addEventListener("input", () => {
      const parsedState = parseForType(type, yamlArea.value);
      Object.assign(state, parsedState);
    });
    yamlWrap.appendChild(yamlArea);
    container.appendChild(yamlWrap);

    const actions = document.createElement("div");
    actions.className = "definition-form-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", onCancel);
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary";
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", async () => {
      await onSave(buildYamlForType(type, state), state);
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    container.appendChild(actions);

    syncYaml();
    return container;
  }

  globalScope.DccDefinitionForm = { renderDefinitionForm };
})(window);
