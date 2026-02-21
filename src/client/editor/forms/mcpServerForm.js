import { createArrayEditor } from "../components/arrayEditor.js";

function createTextInput({ mount, label, state, key, placeholder, onChange, multiline = false }) {
  const row = document.createElement("label");
  row.className = "editor-field";
  row.innerHTML = `<span>${label}</span>`;
  const input = multiline ? document.createElement("textarea") : document.createElement("input");
  if (!multiline) {
    input.type = "text";
  }
  input.placeholder = placeholder || "";
  input.addEventListener("input", () => {
    state[key] = input.value;
    onChange();
  });
  row.append(input);
  mount.append(row);
  return input;
}

export function createMcpServerForm({ mount, onChange, availableTags = [] }) {
  const state = {
    name: "",
    dcc_uri: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    mcpServers: []
  };

  const nameInput = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'Playwright MCP'", onChange });
  const dccUriInput = createTextInput({ mount, label: "DCC URI", state, key: "dcc_uri", placeholder: "e.g., 'mcp_servers/playwright'", onChange });
  const versionInput = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '1.0.0'", onChange });
  const schemaInput = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const descriptionInput = createTextInput({ mount, label: "description", state, key: "description", multiline: true, placeholder: "e.g., 'this is a playwrite mcp server description'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "dcc_tags",
    fields: [{ name: "value", label: "dcc_tags", placeholder: "e.g., 'tag1, tag2, tag3'", autocompleteOptions: availableTags }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const servers = createArrayEditor({
    mount,
    label: "mcpServers",
    fields: [
      { name: "name", label: "server name", placeholder: "e.g., 'Playwright MCP'" },
      { name: "command", label: "command", placeholder: "e.g., 'npx'" },
      { name: "args", label: "args", kind: "array", nestedFields: [{ name: "value", label: "argument", placeholder: "e.g., '@playwright/mcp@latest'" }] }
    ],
    onChange: (nextItems) => {
      state.mcpServers = nextItems;
      onChange();
    }
  });

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        mcpServers: servers.getItems()
      };
    },
    setState(nextState) {
      Object.assign(state, nextState || {});
      nameInput.value = state.name || "";
      dccUriInput.value = state.dcc_uri || "";
      versionInput.value = state.version || "";
      schemaInput.value = state.schema || "";
      descriptionInput.value = state.description || "";
      tags.setItems(state.tags || []);
      servers.setItems(state.mcpServers || []);
    }
  };
}
