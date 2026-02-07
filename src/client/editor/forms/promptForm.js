import { createArrayEditor } from "../components/arrayEditor.js";

function textField(root, label, onInput) {
  const wrap = document.createElement("label");
  wrap.className = "editor-field";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.addEventListener("input", () => onInput(input.value));
  wrap.append(span, input);
  root.append(wrap);
  return input;
}

export function createPromptForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", tags: [], prompts: [] };
  const nameInput = textField(mount, "name", (v) => { state.name = v; onChange(); });
  const descriptionInput = textField(mount, "description", (v) => { state.description = v; onChange(); });
  const versionInput = textField(mount, "version", (v) => { state.version = v; onChange(); });
  const tags = createArrayEditor({ mount, label: "tags", fields: [{ name: "value", label: "Tag" }], onChange: (v) => { state.tags = v; onChange(); } });
  const prompts = createArrayEditor({ mount, label: "prompts", fields: [{ name: "name", label: "Name" }, { name: "description", label: "Description" }, { name: "prompt", label: "Prompt", multiline: true }], onChange: (v) => { state.prompts = v; onChange(); } });

  return {
    getState() { return { ...state, tags: tags.getItems(), prompts: prompts.getItems() }; },
    setState(next) {
      Object.assign(state, next || {});
      nameInput.value = state.name || "";
      descriptionInput.value = state.description || "";
      versionInput.value = state.version || "";
      tags.setItems(state.tags || []);
      prompts.setItems(state.prompts || []);
    }
  };
}
