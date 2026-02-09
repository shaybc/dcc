import { createArrayEditor } from "../components/arrayEditor.js";
import { attachEnhancePromptBehavior } from "./promptEnhancer.js";

export function createRuleForm({ mount, onChange, availableTags = [] }) {
  const state = { name: "", dcc_uri: "", description: "", version: "", tags: [], body: "" };
  const row = (label, key, placeholder = "") => {
    const l = document.createElement("label");
    l.className = "editor-field";
    l.innerHTML = `<span>${label}</span>`;
    const i = document.createElement("input");
    i.type = "text";
    i.placeholder = placeholder;
    i.addEventListener("input", () => {
      state[key] = i.value;
      onChange();
    });
    l.append(i);
    mount.append(l);
    return i;
  };

  const name = row("name", "name", 'e.g., "Java Rules"');
  const dccUri = row("DCC URI", "dcc_uri", 'e.g., "rules/java_rules"');
  const description = row("description", "description", 'e.g., "this are the java rules"');
  const version = row("version", "version");

  const tags = createArrayEditor({
    mount,
    label: "dcc_tags",
    fields: [{ name: "value", label: "dcc_tags", placeholder: 'e.g., "tag1, tag2, tag3"', autocompleteOptions: availableTags }],
    onChange: (v) => {
      state.tags = v;
      onChange();
    }
  });

  const bodyWrap = document.createElement("label");
  bodyWrap.className = "editor-field";
  bodyWrap.innerHTML = "<span>rule content</span>";

  const body = document.createElement("textarea");
  body.className = "rule-body-textarea";
  body.placeholder = 'e.g., "- Follow Java coding standards\n- Avoid using raw types"';
  body.addEventListener("input", () => {
    state.body = body.value;
    onChange();
  });

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
    fieldLabel: "rule content"
  });
  bodyActions.append(enhanceButton);

  bodyWrap.append(body, bodyActions);
  mount.append(bodyWrap);

  return {
    getState() {
      return { ...state, tags: tags.getItems() };
    },
    setState(next) {
      Object.assign(state, next || {});
      name.value = state.name || "";
      dccUri.value = state.dcc_uri || "";
      description.value = state.description || "";
      version.value = state.version || "";
      body.value = state.body || "";
      tags.setItems(state.tags || []);
    }
  };
}
