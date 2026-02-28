export function createRunBuilderParamsController({
  runPromptInput,
  runPromptCharCount,
  runPromptStage,
  runParamsStage,
  runParamVerbose,
  runParamReadonly,
  runParamDenyRead,
  runParamDenyList,
  runParamDenySearch,
  runParamDenyFetch,
  runParamDenyDiff,
  runParamAllowWrite,
  runParamAllowEdit,
  runParamAllowMultiEdit,
  runParamAllowTerminal,
  runParamAllowOnlyEnabled,
  runParamAllowOnlyList,
  runParamAllowOnlyAdd,
  runParamDenyTerminalEnabled,
  runParamDenyTerminalList,
  runParamDenyTerminalAdd,
}) {
  function applyRunBuilderParams(runOptions = {}) {
    const options = runOptions || {};
    if (runParamVerbose) runParamVerbose.checked = Boolean(options.verbose);
    if (runParamReadonly) runParamReadonly.checked = Boolean(options.readonly);
    if (runParamDenyRead) runParamDenyRead.checked = Boolean(options.denyRead);
    if (runParamDenyList) runParamDenyList.checked = Boolean(options.denyList);
    if (runParamDenySearch) runParamDenySearch.checked = Boolean(options.denySearch);
    if (runParamDenyFetch) runParamDenyFetch.checked = Boolean(options.denyFetch);
    if (runParamDenyDiff) runParamDenyDiff.checked = Boolean(options.denyDiff);
    if (runParamAllowWrite) runParamAllowWrite.checked = Boolean(options.allowWrite);
    if (runParamAllowEdit) runParamAllowEdit.checked = Boolean(options.allowEdit);
    if (runParamAllowMultiEdit) runParamAllowMultiEdit.checked = Boolean(options.allowMultiEdit);
    if (runParamAllowTerminal) runParamAllowTerminal.checked = Boolean(options.allowTerminal);
    if (runParamAllowOnlyEnabled) runParamAllowOnlyEnabled.checked = Array.isArray(options.allowOnly) && options.allowOnly.length > 0;
    if (runParamDenyTerminalEnabled) runParamDenyTerminalEnabled.checked = Array.isArray(options.denyTerminalCommands) && options.denyTerminalCommands.length > 0;

    if (runParamAllowOnlyList) {
      runParamAllowOnlyList.innerHTML = "";
      for (const value of Array.isArray(options.allowOnly) ? options.allowOnly : []) {
        createRunParamArrayInput(runParamAllowOnlyList, "*.ts");
        const input = runParamAllowOnlyList.lastElementChild?.querySelector(".run-param-array-input");
        if (input) input.value = String(value || "");
      }
    }

    if (runParamDenyTerminalList) {
      runParamDenyTerminalList.innerHTML = "";
      for (const value of Array.isArray(options.denyTerminalCommands) ? options.denyTerminalCommands : []) {
        createRunParamArrayInput(runParamDenyTerminalList, "npm install");
        const input = runParamDenyTerminalList.lastElementChild?.querySelector(".run-param-array-input");
        if (input) input.value = String(value || "");
      }
    }

    updateRunBuilderParamState();
  }

  function collectRunBuilderParams() {
    return {
      verbose: Boolean(runParamVerbose?.checked),
      readonly: Boolean(runParamReadonly?.checked),
      denyRead: Boolean(runParamDenyRead?.checked),
      denyList: Boolean(runParamDenyList?.checked),
      denySearch: Boolean(runParamDenySearch?.checked),
      denyFetch: Boolean(runParamDenyFetch?.checked),
      denyDiff: Boolean(runParamDenyDiff?.checked),
      allowWrite: Boolean(runParamAllowWrite?.checked),
      allowEdit: Boolean(runParamAllowEdit?.checked),
      allowMultiEdit: Boolean(runParamAllowMultiEdit?.checked),
      allowTerminal: Boolean(runParamAllowTerminal?.checked),
      allowOnly: runParamAllowOnlyEnabled?.checked ? getRunParamArrayValues(runParamAllowOnlyList) : [],
      denyTerminalCommands: runParamDenyTerminalEnabled?.checked ? getRunParamArrayValues(runParamDenyTerminalList) : []
    };
  }

  function resetRunBuilderParams() {
    [
      runParamVerbose,
      runParamReadonly,
      runParamDenyRead,
      runParamDenyList,
      runParamDenySearch,
      runParamDenyFetch,
      runParamDenyDiff,
      runParamAllowWrite,
      runParamAllowEdit,
      runParamAllowMultiEdit,
      runParamAllowTerminal,
      runParamAllowOnlyEnabled,
      runParamDenyTerminalEnabled
    ]
      .forEach((checkbox) => {
        if (checkbox) checkbox.checked = false;
      });

    if (runParamAllowOnlyList) runParamAllowOnlyList.innerHTML = "";
    if (runParamDenyTerminalList) runParamDenyTerminalList.innerHTML = "";
    updateRunBuilderParamState();
  }

  function updateRunBuilderParamState() {
    const readonlyEnabled = Boolean(runParamReadonly?.checked);
    if (readonlyEnabled) {
      [
        runParamDenyRead,
        runParamDenyList,
        runParamDenySearch,
        runParamDenyFetch,
        runParamDenyDiff,
        runParamAllowWrite,
        runParamAllowEdit,
        runParamAllowMultiEdit,
        runParamAllowTerminal,
        runParamAllowOnlyEnabled,
        runParamDenyTerminalEnabled
      ].forEach((checkbox) => {
        if (checkbox) checkbox.checked = false;
      });

      if (runParamAllowOnlyList) runParamAllowOnlyList.innerHTML = "";
      if (runParamDenyTerminalList) runParamDenyTerminalList.innerHTML = "";
    }

    const allowOnlyEnabled = Boolean(runParamAllowOnlyEnabled?.checked);
    const denyTerminalEnabled = Boolean(runParamDenyTerminalEnabled?.checked);

    if (allowOnlyEnabled && runParamAllowWrite?.checked) {
      runParamAllowWrite.checked = false;
    }

    if (runParamAllowOnlyList) runParamAllowOnlyList.hidden = !allowOnlyEnabled;
    if (runParamAllowOnlyAdd) runParamAllowOnlyAdd.hidden = !allowOnlyEnabled;
    if (runParamDenyTerminalList) runParamDenyTerminalList.hidden = !denyTerminalEnabled;
    if (runParamDenyTerminalAdd) runParamDenyTerminalAdd.hidden = !denyTerminalEnabled;

    const hasAnySelected = Boolean(
      runParamVerbose?.checked
      || runParamReadonly?.checked
      || runParamDenyRead?.checked
      || runParamDenyList?.checked
      || runParamDenySearch?.checked
      || runParamDenyFetch?.checked
      || runParamDenyDiff?.checked
      || runParamAllowWrite?.checked
      || runParamAllowEdit?.checked
      || runParamAllowMultiEdit?.checked
      || runParamAllowTerminal?.checked
      || (allowOnlyEnabled && getRunParamArrayValues(runParamAllowOnlyList).length)
      || (denyTerminalEnabled && getRunParamArrayValues(runParamDenyTerminalList).length)
    );
    runParamsStage?.classList.toggle("filled", hasAnySelected);
  }

  function createRunParamArrayInput(container, placeholder) {
    if (!container) return;
    const row = document.createElement("div");
    row.className = "run-param-array-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "run-param-array-input";
    input.placeholder = placeholder;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "run-param-remove";
    removeButton.setAttribute("aria-label", "Remove value");
    removeButton.textContent = "✕";

    removeButton.addEventListener("click", () => {
      row.remove();
      updateRunBuilderParamState();
    });
    input.addEventListener("input", updateRunBuilderParamState);

    row.append(input, removeButton);
    container.appendChild(row);
  }

  function getRunParamArrayValues(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(".run-param-array-input"))
      .map((input) => String(input.value || "").trim())
      .filter(Boolean);
  }

  function handleRunBuilderPromptInput() {
    if (!runPromptInput || !runPromptCharCount || !runPromptStage) return;
    const length = runPromptInput.value.length;
    runPromptCharCount.textContent = `${length} chars`;
    runPromptStage.classList.toggle("filled", length > 0);
  }

  function formatRunOptionSummary(runOptions = {}) {
    const options = runOptions || {};
    const labels = [];
    if (options.verbose) labels.push("--verbose");
    if (options.readonly) labels.push("--readonly");
    if (options.denyRead) labels.push("--exclude Read");
    if (options.denyList) labels.push("--exclude List");
    if (options.denySearch) labels.push("--exclude Search");
    if (options.denyFetch) labels.push("--exclude Fetch");
    if (options.denyDiff) labels.push("--exclude Diff");
    if (options.allowWrite) labels.push("--allow Write");
    if (options.allowEdit) labels.push("--allow Edit");
    if (options.allowMultiEdit) labels.push("--allow MultiEdit");
    if (options.allowTerminal) labels.push("--allow Bash(*)");

    for (const pattern of Array.isArray(options.allowOnly) ? options.allowOnly : []) {
      labels.push(`--allow Write(**/${String(pattern)})`);
    }
    const denied = Array.isArray(options.denyTerminalCommands) ? options.denyTerminalCommands : [];
    if (denied.length) {
      if (!options.allowTerminal) labels.push("--allow Bash(*)");
      for (const command of denied) {
        labels.push(`--exclude Bash(${String(command)}*)`);
      }
    }

    return labels.length ? labels.join(" | ") : "—";
  }

  return {
    applyRunBuilderParams,
    collectRunBuilderParams,
    resetRunBuilderParams,
    updateRunBuilderParamState,
    createRunParamArrayInput,
    getRunParamArrayValues,
    handleRunBuilderPromptInput,
    formatRunOptionSummary,
  };
}
