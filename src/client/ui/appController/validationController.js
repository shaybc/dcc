export function createValidationController({
  escapeHtml,
  validationSeverityFilter,
  validationResults,
  validationLastRun,
  runValidationButton,
  validationStrictToggle,
  validationLintToggle,
  validationReferencesToggle,
  validationAutoRunToggle,
  definitionTabPreview,
  definitionTabSource,
  definitionTabContextSize,
  definitionTabTest,
  definitionPreviewPanel,
  definitionSourcePanel,
  definitionContextSizePanel,
  definitionTestPanel,
  fetchWithErrorHandling,
  getCurrentDetailDefinitionId,
  getValidationAutoRunTimeout,
  setValidationAutoRunTimeout,
  setLastValidationResult,
}) {
  function formatValidationSummary(status, summary) {
    const label = String(status || "").toUpperCase() || "UNKNOWN";
    const statusIcon = status === "success" ? "✅" : status === "failure" ? "❌" : "⚠️";
    return `<div class="validation-summary status-${escapeHtml(status || "unknown")}"><span class="validation-status-icon" aria-hidden="true">${statusIcon}</span>${label} · ${summary.errors} errors · ${summary.warnings} warnings · ${summary.infos} info</div>`;
  }

  function validationCheckIcon(check) {
    return check.passed ? '<span class="check-result-icon check-result-pass" aria-hidden="true">✓</span>' : '<span class="check-result-icon check-result-fail" aria-hidden="true">✕</span>';
  }

  function renderValidationChecks(checks, severityFilter) {
    const grouped = { schema: [], lint: [], reference: [] };
    checks.forEach((check) => {
      if (severityFilter !== "all" && check.severity !== severityFilter) {
        return;
      }
      const category = grouped[check.category] ? check.category : "lint";
      grouped[category].push(check);
    });

    return Object.entries(grouped).map(([category, entries]) => {
      const title = category.charAt(0).toUpperCase() + category.slice(1);
      const body = entries.length === 0
        ? '<div class="validation-group-empty">No checks in this category.</div>'
        : entries.map((check) => {
          const location = check.location?.line ? ` <span class="validation-location">(L${check.location.line}${check.location.col ? `:C${check.location.col}` : ""})</span>` : "";
          return `<li>${validationCheckIcon(check)}<span class="severity-badge severity-${check.severity}">${check.severity}</span> ${escapeHtml(check.message)}${location}${check.path ? ` <code>${escapeHtml(check.path)}</code>` : ""}</li>`;
        }).join("");

      return `<div class="validation-group"><h4>${title} checks</h4>${entries.length ? `<ul>${body}</ul>` : body}</div>`;
    }).join("");
  }

  function renderValidationResult(result) {
    const severityFilter = validationSeverityFilter?.value || "all";
    const checksHtml = renderValidationChecks(Array.isArray(result?.checks) ? result.checks : [], severityFilter);
    validationResults.innerHTML = `
      ${formatValidationSummary(result?.status || "unknown", result?.summary || { errors: 0, warnings: 0, infos: 0 })}
      ${checksHtml}
      <details class="validation-raw-report">
        <summary>Raw report</summary>
        <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
      </details>
    `;
  }

  function updateValidationLastRun() {
    if (!validationLastRun) {
      return;
    }
    validationLastRun.textContent = `Last run: ${new Date().toLocaleString()}`;
  }

  async function runValidationForCurrentDefinition() {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!currentDetailDefinitionId) {
      return;
    }
    runValidationButton.disabled = true;
    try {
      const payload = await fetchWithErrorHandling(
        `/api/definitions/${currentDetailDefinitionId}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            options: {
              strict: Boolean(validationStrictToggle?.checked),
              lint: Boolean(validationLintToggle?.checked),
              references: Boolean(validationReferencesToggle?.checked),
            },
          }),
        },
        "Unable to validate definition.",
        {
          title: "Running validation...",
          description: "Checking schema, lint, and references.",
        }
      );
      setLastValidationResult(payload);
      renderValidationResult(payload);
      updateValidationLastRun();
    } catch (error) {
      validationResults.innerHTML = `<div class="validation-error">${escapeHtml(error.message || "Validation failed")}</div>`;
    } finally {
      runValidationButton.disabled = false;
    }
  }

  function scheduleValidationRun() {
    const validationAutoRunTimeout = getValidationAutoRunTimeout();
    if (validationAutoRunTimeout) {
      window.clearTimeout(validationAutoRunTimeout);
    }
    const timeoutId = window.setTimeout(() => {
      runValidationForCurrentDefinition();
    }, 350);
    setValidationAutoRunTimeout(timeoutId);
  }

  function setDefinitionTab(activeTab) {
    const isPreview = activeTab === "preview";
    const isSource = activeTab === "source";
    const isContextSize = activeTab === "contextSize";
    const isTest = activeTab === "test";
    definitionTabPreview.classList.toggle("active", isPreview);
    definitionTabSource.classList.toggle("active", isSource);
    definitionTabContextSize.classList.toggle("active", isContextSize);
    definitionTabTest.classList.toggle("active", isTest);
    definitionTabPreview.setAttribute("aria-selected", String(isPreview));
    definitionTabSource.setAttribute("aria-selected", String(isSource));
    definitionTabContextSize.setAttribute("aria-selected", String(isContextSize));
    definitionTabTest.setAttribute("aria-selected", String(isTest));
    definitionPreviewPanel.hidden = !isPreview;
    definitionSourcePanel.hidden = !isSource;
    definitionContextSizePanel.hidden = !isContextSize;
    definitionTestPanel.hidden = !isTest;

    if (isTest && validationAutoRunToggle?.checked) {
      scheduleValidationRun();
    }
  }

  return {
    renderValidationResult,
    runValidationForCurrentDefinition,
    scheduleValidationRun,
    setDefinitionTab,
  };
}
