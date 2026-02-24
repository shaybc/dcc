function closeModelsDialog(modelsDialogOverlay) {
  if (!modelsDialogOverlay) return;
  modelsDialogOverlay.hidden = true;
}

function openModelsDialog(modelsDialogOverlay) {
  if (!modelsDialogOverlay) return;
  modelsDialogOverlay.hidden = false;
}

function renderModelCards(modelsDialogContent, models = []) {
  if (!modelsDialogContent) return;
  modelsDialogContent.innerHTML = "";

  if (!Array.isArray(models) || models.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "helper-text";
    emptyState.textContent = "No models were returned by /v1/models.";
    modelsDialogContent.appendChild(emptyState);
    return;
  }

  models.forEach((model) => {
    const card = document.createElement("article");
    card.className = "model-card";

    const title = document.createElement("h4");
    title.textContent = String(model?.id || model?.name || "Unnamed model");

    const details = document.createElement("pre");
    details.textContent = JSON.stringify(model, null, 2);

    card.append(title, details);
    modelsDialogContent.appendChild(card);
  });
}

async function fetchAndShowModels({ modelsDialogOverlay, modelsDialogContent }) {
  if (!modelsDialogContent) return;

  openModelsDialog(modelsDialogOverlay);
  modelsDialogContent.innerHTML = '<p class="helper-text">Loading models from /v1/models…</p>';

  const response = await fetch("/v1/models");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || "Failed to load models.";
    modelsDialogContent.innerHTML = `<p class="helper-text" style="color:#dc2626">${message}</p>`;
    return;
  }

  const models = Array.isArray(payload?.data)
    ? payload.data
    : (Array.isArray(payload?.models) ? payload.models : []);

  renderModelCards(modelsDialogContent, models);
}

export function initModelsDialog(domRefs) {
  const { getModelsButton, closeModelsDialogButton, modelsDialogOverlay, modelsDialogContent } = domRefs;

  getModelsButton?.addEventListener("click", () => {
    fetchAndShowModels({ modelsDialogOverlay, modelsDialogContent }).catch((error) => {
      if (!modelsDialogContent) return;
      const message = error instanceof Error ? error.message : "Failed to load models.";
      modelsDialogContent.innerHTML = `<p class="helper-text" style="color:#dc2626">${message}</p>`;
      openModelsDialog(modelsDialogOverlay);
    });
  });

  closeModelsDialogButton?.addEventListener("click", () => closeModelsDialog(modelsDialogOverlay));
  modelsDialogOverlay?.addEventListener("click", (event) => {
    if (event.target === modelsDialogOverlay) {
      closeModelsDialog(modelsDialogOverlay);
    }
  });

  return {
    closeModelsDialog: () => closeModelsDialog(modelsDialogOverlay),
    isOpen: () => Boolean(modelsDialogOverlay && !modelsDialogOverlay.hidden),
  };
}
