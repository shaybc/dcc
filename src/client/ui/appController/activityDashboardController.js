export function createActivityDashboardController({
  elements,
  activityUtils,
  activityRunUtils,
  formatRunOptionSummary,
  escapeHtml,
  fetchWithErrorHandling,
  agentRunsEndpoint,
  updatePageTabBadges,
  prefillRunBuilderFromActivityRun,
  setActiveTopPage,
  getActiveTopPage,
}) {
  const {
    activityPage,
    activityList,
    activityFilters,
    activityDetailEmpty,
    activityDetailCard,
    activityDetailName,
    activityDetailStatus,
    activityDetailRunId,
    activityDetailAgent,
    activityDetailConfig,
    activityDetailAgentPath,
    activityDetailConfigPath,
    activityDetailPid,
    activityDetailStarted,
    activityDetailDuration,
    activityDetailExit,
    activityDetailSelectedParams,
    activityDetailCommandLine,
    activityLog,
    activityLiveDot,
    activityStreamBackdrop,
    activityStreamPanel,
    activityOpenStreamButton,
    activityCloseStreamButton,
    activityCancelButton,
    activityRerunButton,
    activityRefreshButton,
    activityWrapButton,
    activityClearLogsButton,
    activityCopyLogsButton,
    activityScrollLockButton,
    activityExportLogsButton,
    activityNewRunButton,
    activityLastUpdated,
    activityStatLaunched,
    activityStatRunning,
    activityStatFinished,
    activityStatCancelled,
  } = elements;

  const {
    getRunNameFromPath,
    setActivityDefinitionLink,
    openDefinitionDetailsByPath,
  } = activityUtils;

  const {
    formatDuration,
    formatDurationSeconds,
    getFullRunPath,
    getLogTimestamp,
    getRunElapsedSeconds,
    getStatusGroupLabel,
    getStatusIcon,
    isRunCancelable,
    isRunLive,
    mapRunStatus,
  } = activityRunUtils;

  let activityRuns = [];
  let activityFilter = "all";
  let activitySelectedRunId = "";
  let activityLogsSince = 0;
  let activityLogEntries = [];
  let activityWrapEnabled = true;
  let activityScrollLocked = true;
  let activityPollTimer = null;
  let activityTickerTimer = null;
  let activityRenderSignature = null;
  let isActivityStreamOpen = false;

  function renderActivityStats() {
    if (!activityStatRunning || !activityStatLaunched || !activityStatFinished || !activityStatCancelled) return;
    const counts = { running: 0, launched: 0, finished: 0, cancelled: 0 };
    activityRuns.forEach((run) => {
      const status = mapRunStatus(run);
      counts[status] = (counts[status] || 0) + 1;
    });
    activityStatRunning.textContent = String(counts.running || 0);
    activityStatLaunched.textContent = String(counts.launched || 0);
    activityStatFinished.textContent = String(counts.finished || 0);
    activityStatCancelled.textContent = String(counts.cancelled || 0);
    updatePageTabBadges();
  }

  function renderActivityList() {
    if (!activityList) return;
    const items = activityRuns.filter((run) => activityFilter === "all" || mapRunStatus(run) === activityFilter);
    if (!items.length) {
      activityList.innerHTML = '<p class="activity-list-empty">No agent runs match this filter.</p>';
      return;
    }

    const groupOrder = ["running", "launched", "finished", "cancelled"];
    const groupedRuns = new Map(groupOrder.map((status) => [status, []]));
    items.forEach((run) => {
      const status = mapRunStatus(run);
      if (!groupedRuns.has(status)) {
        groupedRuns.set(status, []);
      }
      groupedRuns.get(status).push(run);
    });

    const statusesToRender = [
      ...groupOrder.filter((status) => (groupedRuns.get(status) || []).length),
      ...Array.from(groupedRuns.keys()).filter((status) => !groupOrder.includes(status) && (groupedRuns.get(status) || []).length),
    ];

    let animationIndex = 0;
    activityList.innerHTML = statusesToRender
      .map((status) => {
        const rows = (groupedRuns.get(status) || []).map((run) => {
          const agentName = getRunNameFromPath(run.agentPath, run.runId);
          const configName = getRunNameFromPath(run.configPath, "config");
          const runSeconds = getRunElapsedSeconds(run);
          const canCancel = isRunCancelable(run);

          const rowMarkup = `
      <article class="activity-row ${activitySelectedRunId === run.runId ? "active" : ""} ${status}" data-run-id="${escapeHtml(run.runId)}" data-run-status="${status}" style="animation-delay:${(animationIndex * 0.04).toFixed(2)}s">
        <div class="activity-status-indicator ${status}">
          <span class="activity-spin-ring"></span>
          <span class="activity-status-icon">${getStatusIcon(status)}</span>
          <span class="activity-pulse-dot"></span>
        </div>

        <div class="activity-row-info">
          <h3>${escapeHtml(agentName)}</h3>
          <div class="activity-row-meta">
            <span class="tag-pill">${escapeHtml(run.runId)}</span>
            <span class="activity-row-config">⚙ ${escapeHtml(configName)}</span>
            <span class="activity-row-pid">pid ${run.pid ?? "n/a"}</span>
          </div>
        </div>

        <div class="activity-row-timer">
          <div class="activity-row-timer-value ${status === "running" ? "running" : status === "launched" ? "launched" : ""}" data-activity-timer="${escapeHtml(run.runId)}">${formatDurationSeconds(runSeconds)}</div>
          <div class="activity-row-timer-label">${status === "running" ? "running" : status === "launched" ? "launching" : "duration"}</div>
        </div>

        <div class="activity-run-actions">
          <button type="button" title="View logs" data-activity-open="${escapeHtml(run.runId)}">≡</button>
          <button type="button" title="Re-run" data-activity-rerun="${escapeHtml(run.runId)}">↺</button>
          <button type="button" title="Cancel run" data-activity-kill="${escapeHtml(run.runId)}" ${canCancel ? "" : "disabled"}>✕</button>
        </div>
      </article>`;
          animationIndex += 1;
          return rowMarkup;
        }).join("");

        return `
        <section class="activity-group" data-status="${status}">
          <div class="activity-group-label" role="heading" aria-level="3">
            <span class="activity-group-label-text">${getStatusIcon(status)} ${escapeHtml(getStatusGroupLabel(status))}</span>
          </div>
          ${rows}
        </section>`;
      })
      .join("");
  }

  function renderActivityDetail() {
    if (!activityDetailCard || !activityDetailEmpty) return;
    const run = activityRuns.find((entry) => entry.runId === activitySelectedRunId);
    if (!run) {
      activityDetailCard.hidden = true;
      activityDetailEmpty.hidden = false;
      if (activityLog) {
        activityLog.innerHTML = '<div class="activity-log-empty">No logs loaded.</div>';
      }
      return;
    }

    const status = mapRunStatus(run);
    activityDetailEmpty.hidden = true;
    activityDetailCard.hidden = false;
    activityDetailName.textContent = getRunNameFromPath(run.agentPath, run.runId);
    activityDetailStatus.textContent = status;
    activityDetailStatus.className = `activity-status-badge ${status}`;
    activityDetailRunId.textContent = run.runId;
    setActivityDefinitionLink(activityDetailAgent, run.agentPath, run.runId);
    setActivityDefinitionLink(activityDetailConfig, run.configPath, "config");
    activityDetailAgentPath.textContent = getFullRunPath(run.agentPath);
    activityDetailConfigPath.textContent = getFullRunPath(run.configPath);
    activityDetailPid.textContent = run.pid ?? "n/a";
    activityDetailStarted.textContent = run.startedAt || run.createdAt || "—";
    activityDetailDuration.textContent = formatDuration(run.startedAt || run.createdAt, run.endedAt);
    activityDetailExit.textContent = run.exitCode ?? "—";
    if (activityDetailSelectedParams) {
      activityDetailSelectedParams.textContent = formatRunOptionSummary(run.runOptions || {});
    }
    if (activityDetailCommandLine) {
      activityDetailCommandLine.textContent = run.commandLine || run.command || "—";
    }
    activityCancelButton.disabled = !isRunCancelable(run);
    if (activityLiveDot) {
      activityLiveDot.hidden = !isRunLive(run);
    }
  }

  function openActivityStreamPanel() {
    if (!activitySelectedRunId || !activityStreamPanel || !activityStreamBackdrop) return;
    isActivityStreamOpen = true;
    activityStreamPanel.hidden = false;
    activityStreamPanel.classList.add("open");
    activityStreamBackdrop.hidden = false;
    document.body.classList.add("activity-stream-open");
    renderActivityLogStream();
  }

  function closeActivityStreamPanel() {
    if (!activityStreamPanel || !activityStreamBackdrop) return;
    isActivityStreamOpen = false;
    activityStreamPanel.classList.remove("open");
    activityStreamPanel.hidden = true;
    activityStreamBackdrop.hidden = true;
    document.body.classList.remove("activity-stream-open");
  }

  function renderActivityLogStream() {
    if (!activityLog) return;
    if (!activityLogEntries.length) {
      activityLog.innerHTML = '<div class="activity-log-empty">No logs loaded.</div>';
      return;
    }

    activityLog.innerHTML = activityLogEntries
      .map((entry) => {
        const level = String(entry?.level || "info").toLowerCase();
        const text = String(entry?.text || "");
        const className = ["activity-log-line", `level-${level}`].join(" ");
        return `<div class="${className}"><span class="activity-log-timestamp">${escapeHtml(getLogTimestamp(entry))}</span><span class="activity-log-message">${escapeHtml(text)}</span></div>`;
      })
      .join("");

    if (activityWrapButton) {
      activityWrapButton.classList.toggle("active", activityWrapEnabled);
    }
    activityLog.classList.toggle("no-wrap", !activityWrapEnabled);

    if (!activityScrollLocked) {
      activityLog.scrollTop = activityLog.scrollHeight;
    }
  }

  function updateActivityScrollLockState(locked, { forceScrollToBottom = false } = {}) {
    activityScrollLocked = Boolean(locked);
    activityScrollLockButton?.classList.toggle("active", activityScrollLocked);
    activityLog?.classList.toggle("scroll-locked", activityScrollLocked);
    if (forceScrollToBottom && activityLog) {
      activityLog.scrollTop = activityLog.scrollHeight;
    }
  }

  function refreshVisibleTimers() {
    activityList?.querySelectorAll("[data-activity-timer]").forEach((timerNode) => {
      const runId = timerNode.getAttribute("data-activity-timer") || "";
      const run = activityRuns.find((entry) => entry.runId === runId);
      if (!run) return;
      timerNode.textContent = formatDurationSeconds(getRunElapsedSeconds(run));
    });
    if (activitySelectedRunId) {
      const selectedRun = activityRuns.find((run) => run.runId === activitySelectedRunId);
      if (selectedRun) {
        activityDetailDuration.textContent = formatDuration(selectedRun.startedAt || selectedRun.createdAt, selectedRun.endedAt);
      }
    }
  }

  function buildActivityRenderSignature(runs) {
    return runs.map((run) => [run.runId, run.status, run.pid, run.startedAt, run.endedAt, run.exitCode].join("|")).join(";");
  }

  async function loadActivityRuns() {
    const response = await fetchWithErrorHandling(agentRunsEndpoint, {}, "Unable to load activity runs.");
    const runs = Array.isArray(response?.runs) ? response.runs : [];
    const nextSignature = buildActivityRenderSignature(runs);

    activityRuns = runs;
    if (activityLastUpdated) {
      activityLastUpdated.textContent = new Date().toLocaleTimeString();
    }

    if (!activitySelectedRunId && runs.length > 0) {
      activitySelectedRunId = runs[0].runId;
    }

    const selectedExists = activityRuns.some((entry) => entry.runId === activitySelectedRunId);
    if (!selectedExists) {
      activitySelectedRunId = activityRuns[0]?.runId || "";
      activityLogEntries = [];
      activityLogsSince = 0;
    }

    if (nextSignature !== activityRenderSignature) {
      activityRenderSignature = nextSignature;
      renderActivityStats();
      renderActivityList();
      renderActivityDetail();
    }
    refreshVisibleTimers();
    return activityRuns;
  }

  async function loadActivityLogs(fullReload = false) {
    if (!activitySelectedRunId) {
      activityLogEntries = [];
      activityLogsSince = 0;
      renderActivityLogStream();
      return;
    }

    if (fullReload) {
      activityLogsSince = 0;
      activityLogEntries = [];
    }

    const endpoint = `${agentRunsEndpoint}/${encodeURIComponent(activitySelectedRunId)}/logs?since=${encodeURIComponent(activityLogsSince || 0)}`;
    const response = await fetchWithErrorHandling(endpoint, {}, "Unable to load run logs.");
    const entries = Array.isArray(response?.entries) ? response.entries : [];
    if (entries.length > 0) {
      activityLogEntries = fullReload ? entries : [...activityLogEntries, ...entries];
      const maxTimestamp = entries.reduce((max, entry) => Math.max(max, Number(entry?.timestamp || 0)), activityLogsSince || 0);
      activityLogsSince = maxTimestamp;
    }
    renderActivityLogStream();
  }

  function clearActivityPolling() {
    if (activityPollTimer) {
      clearTimeout(activityPollTimer);
      activityPollTimer = null;
    }
  }

  function hasLiveActivityRuns() {
    return activityRuns.some((run) => isRunLive(run));
  }

  function startActivityPolling() {
    clearActivityPolling();
    activityPollTimer = setTimeout(pollActivity, 1800);
  }

  async function pollActivity() {
    await loadActivityRuns();
    if (activitySelectedRunId) {
      await loadActivityLogs(false);
    }
    if (!hasLiveActivityRuns()) {
      clearActivityPolling();
      return;
    }
    activityPollTimer = setTimeout(pollActivity, 1800);
  }

  function setActivityFilter(filter) {
    activityFilter = filter || "all";
    activityFilters?.querySelectorAll("[data-activity-filter]").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-activity-filter") === activityFilter);
    });
    renderActivityList();
    refreshVisibleTimers();
  }

  async function selectActivityRun(runId) {
    activitySelectedRunId = runId;
    renderActivityList();
    renderActivityDetail();
    await loadActivityLogs(true);
  }

  async function killActivityRun(runId) {
    const response = await fetch(`${agentRunsEndpoint}/${encodeURIComponent(runId)}/kill`, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || `Unable to cancel run (${response.status})`);
    }
    await loadActivityRuns();
    if (activitySelectedRunId === runId) {
      await loadActivityLogs(true);
      renderActivityDetail();
    }
  }

  function setupActivityDashboard() {
    if (!activityPage) return;

    activityFilters?.querySelectorAll("[data-activity-filter]").forEach((button) => {
      button.addEventListener("click", () => setActivityFilter(button.getAttribute("data-activity-filter") || "all"));
    });

    activityList?.addEventListener("click", (event) => {
      const killButton = event.target.closest("[data-activity-kill]");
      if (killButton) {
        event.stopPropagation();
        const runId = killButton.getAttribute("data-activity-kill") || "";
        if (runId) {
          killActivityRun(runId).catch((error) => window.alert(error?.message || "Unable to cancel run."));
        }
        return;
      }

      const rerunButton = event.target.closest("[data-activity-rerun]");
      if (rerunButton) {
        event.stopPropagation();
        const runId = rerunButton.getAttribute("data-activity-rerun") || "";
        void prefillRunBuilderFromActivityRun(runId);
        setActiveTopPage("agents");
        return;
      }

      const openButton = event.target.closest("[data-activity-open]");
      const row = event.target.closest("[data-run-id]");
      const runId = openButton?.getAttribute("data-activity-open") || row?.getAttribute("data-run-id") || "";
      if (runId) {
        const shouldOpenStream = Boolean(openButton);
        selectActivityRun(runId).then(() => {
          if (shouldOpenStream) {
            openActivityStreamPanel();
          }
        }).catch(() => {});
      }
    });

    [activityDetailAgent, activityDetailConfig].forEach((element) => {
      element?.addEventListener("click", () => {
        if (!activitySelectedRunId) return;
        const run = activityRuns.find((entry) => entry.runId === activitySelectedRunId);
        if (!run) return;
        const pathValue = element === activityDetailAgent ? run.agentPath : run.configPath;
        openDefinitionDetailsByPath(pathValue);
      });
      element?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        element.click();
      });
    });

    activityRefreshButton?.addEventListener("click", () => {
      loadActivityRuns().then(() => {
        if (activitySelectedRunId) return loadActivityLogs(false);
        return null;
      }).finally(() => {
        if (getActiveTopPage() === "activity" && hasLiveActivityRuns() && !activityPollTimer) {
          startActivityPolling();
        }
      });
    });

    activityCancelButton?.addEventListener("click", () => {
      if (!activitySelectedRunId) return;
      killActivityRun(activitySelectedRunId).catch((error) => window.alert(error?.message || "Unable to cancel run."));
    });

    activityRerunButton?.addEventListener("click", () => {
      void prefillRunBuilderFromActivityRun(activitySelectedRunId);
      setActiveTopPage("agents");
    });

    activityOpenStreamButton?.addEventListener("click", () => {
      if (!activitySelectedRunId) return;
      openActivityStreamPanel();
    });

    activityCloseStreamButton?.addEventListener("click", () => {
      closeActivityStreamPanel();
    });

    activityStreamBackdrop?.addEventListener("click", () => {
      closeActivityStreamPanel();
    });

    activityWrapButton?.addEventListener("click", () => {
      activityWrapEnabled = !activityWrapEnabled;
      activityWrapButton.classList.toggle("active", activityWrapEnabled);
      activityLog?.classList.toggle("no-wrap", !activityWrapEnabled);
    });

    activityClearLogsButton?.addEventListener("click", () => {
      activityLogEntries = [];
      renderActivityLogStream();
    });

    updateActivityScrollLockState(activityScrollLocked);

    activityScrollLockButton?.addEventListener("click", () => {
      const nextLockedState = !activityScrollLocked;
      updateActivityScrollLockState(nextLockedState, { forceScrollToBottom: !nextLockedState });
    });

    activityCopyLogsButton?.addEventListener("click", async () => {
      const raw = activityLogEntries.map((entry) => `[${getLogTimestamp(entry)}] ${String(entry?.text || "").trimEnd()}`).join("\n");
      if (!raw) return;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(raw);
      }
    });

    activityExportLogsButton?.addEventListener("click", () => {
      if (!activitySelectedRunId || !activityLogEntries.length) return;
      const raw = activityLogEntries.map((entry) => `[${getLogTimestamp(entry)}] ${String(entry?.text || "").trimEnd()}`).join("\n");
      const blob = new Blob([raw], { type: "text/plain" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${activitySelectedRunId}-logs.txt`;
      anchor.click();
    });

    activityNewRunButton?.addEventListener("click", () => {
      setActiveTopPage("agents");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isActivityStreamOpen) {
        closeActivityStreamPanel();
      }
    });

    if (!activityTickerTimer) {
      activityTickerTimer = setInterval(refreshVisibleTimers, 1000);
    }

    loadActivityRuns().catch(() => {});
  }

  function refreshActivityPanels() {
    renderActivityList();
    renderActivityDetail();
  }

  function handleTopPageChange(page) {
    if (page === "activity") {
      startActivityPolling();
    } else {
      clearActivityPolling();
      closeActivityStreamPanel();
    }
  }

  return {
    setupActivityDashboard,
    refreshActivityPanels,
    handleTopPageChange,
    getRunById: (runId) => activityRuns.find((run) => run.runId === runId),
    getRuns: () => activityRuns,
  };
}
