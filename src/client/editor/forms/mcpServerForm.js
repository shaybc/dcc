import { createArrayEditor } from "../components/arrayEditor.js";

function createTextInput({ mount, label, state, key, placeholder, onChange }) {
  const row = document.createElement("label");
  row.className = "editor-field";
  row.innerHTML = `<span>${label}</span>`;
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder || "";
  input.addEventListener("input", () => {
    state[key] = input.value;
    onChange();
  });
  row.append(input);
  mount.append(row);
  return input;
}

export function createMcpServerForm({ mount, onChange }) {
  const state = {
    name: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    mcpServers: []
  };

  const nameInput = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'Playwright MCP'", onChange });
  const versionInput = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '0.0.1'", onChange });
  const schemaInput = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const descriptionInput = createTextInput({ mount, label: "description", state, key: "description", placeholder: "e.g., 'this is a playwrite mcp server description'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "tags",
    fields: [{ name: "value", label: "tags", placeholder: "e.g., 'tag1, tag2, tag3'" }],
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
      versionInput.value = state.version || "";
      schemaInput.value = state.schema || "";
      descriptionInput.value = state.description || "";
      tags.setItems(state.tags || []);
      servers.setItems(state.mcpServers || []);
    }
  };
}
