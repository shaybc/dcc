(function initDefinitionFormManager() {
  const formPage = document.getElementById("definitionFormPage");
  const formTitle = document.getElementById("definitionFormTitle");
  const fieldsContainer = document.getElementById("definitionFormFields");
  const yamlEditor = document.getElementById("definitionYamlEditor");
  const saveButton = document.getElementById("definitionFormSave");
  const cancelButton = document.getElementById("definitionFormCancel");
  const fileNameInput = document.getElementById("definitionFileName");
  const pathInput = document.getElementById("definitionFilePath");

  let mode = "create";
  let currentType = "prompts";
  let currentDefinitionId = null;
  let values = { tags: [], extra: {} };
  let onClose = () => {};

  function renderFields(type) {
    const isAgent = type === "agents";
    const isRule = type === "rules";
    const includeVersion = !(isAgent || isRule);
    fieldsContainer.innerHTML = `
      <label>Name<input data-field="name" type="text"></label>
      ${includeVersion ? '<label>Version<input data-field="version" type="text" placeholder="1.0"></label>' : ""}
      ${includeVersion ? '<label>Schema<input data-field="schema" type="text" value="v1"></label>' : ""}
      <label>Description<textarea data-field="description" rows="3"></textarea></label>
      <label>Tags (comma-separated)<input data-field="tags" type="text"></label>
      ${isAgent ? '<label>Tools<input data-field="tools" type="text"></label><label>Rules<input data-field="rules" type="text"></label>' : ""}
      ${(isAgent || isRule) ? '<label>Body<textarea data-field="body" rows="8"></textarea></label>' : '<label>Definition section YAML<textarea data-field="extra" rows="10" placeholder="Paste inner definition section here"></textarea></label>'}
    `;

    fieldsContainer.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("input", () => {
        const key = field.getAttribute("data-field");
        if (key === "tags") {
          values.tags = field.value.split(",").map((v) => v.trim()).filter(Boolean);
        } else if (key === "extra") {
          values.extra = { raw: field.value };
        } else {
          values[key] = field.value;
        }
        yamlEditor.value = window.DefinitionFormSchema.serialize({ type: currentType, values });
      });
    });
  }

  function setFormValues(nextValues) {
    values = { tags: [], extra: {}, ...nextValues };
    fieldsContainer.querySelectorAll("[data-field]").forEach((field) => {
      const key = field.getAttribute("data-field");
      if (key === "tags") field.value = (values.tags || []).join(", ");
      else if (key === "extra") field.value = values.extra?.raw || "";
      else field.value = values[key] || "";
    });
    yamlEditor.value = window.DefinitionFormSchema.serialize({ type: currentType, values });
  }

  function parseEditorContent(raw) {
    if (currentType === "agents" || currentType === "rules") return window.DefinitionFormSchema.parseMarkdownFrontmatter(raw);
    return window.DefinitionFormSchema.parseSimpleYaml(raw);
  }

  yamlEditor?.addEventListener("paste", () => {
    window.setTimeout(() => {
      setFormValues(parseEditorContent(yamlEditor.value));
    }, 0);
  });

  yamlEditor?.addEventListener("input", () => {
    setFormValues(parseEditorContent(yamlEditor.value));
  });

  cancelButton?.addEventListener("click", () => {
    formPage.hidden = true;
    onClose();
  });

  async function onSave() {
    if (mode === "edit") {
      const payload = await fetch(`/api/definitions/${currentDefinitionId}/edit-save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: yamlEditor.value })
      }).then((r) => r.json());
      if (!payload.ok) throw new Error(payload.error || "Unable to save.");
      window.alert(payload.message || "Definition saved to repository.");
    } else {
      const payload = await fetch(`/api/definitions/create-local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: currentType,
          content: yamlEditor.value,
          fileName: fileNameInput.value,
          directoryPath: pathInput.value
        })
      }).then((r) => r.json());
      if (!payload.ok) throw new Error(payload.error || "Unable to create definition.");
      window.alert(payload.message || "Definition saved locally (untracked).");
    }
    formPage.hidden = true;
    onClose();
  }

  saveButton?.addEventListener("click", async () => {
    try {
      await onSave();
    } catch (error) {
      window.alert(error.message || "Save failed.");
    }
  });

  function openForEdit(definition, closeHandler) {
    mode = "edit";
    onClose = closeHandler;
    currentDefinitionId = definition.id;
    currentType = definition.type;
    formTitle.textContent = `Edit ${window.DefinitionFormSchema.TYPE_CONFIG[currentType]?.label || "Definition"}`;
    renderFields(currentType);
    fileNameInput.closest("label").hidden = true;
    pathInput.closest("label").hidden = true;
    setFormValues(parseEditorContent(definition.content || ""));
    formPage.hidden = false;
  }

  function openForCreate(type, closeHandler) {
    mode = "create";
    onClose = closeHandler;
    currentDefinitionId = null;
    currentType = type;
    formTitle.textContent = `Create ${window.DefinitionFormSchema.TYPE_CONFIG[type]?.label || "Definition"}`;
    renderFields(type);
    fileNameInput.closest("label").hidden = false;
    pathInput.closest("label").hidden = false;
    fileNameInput.value = "";
    pathInput.value = type === "mcp servers" ? "mcpServers" : type;
    setFormValues({ name: "", version: "", schema: "v1", description: "", tags: [], extra: {}, body: "" });
    formPage.hidden = false;
  }

  window.DefinitionFormManager = { openForEdit, openForCreate };
})();
