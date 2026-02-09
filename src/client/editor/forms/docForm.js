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

export function createDocForm({ mount, onChange, availableTags = [] }) {
  const state = {
    name: "",
    dcc_uri: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    docs: []
  };

  const name = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'Continue Documentation'", onChange });
  const dccUri = createTextInput({ mount, label: "DCC URI", state, key: "dcc_uri", placeholder: "e.g., 'docs/continueDocs'", onChange });
  const version = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '0.0.1'", onChange });
  const schema = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const description = createTextInput({ mount, label: "description", state, key: "description", placeholder: "e.g., 'Documentation links for Continue'", onChange });

  const tags = createArrayEditor({
    mount,
    label: "dcc_tags",
    fields: [{ name: "value", label: "dcc_tags", placeholder: "e.g., 'tag1, tag2, tag3'", autocompleteOptions: availableTags }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const docs = createArrayEditor({
    mount,
    label: "docs",
    fields: [
      { name: "name", label: "name", placeholder: "e.g., 'Continue'" },
      { name: "startUrl", label: "startUrl", placeholder: "e.g., 'https://docs.continue.dev/intro'" },
      { name: "favicon", label: "favicon", placeholder: "e.g., 'https://docs.continue.dev/favicon.ico'" }
    ],
    onChange: (nextItems) => {
      state.docs = nextItems;
      onChange();
    }
  });

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        docs: docs.getItems()
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
      docs.setItems(Array.isArray(state.docs) ? state.docs : []);
    }
  };
}
