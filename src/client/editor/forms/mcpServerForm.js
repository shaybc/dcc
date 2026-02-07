import { createArrayEditor } from "../components/arrayEditor.js";

function input(root, label, state, key, onChange) {
  const wrap = document.createElement("label"); wrap.className = "editor-field";
  const span = document.createElement("span"); span.textContent = label;
  const el = document.createElement("input"); el.type = "text";
  el.addEventListener("input", () => { state[key] = el.value; onChange(); });
  wrap.append(span, el); root.append(wrap); return el;
}

export function createMcpServerForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", tags: [], mcpServers: [] };
  const nameEl = input(mount, "name", state, "name", onChange);
  const descEl = input(mount, "description", state, "description", onChange);
  const verEl = input(mount, "version", state, "version", onChange);
  const tags = createArrayEditor({ mount, label: "tags", fields: [{ name: "value", label: "Tag" }], onChange: (v) => { state.tags = v; onChange(); } });
  const servers = createArrayEditor({ mount, label: "mcpServers", fields: [{ name: "name", label: "Name" }, { name: "command", label: "Command" }, { name: "args", label: "Args", kind: "array", itemLabel: "Arg" }], onChange: (v) => { state.mcpServers = v; onChange(); } });

  return {
    getState() { return { ...state, tags: tags.getItems(), mcpServers: state.mcpServers }; },
    setState(next) {
      Object.assign(state, next || {});
      nameEl.value = state.name || ""; descEl.value = state.description || ""; verEl.value = state.version || "";
      tags.setItems(state.tags || []);
      servers.setItems(state.mcpServers || []);
    }
  };
}
