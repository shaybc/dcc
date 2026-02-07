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

export function createPromptForm({ mount, onChange }) {
  const state = {
    name: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    prompts: []
  };

  const nameInput = createTextInput({ mount, label: "name", state, key: "name", onChange });
  const versionInput = createTextInput({ mount, label: "version", state, key: "version", onChange });
  const schemaInput = createTextInput({ mount, label: "schema", state, key: "schema", onChange });
  const descriptionInput = createTextInput({ mount, label: "description", state, key: "description", onChange });

  const tags = createArrayEditor({
    mount,
    label: "tags",
    fields: [{ name: "value", label: "Tag" }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const prompts = createArrayEditor({
    mount,
    label: "prompts",
    fields: [
      { name: "name", label: "name" },
      { name: "description", label: "description" },
      { name: "prompt", label: "prompt", multiline: true }
    ],
    onChange: (nextItems) => {
      state.prompts = nextItems;
      onChange();
    }
  });

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        prompts: prompts.getItems()
      };
    },
    setState(nextState) {
      Object.assign(state, nextState || {});
      nameInput.value = state.name || "";
      versionInput.value = state.version || "";
      schemaInput.value = state.schema || "";
      descriptionInput.value = state.description || "";
      tags.setItems(state.tags || []);
      prompts.setItems(state.prompts || []);
    }
  };
}
