export function closeDuplicateDefinitionModal() {
  const existing = document.querySelector(".duplicate-definition-overlay");
  if (existing) {
    existing.remove();
  }
}

export function openConfirmationDialog({
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel"
} = {}) {
  return new Promise((resolve) => {
    const existingOverlay = document.getElementById("confirmationDialogOverlay");
    existingOverlay?.remove();

    const overlay = document.createElement("div");
    overlay.id = "confirmationDialogOverlay";
    overlay.className = "editor-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "editor-modal";

    const titleElement = document.createElement("h3");
    titleElement.textContent = title;

    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    messageElement.style.margin = "0";

    const actions = document.createElement("div");
    actions.className = "editor-modal-actions";

    const cancelButton = document.createElement("button");
    cancelButton.className = "btn";
    cancelButton.type = "button";
    cancelButton.textContent = cancelText;

    const confirmButton = document.createElement("button");
    confirmButton.className = "btn primary";
    confirmButton.type = "button";
    confirmButton.textContent = confirmText;

    const cleanUpAndResolve = (result) => {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
      resolve(Boolean(result));
    };

    const onKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanUpAndResolve(false);
      }
    };

    cancelButton.addEventListener("click", () => cleanUpAndResolve(false));
    confirmButton.addEventListener("click", () => cleanUpAndResolve(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanUpAndResolve(false);
      }
    });

    actions.append(cancelButton, confirmButton);
    modal.append(titleElement, messageElement, actions);
    overlay.append(modal);

    document.addEventListener("keydown", onKeydown);
    document.body.append(overlay);
    confirmButton.focus();
  });
}

export function createDuplicateModalHelpers({ escapeHtml, extractDccUriFromDefinitionContent }) {
  function openDuplicateDefinitionModal({ defaultName, defaultDccUri, defaultContent }) {
    closeDuplicateDefinitionModal();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "duplicate-definition-overlay";
      overlay.innerHTML = `
        <div class="duplicate-definition-modal" role="dialog" aria-modal="true" aria-labelledby="duplicateDefinitionTitle">
          <h3 id="duplicateDefinitionTitle">Duplicate definition</h3>
          <p class="duplicate-definition-subtitle">Review and update fields before creating the duplicate.</p>
          <label class="duplicate-definition-field">Definition name
            <input type="text" data-role="duplicate-name" value="${escapeHtml(defaultName)}" />
          </label>
          <label class="duplicate-definition-field">DCC URI
            <input type="text" data-role="duplicate-dcc-uri" value="${escapeHtml(defaultDccUri)}" />
          </label>
          <label class="duplicate-definition-field">Definition source
            <textarea data-role="duplicate-content" rows="14">${escapeHtml(defaultContent)}</textarea>
          </label>
          <div class="duplicate-definition-actions">
            <button class="btn" type="button" data-role="duplicate-cancel">Cancel</button>
            <button class="btn primary" type="button" data-role="duplicate-save">Create duplicate</button>
          </div>
        </div>
      `;

      const nameInput = overlay.querySelector('[data-role="duplicate-name"]');
      const dccUriInput = overlay.querySelector('[data-role="duplicate-dcc-uri"]');
      const contentInput = overlay.querySelector('[data-role="duplicate-content"]');
      const cancelButton = overlay.querySelector('[data-role="duplicate-cancel"]');
      const saveButton = overlay.querySelector('[data-role="duplicate-save"]');

      function handleCancel() {
        closeDuplicateDefinitionModal();
        resolve(null);
      }

      cancelButton?.addEventListener("click", handleCancel);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          handleCancel();
        }
      });

      saveButton?.addEventListener("click", () => {
        const nextName = String(nameInput?.value || "").trim();
        const nextDccUri = String(dccUriInput?.value || "").trim();
        const nextContent = String(contentInput?.value || "").trim();
        if (!nextName) {
          window.alert("Definition name cannot be empty.");
          nameInput?.focus();
          return;
        }
        if (!nextDccUri) {
          window.alert("Definition dcc_uri cannot be empty.");
          dccUriInput?.focus();
          return;
        }
        if (!nextContent) {
          window.alert("Definition content cannot be empty.");
          contentInput?.focus();
          return;
        }
        closeDuplicateDefinitionModal();
        resolve({ name: nextName, dccUri: nextDccUri, content: nextContent });
      });

      document.body.append(overlay);
      nameInput?.focus();
      nameInput?.select();
    });
  }

  function pathBasename(filePath) {
    const normalized = String(filePath || "").replace(/\\/g, "/");
    const segments = normalized.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] || "";
  }

  function pathExtname(fileName) {
    const value = String(fileName || "");
    const dotIndex = value.lastIndexOf(".");
    if (dotIndex <= 0) {
      return "";
    }
    return value.slice(dotIndex);
  }

  function createDuplicateDefaults(definitionName, definitionPath, definitionContent = "", definitionDccUri = "") {
    const defaultName = `${String(definitionName || "definition").trim() || "definition"}_copy`;
    const currentDccUri = String(definitionDccUri || extractDccUriFromDefinitionContent(definitionContent, definitionPath) || "").trim();
    const defaultDccUri = currentDccUri ? `${currentDccUri}_copy` : defaultName;
    const originalFileName = pathBasename(definitionPath) || "definition.md";
    const extension = pathExtname(originalFileName);
    const baseName = extension ? originalFileName.slice(0, -extension.length) : originalFileName;
    const defaultFileName = `${baseName}_copy${extension}`;
    return { defaultName, defaultDccUri, defaultFileName };
  }

  return {
    openDuplicateDefinitionModal,
    createDuplicateDefaults,
  };
}
