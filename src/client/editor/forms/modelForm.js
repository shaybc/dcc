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

export function createModelForm({ mount, onChange }) {
  const state = {
    name: "",
    description: "",
    version: "",
    schema: "",
    tags: [],
    models: []
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
      { name: "name", label: "name" },
      { name: "provider", label: "provider" },
      { name: "model", label: "model" },
      { name: "apiKey", label: "apiKey" },
      { name: "roles", label: "roles", kind: "array", itemLabel: "Role" },
      { name: "contextLength", label: "defaultCompletionOptions.contextLength" }
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
