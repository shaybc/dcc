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

export function createModelForm({ mount, onChange }) {
  const state = {
    name: "",
    description: "",
    version: "",
    schema: "",
    tags: [],
    models: []
  };

  const name = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'Mistral Large'", onChange });
  const version = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '1.0.1'", onChange });
  const schema = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const description = createTextInput({ mount, label: "description", state, key: "description", placeholder: "e.g., 'mistral model description'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "tags",
    fields: [{ name: "value", label: "tags", placeholder: "e.g., 'tag1, tag2, tag3'" }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const models = createArrayEditor({
    mount,
    label: "models",
    fields: [
      { name: "name", label: "model name", placeholder: "e.g., 'Mistral Large'" },
      { name: "provider", label: "provider", placeholder: "e.g., 'mistral'" },
      { name: "model", label: "model", placeholder: "e.g., 'mistral-large-2411'" },
      { name: "apiKey", label: "API key", placeholder: "e.g., '${{ inputs.MISTRAL_API_KEY }}'" },
      { name: "roles", label: "roles", kind: "array", nestedFields: [{ name: "value", label: "role", placeholder: "e.g., 'chat'" }] },
      { name: "contextLength", label: "context length", placeholder: "e.g., '131000'" }
    ],
    onChange: (nextItems) => {
      state.models = nextItems;
      onChange();
    }
  });

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        models: models.getItems()
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
    }
  };
}
