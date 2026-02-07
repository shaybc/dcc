import { createArrayEditor } from "../components/arrayEditor.js";

function createTextInput({ mount, label, state, key, onChange }) {
  const row = document.createElement("label");
  row.className = "editor-field";
  row.innerHTML = `<span>${label}</span>`;
  const input = document.createElement("input");
  input.type = "text";
  input.addEventListener("input", () => {
    state[key] = input.value;
    onChange();
  });
  row.append(input);
  mount.append(row);
  return input;
}

export function createWorkflowForm({ mount, onChange }) {
  const state = {
    name: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    models: [],
    context: [],
    mcpServers: [],
    rules: []
  };

  const name = createTextInput({ mount, label: "name", state, key: "name", onChange });
  const version = createTextInput({ mount, label: "version", state, key: "version", onChange });
  const schema = createTextInput({ mount, label: "schema", state, key: "schema", onChange });
  const description = createTextInput({ mount, label: "description", state, key: "description", onChange });

  const tags = createArrayEditor({
    mount,
    label: "tags",
    fields: [{ name: "value", label: "Tag" }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const models = createArrayEditor({
    mount,
    label: "models",
    fields: [
      { name: "uses", label: "uses" },
      { name: "withAnthropicApiKey", label: "with.ANTHROPIC_API_KEY" },
      { name: "roles", label: "override.roles", kind: "array", itemLabel: "role" }
    ],
    onChange: (nextItems) => {
      state.models = nextItems;
      onChange();
    }
  });

  const context = createArrayEditor({
    mount,
    label: "context",
    fields: [{ name: "uses", label: "uses" }],
    onChange: (nextItems) => {
      state.context = nextItems;
      onChange();
    }
  });

  const mcpServers = createArrayEditor({
    mount,
    label: "mcpServers",
    fields: [{ name: "uses", label: "uses" }],
    onChange: (nextItems) => {
      state.mcpServers = nextItems;
      onChange();
    }
  });

  const rules = createArrayEditor({
    mount,
    label: "rules",
    fields: [{ name: "uses", label: "uses" }],
    onChange: (nextItems) => {
      state.rules = nextItems;
      onChange();
    }
  });

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        models: models.getItems(),
        context: context.getItems(),
        mcpServers: mcpServers.getItems(),
        rules: rules.getItems()
      };
    },
    setState(nextState) {
      Object.assign(state, nextState || {});
      name.value = state.name || "";
      version.value = state.version || "";
      schema.value = state.schema || "";
      description.value = state.description || "";
      tags.setItems(state.tags || []);
      models.setItems(state.models || []);
      context.setItems(state.context || []);
      mcpServers.setItems(state.mcpServers || []);
      rules.setItems(state.rules || []);
    }
  };
}
