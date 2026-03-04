import {
  TOKEN_OPTIONS,
  DEFAULT_CONTEXT_LIMIT,
  extractContextLengthCandidate,
  computeContextUsage,
  formatTokenCount,
  formatPercent,
} from "./contextSizeEstimator.js";
import {
  extractPromptOptionsFromDefinition,
  extractRuleReferencesFromDefinition,
  estimateRuleTokensFromDefinitionContent,
} from "./contextSizePrompts.js";

export function createContextSizePanelController({
  contextSizeLimitSelect,
  contextSizePromptSelector,
  contextSizePromptSelect,
  contextSizeSummary,
  contextSizeMatrix,
  contextSizeBreakdown,
  contextSizeDetails,
  getCurrentDevProjectPath,
  fetchProjectContextWindow,
  resolveDefinitionContentByReference,
  normalizeFilterType,
  escapeHtml,
}) {
  let currentDefinition = null;
  let currentNormalizedType = "unknown";
  let promptOptions = [];
  let selectedPromptId = "";
  let resolvedPromptTokensById = new Map();
  let resolvedRuleTokens = null;

  function getSelectedPromptOption() {
    return promptOptions.find((option) => option.id === selectedPromptId) || null;
  }

  function renderPromptSelector() {
    if (!contextSizePromptSelector || !contextSizePromptSelect) {
      return;
    }

    if (!Array.isArray(promptOptions) || promptOptions.length === 0) {
      contextSizePromptSelector.hidden = true;
      contextSizePromptSelect.hidden = true;
      contextSizePromptSelect.innerHTML = "";
      return;
    }

    contextSizePromptSelector.hidden = false;
    contextSizePromptSelect.hidden = false;
    contextSizePromptSelect.innerHTML = promptOptions
      .map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.name)}</option>`)
      .join("");
    contextSizePromptSelect.value = selectedPromptId;
  }

  function getResolvedPromptTokens(selectedPrompt) {
    if (!selectedPrompt) return 0;
    if (resolvedPromptTokensById.has(selectedPrompt.id)) {
      return Number(resolvedPromptTokensById.get(selectedPrompt.id) || 0);
    }
    return Number(selectedPrompt.tokens || 0);
  }

  function renderReport(limitTokens) {
    if (!currentDefinition) {
      return;
    }

    const selectedPrompt = getSelectedPromptOption();
    const selectedPromptTokens = getResolvedPromptTokens(selectedPrompt);
    const report = computeContextUsage({
      content: currentDefinition.content || "",
      normalizedType: currentNormalizedType,
      limitTokens,
      selectedPromptTokens,
      resolvedInstructionTokens: resolvedRuleTokens,
      resolvedPromptTokens: selectedPrompt ? selectedPromptTokens : null,
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
    const selected = TOKEN_OPTIONS.find((option) => option.value === value)
      || TOKEN_OPTIONS.find((option) => option.value === DEFAULT_CONTEXT_LIMIT)
      || TOKEN_OPTIONS[TOKEN_OPTIONS.length - 1];
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

    return DEFAULT_CONTEXT_LIMIT;
  }

  function initializeDropdowns() {
    contextSizeLimitSelect.innerHTML = TOKEN_OPTIONS
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join("");

    contextSizeLimitSelect.addEventListener("change", () => {
      const selected = Number(contextSizeLimitSelect.value || DEFAULT_CONTEXT_LIMIT);
      renderReport(selected);
    });

    contextSizePromptSelect?.addEventListener("change", () => {
      selectedPromptId = String(contextSizePromptSelect.value || "");
      const selected = Number(contextSizeLimitSelect.value || DEFAULT_CONTEXT_LIMIT);
      renderReport(selected);
    });
  }

  async function renderForDefinition(definition) {
    currentDefinition = definition;
    currentNormalizedType = normalizeFilterType(definition?.type || "unknown");
    promptOptions = extractPromptOptionsFromDefinition({ definition, normalizedType: currentNormalizedType });
    selectedPromptId = promptOptions[0]?.id || "";
    resolvedPromptTokensById = new Map();
    resolvedRuleTokens = null;
    renderPromptSelector();

    if (typeof resolveDefinitionContentByReference === "function") {
      await Promise.all(promptOptions.map(async (option) => {
        if (!option?.reference) return;
        try {
          const content = await resolveDefinitionContentByReference({ type: "prompts", reference: option.reference });
          if (typeof content === "string" && content.trim()) {
            resolvedPromptTokensById.set(option.id, Math.ceil(content.length / 4));
          }
        } catch (_error) {
          // Ignore and fallback to local estimate.
        }
      }));

      try {
        const definitionContent = String(definition?.content || "");
        const referencedRules = extractRuleReferencesFromDefinition(definitionContent);
        if (referencedRules.length > 0) {
          const rulesContents = await Promise.all(
            referencedRules.map((reference) => resolveDefinitionContentByReference({ type: "rules", reference }))
          );
          resolvedRuleTokens = rulesContents
            .map((content) => estimateRuleTokensFromDefinitionContent(content))
            .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
        }
      } catch (_error) {
        resolvedRuleTokens = null;
      }
    }

    const initialLimit = await getInitialLimitForDefinition(definition?.content || "");
    const selectedLimit = selectOptionByValue(initialLimit);
    renderReport(selectedLimit);
  }

  initializeDropdowns();

  return {
    renderForDefinition,
  };
}
