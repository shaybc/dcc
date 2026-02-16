import { createArrayEditor } from "../components/arrayEditor.js";
import { attachEnhancePromptBehavior } from "./promptEnhancer.js";

function normalizeListValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

export function createRuleForm({ mount, onChange, availableTags = [] }) {
  const state = { name: "", dcc_uri: "", description: "", version: "", globs: [], regex: "", alwaysApply: undefined, tags: [], body: "" };
  const parsePatternInput = (value) => {
    const parts = String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) return "";
    if (parts.length === 1) return parts[0];
    return parts;
  };
  const formatPatternInput = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .join(", ");
    }
    return String(value || "");
  };
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

  const globs = createArrayEditor({
    mount,
    label: "globs",
    fields: [{ name: "value", label: "globs", placeholder: 'e.g., "**/*.{ts,tsx}"' }],
    onChange: (values) => {
      state.globs = normalizeListValue(values);
      onChange();
    }
  });

  const regex = row("regex", "regex", "e.g., \"^import .* from '.*';$\"");
  regex.addEventListener("input", () => {
    state.regex = parsePatternInput(regex.value);
    onChange();
  });

  const alwaysApplyWrap = document.createElement("label");
  alwaysApplyWrap.className = "editor-field";
  alwaysApplyWrap.innerHTML = "<span>alwaysApply</span>";
  const alwaysApply = document.createElement("select");
  alwaysApply.innerHTML = `
    <option value="">default (undefined)</option>
    <option value="true">true</option>
    <option value="false">false</option>
  `;
  alwaysApply.addEventListener("change", () => {
    if (alwaysApply.value === "true") {
      state.alwaysApply = true;
    } else if (alwaysApply.value === "false") {
      state.alwaysApply = false;
    } else {
      state.alwaysApply = undefined;
    }
    onChange();
  });
  alwaysApplyWrap.append(alwaysApply);
  mount.append(alwaysApplyWrap);

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
      const globItems = normalizeListValue(globs.getItems());
      return {
        ...state,
        globs: globItems.length ? globItems : undefined,
        tags: tags.getItems()
      };
    },
    setState(next) {
      Object.assign(state, next || {});
      name.value = state.name || "";
      dccUri.value = state.dcc_uri || "";
      description.value = state.description || "";
      version.value = state.version || "";
      globs.setItems(normalizeListValue(state.globs));
      regex.value = formatPatternInput(state.regex);
      alwaysApply.value = state.alwaysApply === true ? "true" : state.alwaysApply === false ? "false" : "";
      body.value = state.body || "";
      tags.setItems(state.tags || []);
    }
  };
}
