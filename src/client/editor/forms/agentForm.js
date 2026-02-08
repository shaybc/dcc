import { createArrayEditor } from "../components/arrayEditor.js";
import { attachEnhancePromptBehavior } from "./promptEnhancer.js";

export function createAgentForm({ mount, onChange, availableTags = [] }) {
  const state = { name: "", description: "", version: "", tags: [], tools: [], rules: [], body: "" };
  const makeInput = (label, key, placeholder = "") => {
    const row = document.createElement("label"); row.className = "editor-field";
    row.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input"); input.type = "text";
    input.placeholder = placeholder;
    input.addEventListener("input", () => { state[key] = input.value; onChange(); });
    row.append(input); mount.append(row); return input;
  };
  const name = makeInput("name", "name", 'e.g., "Atlassian Continuous AI - Jira"');
  const desc = makeInput(
    "description",
    "description",
    'e.g., "Triage Assistant (Jira) helps you create high-quality Jira issues with minimal input. It transforms a short request into a structured ticket, adds context from the repo or related issues, and ensures consistent formatting. It\'s designed to speed up triage, reduce noisy tickets, and make issues easier to understand and act on."'
  );
  const version = makeInput("version", "version");
  const tags = createArrayEditor({ mount, label: "tags", fields: [{ name: "value", label: "Tag", placeholder: 'e.g., "tag1, tag2, tag3"', autocompleteOptions: availableTags }], onChange: (v) => { state.tags = v; onChange(); } });
  const tools = createArrayEditor({ mount, label: "tools", fields: [{ name: "value", label: "Tool", placeholder: 'e.g., "built_in, atlassian/atlassian-mcp"' }], onChange: (v) => { state.tools = v; onChange(); } });
  const rules = createArrayEditor({ mount, label: "rules", fields: [{ name: "value", label: "Rule", placeholder: 'e.g., "continuedev/create-standard-issue"' }], onChange: (v) => { state.rules = v; onChange(); } });
  const bodyRow = document.createElement("label"); bodyRow.className = "editor-field"; bodyRow.innerHTML = "<span>agent instructions</span>";
  const body = document.createElement("textarea");
  body.className = "agent-body-textarea";
  body.placeholder = 'e.g., "Create a well-structured Jira issue based on this request. If possible, enrich it with relevant repo context, related tickets, and clear acceptance criteria. Always use the Atlassian MCP."';
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

  return { getState(){ return { ...state, tags: tags.getItems(), tools: tools.getItems(), rules: rules.getItems() }; }, setState(next){ Object.assign(state,next||{}); name.value=state.name||"";desc.value=state.description||"";version.value=state.version||"";body.value=state.body||""; tags.setItems(state.tags||[]); tools.setItems(state.tools||[]); rules.setItems(state.rules||[]);} };
}
