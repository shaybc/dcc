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

export function createWorkflowForm({ mount, onChange, availableTags = [] }) {
  const state = {
    name: "",
    dcc_uri: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    models: [],
    context: [],
    mcpServers: [],
    rules: []
  };

  const name = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'Docs Update Workflow'", onChange });
  const dccUri = createTextInput({ mount, label: "DCC URI", state, key: "dcc_uri", placeholder: "e.g., 'workflows/docs_update'", onChange });
  const version = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '1.0.0'", onChange });
  const schema = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const description = createTextInput({ mount, label: "description", state, key: "description", placeholder: "e.g., 'the description of this workflow'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "dcc_tags",
    fields: [{ name: "value", label: "dcc_tags", placeholder: "e.g., 'tag1, tag2, tag3'", autocompleteOptions: availableTags }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const models = createArrayEditor({
    mount,
    label: "models",
    fields: [
      { name: "uses", label: "uses", placeholder: "e.g., 'anthropic/claude-4-sonnet'" },
      {
        name: "with",
        label: "with",
        kind: "array",
        nestedFields: [
          { name: "key", label: "environment variable", placeholder: "e.g., 'ANTHROPIC_API_KEY'" },
          { name: "value", label: "value", placeholder: "e.g., '${{ secrets.ANTHROPIC_API_KEY }}'" }
        ]
      },
      {
        name: "roles",
        label: "override.roles",
        kind: "array",
        nestedFields: [{ name: "value", label: "role", placeholder: "e.g., 'chat'" }]
      }
    ],
    onChange: (nextItems) => {
      state.models = nextItems;
      onChange();
    }
  });

  const context = createArrayEditor({
    mount,
    label: "context",
    fields: [{ name: "uses", label: "uses", placeholder: "e.g., 'continuedev/diff-context'" }],
    onChange: (nextItems) => {
      state.context = nextItems;
      onChange();
    }
  });

  const mcpServers = createArrayEditor({
    mount,
    label: "mcpServers",
    fields: [{ name: "uses", label: "uses", placeholder: "e.g., 'continuedev/context7-mcp-sse'" }],
    onChange: (nextItems) => {
      state.mcpServers = nextItems;
      onChange();
    }
  });

  const rules = createArrayEditor({
    mount,
    label: "rules",
    fields: [{ name: "uses", label: "uses", placeholder: "e.g., 'continuedev/continue-docs-standards'" }],
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
      dccUri.value = state.dcc_uri || "";
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
