import { runWithLoading } from "../../services/loadingService.js";

export function createDefinitionGenerationController({
  closeDuplicateDefinitionModal,
  generatedDefinitionStorageKey,
  generatableDefinitionTypes,
  definitionTypeAliases,
  commonDefinitionHelpPagePath,
  definitionHelpPageByType,
  escapeHtml,
  formatFilterLabel,
  extractDccUriFromDefinitionContent,
  getDefinitions,
}) {
  function normalizeDefinitionTypeForGeneration(typeValue) {
    const normalized = String(typeValue || "").trim().toLowerCase();
    return definitionTypeAliases[normalized] || "prompt";
  }

  async function loadDefinitionHelpPages(selectedType) {
    const normalizedType = normalizeDefinitionTypeForGeneration(selectedType);
    const typeHelpPagePath = definitionHelpPageByType[normalizedType] || "";
    const paths = [commonDefinitionHelpPagePath, typeHelpPagePath].filter(Boolean);
    const uniquePaths = [...new Set(paths)];
    const pages = await Promise.all(uniquePaths.map(async (helpPagePath) => {
      try {
        const response = await fetch(helpPagePath);
        if (!response.ok) {
          return `Unable to load help page ${helpPagePath} (${response.status}).`;
        }
        const content = String(await response.text() || "").trim();
        return [`Help page: ${helpPagePath}`, content || "(Empty help page content)"].join("\n");
      } catch (_error) {
        return `Unable to load help page ${helpPagePath}.`;
      }
    }));

    return pages.join("\n\n");
  }

  async function ensureDefinitionsLoadedForGeneration() {
    const definitions = getDefinitions();
    if (Array.isArray(definitions) && definitions.length > 0) {
      return definitions;
    }

    try {
      const response = await fetch("/api/definitions");
      if (!response.ok) {
        return [];
      }
      const payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    } catch (_error) {
      return [];
    }
  }

  async function loadDefinitionReferencesByType(selectedType, { minItems = 3, maxItems = 5 } = {}) {
    const normalizedType = normalizeDefinitionTypeForGeneration(selectedType);
    const definitionsIndex = await ensureDefinitionsLoadedForGeneration();
    const matchingDefinitions = definitionsIndex
      .filter((definition) => normalizeDefinitionTypeForGeneration(definition?.type || "") === normalizedType)
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
      .slice(0, Math.max(minItems, maxItems));

    const details = await Promise.all(matchingDefinitions.map(async (definition) => {
      const id = Number(definition?.id || 0);
      if (!Number.isInteger(id) || id <= 0) {
        return null;
      }
      try {
        const response = await fetch(`/api/definitions/${id}`);
        if (!response.ok) {
          return null;
        }
        const payload = await response.json();
        const content = String(payload?.content || "").trim();
        if (!content) {
          return null;
        }
        return {
          name: payload?.name || definition?.name || "",
          dccUri: extractDccUriFromDefinitionContent(content),
          content,
        };
      } catch (_error) {
        return null;
      }
    }));

    return details.filter(Boolean).slice(0, maxItems);
  }

  async function buildDefinitionGenerationPrompt({ selectedType, description }) {
    const normalizedType = normalizeDefinitionTypeForGeneration(selectedType);
    const [helpPageContent, referenceDefinitions] = await Promise.all([
      loadDefinitionHelpPages(normalizedType),
      loadDefinitionReferencesByType(selectedType, { minItems: 3, maxItems: 5 }),
    ]);

    const referenceBlock = referenceDefinitions.length > 0
      ? referenceDefinitions.map((item, index) => [
        `Reference definition ${index + 1}:`,
        `- Name: ${item.name || "Unknown"}`,
        `- DCC URI: ${item.dccUri || "Unknown"}`,
        "- Content:",
        item.content,
      ].join("\n")).join("\n\n")
      : "No matching existing definitions were found.";

    return [
      "Generate one complete Continue.dev definition in YAML format.",
      `Definition type: ${normalizedType}`,
      "Output rules:",
      "- Always output YAML.",
      "- Return only the definition content.",
      "- Do not include markdown fences.",
      "- Keep fields valid for the requested schema type.",
      "- Include Continue.dev fields needed for the selected definition type.",
      "- Include DCC metadata extensions when relevant (e.g., dcc_uri, dcc_tags, version).",
      "",
      "Schema guidance from DCC Help (common + selected type):",
      helpPageContent,
      "",
      "Existing definitions of the same type (style references):",
      referenceBlock,
      "",
      "User natural language request:",
      description,
    ].join("\n");
  }

  function openGenerateDefinitionModal({ defaultType = "prompt", defaultDescription = "", initialError = "" } = {}) {
    return new Promise((resolve) => {
      closeDuplicateDefinitionModal();
      const overlay = document.createElement("div");
      overlay.className = "duplicate-definition-overlay";
      const typeOptions = generatableDefinitionTypes
        .map((type) => `<option value="${escapeHtml(type)}" ${type === defaultType ? "selected" : ""}>${escapeHtml(formatFilterLabel(type))}</option>`)
        .join("");

      overlay.innerHTML = `
      <div class="duplicate-definition-modal" role="dialog" aria-modal="true" aria-labelledby="generateDefinitionTitle">
        <h3 id="generateDefinitionTitle">Generate Definition</h3>
        <p class="duplicate-definition-subtitle">Generate a definition from a natural language request via DCC AI gateway.</p>
        <label class="duplicate-definition-field">Definition type
          <select data-role="generate-type">${typeOptions}</select>
        </label>
        <label class="duplicate-definition-field">Natural language description
          <textarea data-role="generate-description" rows="8" placeholder="Describe the definition you want to create...">${escapeHtml(defaultDescription)}</textarea>
        </label>
        <p class="error" data-role="generate-error" ${initialError ? "" : "hidden"}>${escapeHtml(initialError)}</p>
        <div class="duplicate-definition-actions">
          <button class="btn" type="button" data-role="generate-cancel">Cancel</button>
          <button class="btn primary" type="button" data-role="generate-submit">Generate</button>
        </div>
      </div>
    `;

      const typeSelect = overlay.querySelector('[data-role="generate-type"]');
      const descriptionInput = overlay.querySelector('[data-role="generate-description"]');
      const cancelButton = overlay.querySelector('[data-role="generate-cancel"]');
      const submitButton = overlay.querySelector('[data-role="generate-submit"]');
      const errorNode = overlay.querySelector('[data-role="generate-error"]');

      function closeModal(result = null) {
        overlay.remove();
        resolve(result);
      }

      function showError(message) {
        if (!errorNode) return;
        errorNode.textContent = message;
        errorNode.hidden = !message;
      }

      cancelButton?.addEventListener("click", () => closeModal(null));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          closeModal(null);
        }
      });

      submitButton?.addEventListener("click", () => {
        const selectedType = String(typeSelect?.value || "").trim();
        const description = String(descriptionInput?.value || "").trim();

        if (!selectedType || !generatableDefinitionTypes.includes(selectedType)) {
          showError("Please choose a valid definition type.");
          typeSelect?.focus();
          return;
        }
        if (!description) {
          showError("Please enter a natural language description.");
          descriptionInput?.focus();
          return;
        }

        closeModal({ selectedType, description });
      });

      document.body.appendChild(overlay);
      descriptionInput?.focus();
    });
  }

  async function generateDefinitionFromDescription() {
    let defaults = { defaultType: "prompt", defaultDescription: "", initialError: "" };

    while (true) {
      const request = await openGenerateDefinitionModal(defaults);
      if (!request) {
        return;
      }

      defaults = {
        defaultType: request.selectedType,
        defaultDescription: request.description,
        initialError: "",
      };

      try {
        const generationPrompt = await buildDefinitionGenerationPrompt({
          selectedType: request.selectedType,
          description: request.description,
        });

        const response = await runWithLoading(
          async () => fetch("/v1/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-DCC-Feature": "definition-generate",
            },
            body: JSON.stringify({
              prompt: generationPrompt,
              max_tokens: 4096,
              temperature: 0.2,
            }),
          }),
          {
            title: "Generating definition...",
            description: "Using DCC AI gateway to generate content.",
            timeout: 120000,
          }
        );

        if (!response) {
          return;
        }

        if (!response.ok) {
          const payload = await response.text();
          throw new Error(payload || `Definition generation failed with status ${response.status}.`);
        }

        const payload = await response.json();
        const generatedContent = String(payload?.choices?.[0]?.text || "").trim();
        if (!generatedContent) {
          throw new Error("DCC AI gateway returned empty content.");
        }

        window.sessionStorage.setItem(generatedDefinitionStorageKey, JSON.stringify({
          type: request.selectedType,
          content: generatedContent,
          createdAt: Date.now(),
        }));
        window.location.assign(`/editor/editor.html?mode=create&type=${encodeURIComponent(request.selectedType)}&generated=1`);
        return;
      } catch (error) {
        defaults.initialError = error?.message || "Unable to generate definition.";
      }
    }
  }

  return {
    generateDefinitionFromDescription,
  };
}
