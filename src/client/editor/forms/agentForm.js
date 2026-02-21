import { createArrayEditor } from "../components/arrayEditor.js";
import { attachEnhancePromptBehavior } from "./promptEnhancer.js";

export function createAgentForm({ mount, onChange }) {
  const state = { name: "", description: "", model: "", rules: [], mcpServers: [], body: "" };
  const makeInput = (label, key, placeholder = "") => {
    const row = document.createElement("label"); row.className = "editor-field";
    row.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input"); input.type = "text";
    input.placeholder = placeholder;
    input.addEventListener("input", () => { state[key] = input.value; onChange(); });
    row.append(input); mount.append(row); return input;
  };

  const name = makeInput("name", "name", 'e.g., "Conventional Title"');
  const desc = makeInput("description", "description", 'e.g., "Updates PR title to follow conventional commit format"');
  const model = makeInput("model", "model", 'e.g., "claude-3-7-sonnet"');

  const rules = createArrayEditor({
    mount,
    label: "rules",
    fields: [{ name: "value", label: "rule", placeholder: 'e.g., "rules/pr-title.md"' }],
    onChange: (values) => { state.rules = values; onChange(); }
  });

  const mcpServers = createArrayEditor({
    mount,
    label: "mcpServers",
    fields: [{ name: "value", label: "server", placeholder: 'e.g., "mcpservers/github"' }],
    onChange: (values) => { state.mcpServers = values; onChange(); }
  });

  const bodyRow = document.createElement("label"); bodyRow.className = "editor-field"; bodyRow.innerHTML = "<span>agent instructions</span>";
  const body = document.createElement("textarea");
  body.className = "agent-body-textarea";
  body.placeholder = 'e.g., "You are reviewing a pull request to format its title according to conventional commit standards."';
  body.addEventListener("input", () => { state.body = body.value; onChange(); });
  const bodyActions = document.createElement("div");
  bodyActions.className = "editor-enhance-row";
  const enhanceButton = document.createElement("button");
  enhanceButton.type = "button";
  enhanceButton.className = "btn";
  enhanceButton.textContent = "Enhance Prompt";
  attachEnhancePromptBehavior({
    button: enhanceButton,
    getText: () => body.value,
    setText: (nextValue) => {
      body.value = nextValue;
      state.body = nextValue;
    },
    onChange,
    fieldLabel: "agent instructions"
  });
  bodyActions.append(enhanceButton);
  bodyRow.append(body, bodyActions); mount.append(bodyRow);

  return {
    getState() {
      return { ...state, rules: rules.getItems(), mcpServers: mcpServers.getItems() };
    },
    setState(next) {
      Object.assign(state, next || {});
      name.value = state.name || "";
      desc.value = state.description || "";
      model.value = state.model || "";
      body.value = state.body || "";
      rules.setItems(state.rules || []);
      mcpServers.setItems(state.mcpServers || []);
    }
  };
}
