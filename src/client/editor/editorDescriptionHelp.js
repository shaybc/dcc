import { renderDescriptionMarkdown } from "../utils/stringUtils.js";

const DESCRIPTION_HELP_PAGE_PATH = "/help/user-guide/pages/usage/description-field-markdown-help.md";
let descriptionHelpContentPromise;

async function loadDescriptionHelpContent() {
  if (!descriptionHelpContentPromise) {
    descriptionHelpContentPromise = fetch(DESCRIPTION_HELP_PAGE_PATH)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load help content (${response.status}).`);
        return response.text();
      })
      .then((markdown) => renderDescriptionMarkdown(markdown))
      .catch((error) => `<p>Unable to load help content right now.</p><p><code>${error.message}</code></p>`);
  }
  return descriptionHelpContentPromise;
}

async function openDescriptionHelpModal() {
  const overlay = document.createElement("div");
  overlay.className = "editor-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "editor-modal editor-description-help-modal";

  const title = document.createElement("h3");
  title.textContent = "Description field help";

  const content = document.createElement("div");
  content.className = "editor-description-help-content";
  content.innerHTML = "<p>Loading help content…</p>";

  const actions = document.createElement("div");
  actions.className = "editor-modal-actions";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn-primary";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => overlay.remove());

  actions.append(closeButton);
  modal.append(title, content, actions);
  overlay.append(modal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });
  document.body.append(overlay);

  const html = await loadDescriptionHelpContent();
  content.innerHTML = html;
}

export function enhanceDescriptionField(formContainer) {
  const rows = Array.from(formContainer.querySelectorAll("label.editor-field"));
  const descriptionRow = rows.find((row) => {
    const labelText = row.querySelector("span")?.textContent?.trim()?.toLowerCase();
    return labelText === "description";
  });

  if (!descriptionRow || descriptionRow.dataset.descriptionEnhanced === "true") return null;

  const input = descriptionRow.querySelector('input[type="text"], textarea');
  if (!input) return null;

  const labelSpan = descriptionRow.querySelector("span");
  if (labelSpan) {
    const helpButton = document.createElement("button");
    helpButton.type = "button";
    helpButton.className = "editor-help-icon-button";
    helpButton.setAttribute("aria-label", "Description help");
    helpButton.title = "Description help";
    helpButton.textContent = "?";
    helpButton.addEventListener("click", () => {
      openDescriptionHelpModal();
    });
    labelSpan.append(" ", helpButton);
  }

  if (input.tagName.toLowerCase() === "textarea") {
    input.classList.add("editor-description-textarea");
    descriptionRow.dataset.descriptionEnhanced = "true";
    return null;
  }

  const textarea = document.createElement("textarea");
  textarea.className = "editor-description-textarea";
  textarea.rows = 5;
  textarea.placeholder = input.placeholder || "Add a detailed description";

  const syncTextareaFromInput = () => {
    textarea.value = input.value || "";
  };

  textarea.addEventListener("input", () => {
    input.value = textarea.value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  descriptionRow.append(textarea);
  input.classList.add("editor-description-hidden-input");
  descriptionRow.dataset.descriptionEnhanced = "true";
  syncTextareaFromInput();
  return syncTextareaFromInput;
}
