import { createArrayEditor } from "../components/arrayEditor.js";

export function createAgentForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", tags: [], tools: [], rules: [], body: "" };
  const makeInput = (label, key) => {
    const row = document.createElement("label"); row.className = "editor-field";
    row.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input"); input.type = "text";
    input.addEventListener("input", () => { state[key] = input.value; onChange(); });
    row.append(input); mount.append(row); return input;
  };
  const name = makeInput("name", "name");
  const desc = makeInput("description", "description");
  const version = makeInput("version", "version");
  const tags = createArrayEditor({ mount, label: "tags", fields: [{ name: "value", label: "Tag" }], onChange: (v) => { state.tags = v; onChange(); } });
  const tools = createArrayEditor({ mount, label: "tools", fields: [{ name: "value", label: "Tool" }], onChange: (v) => { state.tools = v; onChange(); } });
  const rules = createArrayEditor({ mount, label: "rules", fields: [{ name: "value", label: "Rule" }], onChange: (v) => { state.rules = v; onChange(); } });
  const bodyRow = document.createElement("label"); bodyRow.className = "editor-field"; bodyRow.innerHTML = "<span>body</span>";
  const body = document.createElement("textarea");
  body.addEventListener("input", () => { state.body = body.value; onChange(); });
  bodyRow.append(body); mount.append(bodyRow);

  return { getState(){ return { ...state, tags: tags.getItems(), tools: tools.getItems(), rules: rules.getItems() }; }, setState(next){ Object.assign(state,next||{}); name.value=state.name||"";desc.value=state.description||"";version.value=state.version||"";body.value=state.body||""; tags.setItems(state.tags||[]); tools.setItems(state.tools||[]); rules.setItems(state.rules||[]);} };
}
