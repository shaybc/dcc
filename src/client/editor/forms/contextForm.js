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

export function createContextForm({ mount, onChange }) {
  const state = {
    name: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    context: []
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

  const context = createArrayEditor({
    mount,
    label: "context",
    fields: [
      { name: "provider", label: "provider" },
      { name: "url", label: "params.url" },
      { name: "headers", label: "params.headers", kind: "array", itemLabel: "Header (Key: Value)" },
      { name: "stackDepth", label: "params.stackDepth" },
      { name: "onlyPinned", label: "params.onlyPinned" }
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
