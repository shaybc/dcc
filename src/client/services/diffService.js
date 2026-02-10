function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function splitLines(value) {
  return String(value || "").replace(/\r\n/g, "\n").split("\n");
}

function normalizeLineForCompare(line, ignoreWhitespace) {
  if (!ignoreWhitespace) {
    return line;
  }
  return line.trim().replace(/\s+/g, " ");
}

function buildLineDiff(fromText, toText, ignoreWhitespace = false) {
  const left = splitLines(fromText);
  const right = splitLines(toText);
  const max = Math.max(left.length, right.length);
  const rows = [];
  let added = 0;
  let removed = 0;
  let modified = 0;

  for (let index = 0; index < max; index += 1) {
    const oldLine = left[index];
    const newLine = right[index];
    const oldPresent = typeof oldLine === "string";
    const newPresent = typeof newLine === "string";

    if (!oldPresent && newPresent) {
      rows.push({ type: "added", oldLineNum: "", newLineNum: index + 1, oldContent: "", newContent: newLine });
      added += 1;
      continue;
    }

    if (oldPresent && !newPresent) {
      rows.push({ type: "removed", oldLineNum: index + 1, newLineNum: "", oldContent: oldLine, newContent: "" });
      removed += 1;
      continue;
    }

    const same = normalizeLineForCompare(oldLine, ignoreWhitespace) === normalizeLineForCompare(newLine, ignoreWhitespace);
    if (same) {
      rows.push({ type: "context", oldLineNum: index + 1, newLineNum: index + 1, oldContent: oldLine, newContent: newLine });
    } else {
      rows.push({ type: "modified", oldLineNum: index + 1, newLineNum: index + 1, oldContent: oldLine, newContent: newLine });
      modified += 1;
    }
  }

  return { rows, stats: { added, removed, modified } };
}

function highlightModifiedPair(oldContent, newContent) {
  const oldValue = String(oldContent || "");
  const newValue = String(newContent || "");

  let prefix = 0;
  while (
    prefix < oldValue.length
    && prefix < newValue.length
    && oldValue[prefix] === newValue[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < (oldValue.length - prefix)
    && suffix < (newValue.length - prefix)
    && oldValue[oldValue.length - 1 - suffix] === newValue[newValue.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const oldPrefix = oldValue.slice(0, prefix);
  const newPrefix = newValue.slice(0, prefix);
  const oldChanged = oldValue.slice(prefix, oldValue.length - suffix);
  const newChanged = newValue.slice(prefix, newValue.length - suffix);
  const oldSuffix = oldValue.slice(oldValue.length - suffix);
  const newSuffix = newValue.slice(newValue.length - suffix);

  const oldMiddle = oldChanged
    ? `<span class="diff-word-removed">${escapeHtml(oldChanged)}</span>`
    : "";
  const newMiddle = newChanged
    ? `<span class="diff-word-added">${escapeHtml(newChanged)}</span>`
    : "";

  return {
    oldHtml: `${escapeHtml(oldPrefix)}${oldMiddle}${escapeHtml(oldSuffix)}`,
    newHtml: `${escapeHtml(newPrefix)}${newMiddle}${escapeHtml(newSuffix)}`
  };
}

export function createDiffService(config) {
  const state = {
    enabled: false,
    versions: [],
    viewMode: "side-by-side",
    ignoreWhitespace: false,
    changeIndex: 0,
    renderedChangeNodes: []
  };

  const els = config.elements;

  function setVisibility(active) {
    els.diffCompareBar.hidden = !active;
    els.diffVersionMode.hidden = !active;
    els.diffContainer.hidden = !active;
    els.detailContent.hidden = active;
    els.diffStatistics.hidden = !active;
    els.diffNavigation.hidden = !active;
  }

  function renderVersionOptions() {
    const options = [`<option value="current">Current (${escapeHtml(config.getCurrentVersion() || "unversioned")})</option>`]
      .concat(state.versions.map((version) => `<option value="${escapeHtml(version.version)}">${escapeHtml(version.version)} • ${escapeHtml(config.formatDate(version.commitDate))}</option>`));
    const html = options.join("");
    els.versionSelectA.innerHTML = html;
    els.versionSelectB.innerHTML = html;
    if (state.versions[0]?.version) {
      els.versionSelectA.value = state.versions[0].version;
    }
    els.versionSelectB.value = "current";
  }

  function updateStats(stats) {
    els.diffAddedLines.textContent = String(stats.added);
    els.diffRemovedLines.textContent = String(stats.removed);
    els.diffModifiedLines.textContent = String(stats.modified);
  }

  function updateChangeCounter() {
    const total = state.renderedChangeNodes.length;
    els.currentChangeIndex.textContent = total ? String(state.changeIndex + 1) : "0";
    els.totalChanges.textContent = String(total);
    els.prevChangeBtn.disabled = state.changeIndex <= 0;
    els.nextChangeBtn.disabled = total === 0 || state.changeIndex >= total - 1;
  }

  function collectChangeNodes() {
    state.renderedChangeNodes = [...els.diffContainer.querySelectorAll(
      ".diff-line-added, .diff-line-removed, .diff-line-modified, .diff-line-modified-old, .diff-line-modified-new"
    )];
    state.changeIndex = 0;
    updateChangeCounter();
  }

  function scrollToChange(index) {
    const node = state.renderedChangeNodes[index];
    if (!node) {
      return;
    }
    [...els.diffContainer.querySelectorAll(".diff-line-target")].forEach((line) => line.classList.remove("diff-line-target"));
    node.classList.add("diff-line-target");
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderSideBySide(rows) {
    const left = rows.map((row) => {
      if (row.type === "modified") {
        const highlighted = highlightModifiedPair(row.oldContent, row.newContent);
        return `<div class="diff-line diff-line-modified-old"><div class="diff-line-number">${row.oldLineNum || ""}</div><div class="diff-line-content">${highlighted.oldHtml}</div></div>`;
      }

      const type = row.type === "added" ? "empty" : row.type;
      return `<div class="diff-line diff-line-${type}"><div class="diff-line-number">${row.oldLineNum || ""}</div><div class="diff-line-content">${escapeHtml(row.oldContent)}</div></div>`;
    }).join("");

    const right = rows.map((row) => {
      if (row.type === "modified") {
        const highlighted = highlightModifiedPair(row.oldContent, row.newContent);
        return `<div class="diff-line diff-line-modified-new"><div class="diff-line-number">${row.newLineNum || ""}</div><div class="diff-line-content">${highlighted.newHtml}</div></div>`;
      }

      const type = row.type === "removed" ? "empty" : row.type;
      return `<div class="diff-line diff-line-${type}"><div class="diff-line-number">${row.newLineNum || ""}</div><div class="diff-line-content">${escapeHtml(row.newContent)}</div></div>`;
    }).join("");

    els.diffContainer.innerHTML = `
      <div class="diff-side-by-side">
        <section class="diff-panel"><div class="diff-panel-title">From</div>${left}</section>
        <section class="diff-panel"><div class="diff-panel-title">To</div>${right}</section>
      </div>
    `;

    const [leftPanel, rightPanel] = els.diffContainer.querySelectorAll(".diff-panel");
    if (leftPanel && rightPanel) {
      let syncing = false;
      leftPanel.addEventListener("scroll", () => {
        if (syncing) return;
        syncing = true;
        rightPanel.scrollTop = leftPanel.scrollTop;
        rightPanel.scrollLeft = leftPanel.scrollLeft;
        window.setTimeout(() => { syncing = false; }, 0);
      });
      rightPanel.addEventListener("scroll", () => {
        if (syncing) return;
        syncing = true;
        leftPanel.scrollTop = rightPanel.scrollTop;
        leftPanel.scrollLeft = rightPanel.scrollLeft;
        window.setTimeout(() => { syncing = false; }, 0);
      });
    }
  }

  function renderInline(rows) {
    const html = rows.map((row) => {
      if (row.type === "modified") {
        const highlighted = highlightModifiedPair(row.oldContent, row.newContent);
        return `
          <div class="diff-line diff-line-removed">
            <div class="diff-line-number old">${row.oldLineNum || ""}</div>
            <div class="diff-line-number"></div>
            <div class="diff-line-content">${highlighted.oldHtml}</div>
          </div>
          <div class="diff-line diff-line-added">
            <div class="diff-line-number old"></div>
            <div class="diff-line-number">${row.newLineNum || ""}</div>
            <div class="diff-line-content">${highlighted.newHtml}</div>
          </div>
        `;
      }

      const content = row.type === "added" ? row.newContent : row.oldContent;
      return `<div class="diff-line diff-line-${row.type}">
        <div class="diff-line-number old">${row.oldLineNum || ""}</div>
        <div class="diff-line-number">${row.newLineNum || ""}</div>
        <div class="diff-line-content">${escapeHtml(content)}</div>
      </div>`;
    }).join("");
    els.diffContainer.innerHTML = `<div class="diff-inline">${html}</div>`;
  }

  async function renderDiff() {
    if (!state.enabled) {
      return;
    }
    const from = els.versionSelectA.value;
    const to = els.versionSelectB.value;
    if (!from || !to || from === to) {
      els.diffContainer.innerHTML = '<div class="diff-empty">Select two different versions to compare.</div>';
      state.renderedChangeNodes = [];
      updateStats({ added: 0, removed: 0, modified: 0 });
      updateChangeCounter();
      return;
    }

    const [fromText, toText] = await Promise.all([
      config.fetchVersionContent(from),
      config.fetchVersionContent(to)
    ]);

    const diff = buildLineDiff(fromText, toText, state.ignoreWhitespace);
    if (state.viewMode === "side-by-side") {
      renderSideBySide(diff.rows);
    } else {
      renderInline(diff.rows);
    }

    updateStats(diff.stats);
    collectChangeNodes();
    if (state.renderedChangeNodes.length === 0) {
      els.diffContainer.innerHTML = '<div class="diff-empty">No changes between selected versions.</div>';
    }
  }

  function init() {
    els.diffControls.hidden = false;
    renderVersionOptions();

    els.enableDiffMode.addEventListener("change", async () => {
      state.enabled = els.enableDiffMode.checked;
      setVisibility(state.enabled);
      if (state.enabled) {
        await renderDiff();
      }
    });

    els.diffIgnoreWhitespace.addEventListener("change", async () => {
      state.ignoreWhitespace = els.diffIgnoreWhitespace.checked;
      await renderDiff();
    });

    [els.versionSelectA, els.versionSelectB].forEach((select) => {
      select.addEventListener("change", async () => {
        await renderDiff();
      });
    });

    [...els.diffModeButtons].forEach((button) => {
      button.addEventListener("click", async () => {
        state.viewMode = button.dataset.mode === "inline" ? "inline" : "side-by-side";
        [...els.diffModeButtons].forEach((candidate) => candidate.classList.toggle("active", candidate === button));
        await renderDiff();
      });
    });

    els.prevChangeBtn.addEventListener("click", () => {
      if (state.changeIndex <= 0) {
        return;
      }
      state.changeIndex -= 1;
      updateChangeCounter();
      scrollToChange(state.changeIndex);
    });

    els.nextChangeBtn.addEventListener("click", () => {
      if (state.changeIndex >= state.renderedChangeNodes.length - 1) {
        return;
      }
      state.changeIndex += 1;
      updateChangeCounter();
      scrollToChange(state.changeIndex);
    });

    setVisibility(false);
  }

  function setVersions(versions) {
    state.versions = Array.isArray(versions) ? versions : [];
    renderVersionOptions();
  }

  async function previewRestore(version) {
    els.enableDiffMode.checked = true;
    state.enabled = true;
    setVisibility(true);
    els.versionSelectA.value = version;
    els.versionSelectB.value = "current";
    await renderDiff();
  }

  return {
    init,
    setVersions,
    previewRestore,
    isDiffModeActive: () => state.enabled
  };
}
