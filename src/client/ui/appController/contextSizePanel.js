import {
  TOKEN_OPTIONS,
  extractContextLengthCandidate,
  computeContextUsage,
  formatTokenCount,
  formatPercent,
} from "./contextSizeEstimator.js";
import { extractPromptOptionsFromDefinition } from "./contextSizePrompts.js";

export function createContextSizePanelController({
  contextSizeLimitSelect,
  contextSizePromptSelector,
  contextSizePromptOptions,
  contextSizeSummary,
  contextSizeMatrix,
  contextSizeBreakdown,
  contextSizeDetails,
  getCurrentDevProjectPath,
  fetchProjectContextWindow,
  normalizeFilterType,
  escapeHtml,
}) {
  let currentDefinition = null;
  let currentNormalizedType = "unknown";
  let promptOptions = [];
  let selectedPromptId = "";

  function getSelectedPromptOption() {
    return promptOptions.find((option) => option.id === selectedPromptId) || null;
  }

  function renderPromptSelector() {
    if (!contextSizePromptSelector || !contextSizePromptOptions) {
      return;
    }

    if (!Array.isArray(promptOptions) || promptOptions.length === 0) {
      contextSizePromptSelector.hidden = true;
      contextSizePromptOptions.innerHTML = "";
      return;
    }

    contextSizePromptSelector.hidden = false;
    contextSizePromptOptions.innerHTML = promptOptions
      .map((option) => `
        <label class="context-size-prompt-option">
          <input type="radio" name="contextSizePromptRadio" value="${escapeHtml(option.id)}" ${option.id === selectedPromptId ? "checked" : ""}>
          <span>${escapeHtml(option.name)}</span>
        </label>
      `)
      .join("");

    contextSizePromptOptions.querySelectorAll('input[name="contextSizePromptRadio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        selectedPromptId = String(radio.value || "");
        const selected = Number(contextSizeLimitSelect.value || 1_000_000);
        renderReport(selected);
      });
    });
  }

  function renderReport(limitTokens) {
    if (!currentDefinition) {
      return;
    }

    const selectedPrompt = getSelectedPromptOption();
    const selectedPromptTokens = selectedPrompt ? Number(selectedPrompt.tokens || 0) : 0;
    const report = computeContextUsage({
      content: currentDefinition.content || "",
      normalizedType: currentNormalizedType,
      limitTokens,
      selectedPromptTokens,
    });

    contextSizeSummary.innerHTML = `
      <div><strong>${escapeHtml(currentDefinition.name || "Definition")}</strong> · ${escapeHtml(currentNormalizedType || "unknown")}</div>
      <div>${formatTokenCount(report.usedTokens)}/${formatTokenCount(report.limitTokens)} tokens (${formatPercent((report.usedTokens / report.limitTokens) * 100)}) · object type: ${escapeHtml(report.objectTypeLabel)}</div>
      ${selectedPrompt ? `<div>Selected prompt: <strong>${escapeHtml(selectedPrompt.name)}</strong> (${formatTokenCount(selectedPromptTokens)} tokens)</div>` : ""}
    `;

    contextSizeMatrix.innerHTML = report.matrixCells
      .map((key) => `<span class="context-size-cell ${escapeHtml(key)}" aria-hidden="true"></span>`)
      .join("");

    contextSizeBreakdown.innerHTML = report.categories
      .map((item) => `
        <div class="context-size-breakdown-row">
          <span class="context-size-dot ${escapeHtml(item.colorClass)}" aria-hidden="true"></span>
          <span>${escapeHtml(item.label)}:</span>
          <strong>${formatTokenCount(item.tokens)} tokens (${formatPercent(item.percent)})</strong>
        </div>
      `)
      .join("");

    contextSizeDetails.innerHTML = report.categories
      .filter((item) => item.key !== "free")
      .map((item) => `
        <article class="context-size-detail-card">
          <h4>${escapeHtml(item.label)}</h4>
          <p>${escapeHtml(item.description)}</p>
          <div>${formatTokenCount(item.tokens)} tokens · ${formatPercent(item.percent)} of context window</div>
        </article>
      `)
      .join("");
  }

  function selectOptionByValue(value) {
    const selected = TOKEN_OPTIONS.find((option) => option.value === value) || TOKEN_OPTIONS[1];
    contextSizeLimitSelect.value = String(selected.value);
    return selected.value;
  }

  async function getInitialLimitForDefinition(definitionContent) {
    const definitionContext = extractContextLengthCandidate(definitionContent);
    if (definitionContext) {
      return definitionContext;
    }

    const projectPath = String(getCurrentDevProjectPath?.() || "").trim();
    if (projectPath) {
      try {
        const projectLimit = await fetchProjectContextWindow(projectPath);
        if (Number.isFinite(projectLimit) && projectLimit > 0) {
          return Math.floor(projectLimit);
        }
      } catch (_error) {
        // Ignore and fallback.
      }
    }

    return 1_000_000;
  }

  function initializeDropdown() {
    contextSizeLimitSelect.innerHTML = TOKEN_OPTIONS
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join("");

    contextSizeLimitSelect.addEventListener("change", () => {
      const selected = Number(contextSizeLimitSelect.value || 1_000_000);
      renderReport(selected);
    });
  }

  async function renderForDefinition(definition) {
    currentDefinition = definition;
    currentNormalizedType = normalizeFilterType(definition?.type || "unknown");
    promptOptions = extractPromptOptionsFromDefinition({ definition, normalizedType: currentNormalizedType });
    selectedPromptId = promptOptions[0]?.id || "";
    renderPromptSelector();
    const initialLimit = await getInitialLimitForDefinition(definition?.content || "");
    const selectedLimit = selectOptionByValue(initialLimit);
    renderReport(selectedLimit);
  }

  initializeDropdown();

  return {
    renderForDefinition,
  };
}
