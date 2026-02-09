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

export function createPromptForm({ mount, onChange, availableTags = [] }) {
  const state = {
    name: "",
    dcc_uri: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    prompts: []
  };

  const nameInput = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'New Angular Component'", onChange });
  const dccUriInput = createTextInput({ mount, label: "DCC URI", state, key: "dcc_uri", placeholder: "e.g., 'prompts/new_component'", onChange });
  const versionInput = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '0.0.3'", onChange });
  const schemaInput = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const descriptionInput = createTextInput({ mount, label: "description", state, key: "description", placeholder: "e.g., 'the angular component description'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "dcc_tags",
    fields: [{ name: "value", label: "dcc_tags", placeholder: "e.g., 'tag1, tag2, tag3'", autocompleteOptions: availableTags }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const prompts = createArrayEditor({
    mount,
    label: "prompts",
    fields: [
      { name: "name", label: "prompt name", placeholder: "e.g., 'New Component'" },
      { name: "description", label: "prompt description", placeholder: "e.g., 'Create a new Angular component'" },
      {
        name: "prompt",
        label: "prompt text",
        multiline: true,
        placeholder: "e.g., 'Please create a new Angular component ...'",
        enablePromptEnhance: true,
        enhanceFieldLabel: "prompt text"
      }
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
      dccUriInput.value = state.dcc_uri || "";
      versionInput.value = state.version || "";
      schemaInput.value = state.schema || "";
      descriptionInput.value = state.description || "";
      tags.setItems(state.tags || []);
      prompts.setItems(state.prompts || []);
    }
  };
}
