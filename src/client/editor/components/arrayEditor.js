import { attachEnhancePromptBehavior } from "../forms/promptEnhancer.js";

const AUTOCOMPLETE_DEBUG_PREFIX = "[tag-autocomplete]";

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function attachAutocomplete(input, options, { allowTagFallback = false } = {}) {
  console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} attachAutocomplete: called with options`, options);
  let values = Array.from(new Set((Array.isArray(options) ? options : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)));
  let requestedFallback = false;
  console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} attachAutocomplete: normalized options`, values);

  const menu = createElement("div", "autocomplete-menu");
  menu.hidden = true;
  menu.classList.add("autocomplete-menu-floating");
  document.body.append(menu);

  const positionMenu = () => {
    const rect = input.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.width = `${rect.width}px`;
  };

  const filterValues = (query) => {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return values;
    return values
      .filter((value) => value.toLowerCase().includes(normalized));
  };

  const hideMenu = () => {
    menu.hidden = true;
    menu.innerHTML = "";
  };

  const tryLoadFallbackValues = async () => {
    console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} fallback: invoked; current values`, values);
    if (!allowTagFallback || values.length || requestedFallback) {
      console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} fallback: skipped`, { hasValues: values.length > 0, requestedFallback });
      return;
    }

    requestedFallback = true;
    try {
      console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} fallback: requesting /api/definition-tags`);
      const response = await fetch("/api/definition-tags");
      console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} fallback: response status`, response.status);
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      values = Array.from(new Set((Array.isArray(payload) ? payload : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)));
      console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} fallback: loaded values`, values);
    } catch (error) {
      console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} fallback: request failed`, error);
    }
  };

  const showMenu = async () => {
    console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} showMenu: start with input value`, input.value);
    await tryLoadFallbackValues();

    const matches = filterValues(input.value)
      .filter((value) => value !== input.value);

    console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} showMenu: matches`, matches);

    if (!matches.length) {
      console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} showMenu: no matches, hiding menu`);
      hideMenu();
      return;
    }

    menu.innerHTML = "";
    positionMenu();
    matches.forEach((value) => {
      const option = createElement("button", "autocomplete-option", value);
      option.type = "button";
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        hideMenu();
      });
      menu.append(option);
    });

    menu.hidden = false;
    console.debug(`${AUTOCOMPLETE_DEBUG_PREFIX} showMenu: menu shown with options`, matches.length);
  };

  input.addEventListener("focus", () => {
    showMenu();
  });
  input.addEventListener("input", () => {
    showMenu();
  });
  input.addEventListener("blur", () => {
    window.setTimeout(hideMenu, 120);
  });

  window.addEventListener("resize", positionMenu);
  window.addEventListener("scroll", positionMenu, true);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideMenu();
    }
  });
}

function renderItemLabel(item, fields) {
  if (typeof item === "string") return item;
  const parts = fields.map((field) => item?.[field.name]).filter(Boolean);
  return parts.join(" · ") || "(empty)";
}

export function createArrayEditor({ mount, label, fields, onChange }) {
  let items = [];
  const wrapper = createElement("section", "array-editor");
  const header = createElement("div", "array-editor-header");
  header.append(createElement("h4", "", label));
  const addButton = createElement("button", "btn small", "Add item");
  addButton.type = "button";
  header.append(addButton);
  const list = createElement("div", "array-editor-list");
  wrapper.append(header, list);
  mount.append(wrapper);

  function openItemDialog(existingItem, onSave) {
    const overlay = createElement("div", "editor-modal-overlay");
    const modal = createElement("div", "editor-modal");
    const form = createElement("div", "editor-modal-form");
    const state = typeof existingItem === "string" ? { value: existingItem } : { ...(existingItem || {}) };

    fields.forEach((field) => {
      const row = createElement("label", "editor-field");
      row.append(createElement("span", "", field.label));
      if (field.kind === "array") {
        const nestedMount = createElement("div", "nested-array-mount");
        const nested = createArrayEditor({
          mount: nestedMount,
          label: field.label,
          fields: field.nestedFields || [{ name: "value", label: field.itemLabel || "Value" }],
          onChange: (values) => {
            state[field.name] = values;
          }
        });
        nested.setItems(state[field.name] || []);
        row.append(nestedMount);
      } else {
        const input = field.multiline ? document.createElement("textarea") : document.createElement("input");
        if (!field.multiline) input.type = "text";
        input.value = state[field.name] || "";
        input.placeholder = field.placeholder || "";
        input.className = field.class ? field.class : "";
        const hasAutocompleteOptions = Array.isArray(field.autocompleteOptions)
          ? field.autocompleteOptions.length > 0
          : Boolean(field.autocompleteOptions);
        const allowTagFallback = field.name === "value" && String(field.label || "").toLowerCase() === "dcc_tags";
        if (!field.multiline && (hasAutocompleteOptions || allowTagFallback)) {
          attachAutocomplete(input, field.autocompleteOptions, { allowTagFallback });
        }
        input.addEventListener("input", () => {
          state[field.name] = input.value;
        });
        row.append(input);

        if (field.multiline && field.enablePromptEnhance) {
          const enhanceRow = createElement("div", "editor-enhance-row");
          const enhanceButton = createElement("button", "btn", "Enhance Prompt");
          enhanceButton.type = "button";
          attachEnhancePromptBehavior({
            button: enhanceButton,
            getText: () => input.value,
            setText: (nextValue) => {
              input.value = nextValue;
              state[field.name] = nextValue;
            },
            onChange: () => {
              state[field.name] = input.value;
            },
            fieldLabel: field.enhanceFieldLabel || field.label || "prompt"
          });
          enhanceRow.append(enhanceButton);
          row.append(enhanceRow);
        }
      }
      form.append(row);
    });

    const actions = createElement("div", "editor-modal-actions");
    const cancel = createElement("button", "btn", "Cancel");
    cancel.type = "button";
    const save = createElement("button", "btn primary", "Save");
    save.type = "button";
    cancel.addEventListener("click", () => overlay.remove());
    save.addEventListener("click", () => {
      onSave(fields.length === 1 && fields[0].name === "value" ? (state.value || "") : state);
      overlay.remove();
    });
    actions.append(cancel, save);
    modal.append(form, actions);
    overlay.append(modal);
    document.body.append(overlay);
  }

  function render() {
    list.innerHTML = "";
    items.forEach((item, index) => {
      const row = createElement("div", "array-editor-item");
      row.append(createElement("span", "array-editor-item-label", renderItemLabel(item, fields)));
      const actions = createElement("div", "array-editor-item-actions");
      const edit = createElement("button", "btn small", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => openItemDialog(item, (value) => {
        items[index] = value;
        render();
        onChange(items);
      }));
      const remove = createElement("button", "btn small danger", "Remove");
      remove.type = "button";
      remove.addEventListener("click", () => {
        items = items.filter((_x, i) => i !== index);
        render();
        onChange(items);
      });
      actions.append(edit, remove);
      row.append(actions);
      list.append(row);
    });
  }

  addButton.addEventListener("click", () => openItemDialog(null, (value) => {
    items.push(value);
    render();
    onChange(items);
  }));

  return {
    setItems(nextItems = []) {
      items = Array.isArray(nextItems) ? [...nextItems] : [];
      render();
    },
    getItems() {
      return [...items];
    }
  };
}
