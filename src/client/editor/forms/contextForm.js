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

export function createContextForm({ mount, onChange }) {
  const state = {
    name: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    context: []
  };

  const name = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., '@Clipboard'", onChange });
  const version = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '1.0.0'", onChange });
  const schema = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const description = createTextInput({ mount, label: "description", state, key: "description", placeholder: "e.g., 'Reference recent clipboard items'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "tags",
    fields: [{ name: "value", label: "tags", placeholder: "e.g., 'tag1, tag2, tag3'" }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const context = createArrayEditor({
    mount,
    label: "context",
    fields: [
      { name: "provider", label: "provider", placeholder: "e.g., 'http'" },
      { name: "url", label: "params.url", placeholder: "e.g., 'https://api.example.com/v1/users'" },
      {
        name: "headers",
        label: "params.headers",
        kind: "array",
        nestedFields: [{ name: "value", label: "header", placeholder: "e.g., 'Authorization: Bearer <token>'" }]
      }
    ],
    onChange: (nextItems) => {
      state.context = nextItems;
      onChange();
    }
  });

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        context: context.getItems()
      };
    },
    setState(nextState) {
      Object.assign(state, nextState || {});
      name.value = state.name || "";
      version.value = state.version || "";
      schema.value = state.schema || "";
      description.value = state.description || "";
      tags.setItems(state.tags || []);
      context.setItems(state.context || []);
    }
  };
}
