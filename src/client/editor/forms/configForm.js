import { createArrayEditor } from "../components/arrayEditor.js";

function createTextInput({ mount, label, state, key, placeholder, onChange, multiline = false }) {
  const row = document.createElement("label");
  row.className = "editor-field";
  row.innerHTML = `<span>${label}</span>`;
  const input = multiline ? document.createElement("textarea") : document.createElement("input");
  if (!multiline) {
    input.type = "text";
  }
  input.placeholder = placeholder || "";
  input.addEventListener("input", () => {
    state[key] = input.value;
    onChange();
  });
  row.append(input);
  mount.append(row);
  return input;
}

function toReferenceItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    if (typeof item === "string") {
      return { dcc_use: item };
    }
    return { dcc_use: item?.dcc_use || "" };
  });
}

export function createConfigForm({ mount, onChange, availableTags = [], definitionReferences = [] }) {
  const state = {
    name: "",
    dcc_uri: "",
    version: "",
    schema: "",
    description: "",
    tags: [],
    dcc_config_type: "agents",
    models: [],
    context: [],
    rules: [],
    prompts: [],
    docs: [],
    mcpServers: []
  };

  const refsByType = (type) => definitionReferences
    .filter((item) => String(item?.type || "").toLowerCase() === type)
    .map((item) => String(item?.dcc_uri || "").trim())
    .filter(Boolean);

  const name = createTextInput({ mount, label: "name", state, key: "name", placeholder: "e.g., 'My Team Config'", onChange });
  const dccUri = createTextInput({ mount, label: "DCC URI", state, key: "dcc_uri", placeholder: "e.g., 'configs/my_team_config'", onChange });
  const version = createTextInput({ mount, label: "version", state, key: "version", placeholder: "e.g., '1.0.0'", onChange });
  const schema = createTextInput({ mount, label: "schema", state, key: "schema", placeholder: "e.g., 'v1'", onChange });
  const description = createTextInput({ mount, label: "description", state, key: "description", multiline: true, placeholder: "Describe this config", onChange });

  const configTypeRow = document.createElement("label");
  configTypeRow.className = "editor-field";
  configTypeRow.innerHTML = "<span>config type</span>";
  const configTypeSelect = document.createElement("select");
  ["agents", "ide"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    configTypeSelect.append(option);
  });
  configTypeSelect.addEventListener("change", () => {
    state.dcc_config_type = configTypeSelect.value;
    onChange();
  });
  configTypeRow.append(configTypeSelect);
  mount.append(configTypeRow);

  const tags = createArrayEditor({
    mount,
    label: "dcc_tags",
    fields: [{ name: "value", label: "dcc_tags", placeholder: "e.g., 'tag1, tag2, tag3'", autocompleteOptions: availableTags }],
    onChange: (nextItems) => {
      state.tags = nextItems;
      onChange();
    }
  });

  const createRefsEditor = (label, sectionKey, options) => createArrayEditor({
    mount,
    label,
    fields: [{ name: "dcc_use", label: "dcc_use", placeholder: `e.g., '${label.toLowerCase()}/example'`, autocompleteOptions: options }],
    onChange: (nextItems) => {
      state[sectionKey] = nextItems;
      onChange();
    }
  });

  const models = createRefsEditor("models", "models", refsByType("models"));
  const context = createRefsEditor("context", "context", refsByType("context"));
  const rules = createRefsEditor("rules", "rules", refsByType("rules"));
  const prompts = createRefsEditor("prompts", "prompts", refsByType("prompts"));
  const docs = createRefsEditor("docs", "docs", refsByType("docs"));
  const mcpServers = createRefsEditor("mcpServers", "mcpServers", refsByType("mcpservers"));

  return {
    getState() {
      return {
        ...state,
        tags: tags.getItems(),
        models: models.getItems(),
        context: context.getItems(),
        rules: rules.getItems(),
        prompts: prompts.getItems(),
        docs: docs.getItems(),
        mcpServers: mcpServers.getItems()
      };
    },
    setState(nextState) {
      Object.assign(state, nextState || {});
      name.value = state.name || "";
      dccUri.value = state.dcc_uri || "";
      version.value = state.version || "";
      schema.value = state.schema || "";
      description.value = state.description || "";
      configTypeSelect.value = state.dcc_config_type || "agents";
      tags.setItems(state.tags || []);
      models.setItems(toReferenceItems(state.models));
      context.setItems(toReferenceItems(state.context));
      rules.setItems(toReferenceItems(state.rules));
      prompts.setItems(toReferenceItems(state.prompts));
      docs.setItems(toReferenceItems(state.docs));
      mcpServers.setItems(toReferenceItems(state.mcpServers));
    }
  };
}
