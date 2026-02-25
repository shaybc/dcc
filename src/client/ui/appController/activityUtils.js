export function createActivityUtils({
  definitionsRef,
  showDetails,
  activityLastUpdated,
  setActiveTopPage,
  updateRouteForDetails,
}) {
  let activityTickerTimer = null;

  function getRunNameFromPath(pathValue, fallback) {
    const path = String(pathValue || "").trim();
    if (!path) return fallback || "Run";
    const fileName = path.split(/[\\/]/).pop() || path;
    const baseName = fileName.replace(/\.[a-z0-9]+$/i, "").trim();
    return baseName || fallback || "Run";
  }

  function normalizeDefinitionPath(pathValue) {
    return String(pathValue || "")
      .replace(/\\+/g, "/")
      .replace(/^\/+/, "")
      .trim()
      .toLowerCase();
  }

  function findDefinitionByPath(pathValue) {
    const normalizedTarget = normalizeDefinitionPath(pathValue);
    if (!normalizedTarget) return null;
    const definitions = definitionsRef();
    return definitions.find((definition) => {
      const definitionPath = normalizeDefinitionPath(definition.filePath || definition.path || "");
      if (!definitionPath) return false;
      return definitionPath === normalizedTarget || definitionPath.endsWith(`/${normalizedTarget}`) || normalizedTarget.endsWith(`/${definitionPath}`);
    }) || null;
  }

  function setActivityDefinitionLink(targetNode, pathValue, fallbackText) {
    if (!targetNode) return;
    const normalizedPath = String(pathValue || "").trim();
    const definition = findDefinitionByPath(normalizedPath);
    const label = definition?.name || getRunNameFromPath(normalizedPath, fallbackText || "—");
    targetNode.textContent = label;
    targetNode.href = definition ? `?definition=${encodeURIComponent(definition.id)}` : "#";
    targetNode.classList.toggle("disabled", !definition);
    targetNode.dataset.definitionPath = normalizedPath;
  }

  function openDefinitionDetailsByPath(pathValue) {
    const definition = findDefinitionByPath(pathValue);
    if (!definition) return;
    setActiveTopPage("discover");
    updateRouteForDetails(definition.id);
    showDetails(definition.id);
  }

  function setActivityLastUpdatedLabel(value) {
    if (!activityLastUpdated) return;
    activityLastUpdated.textContent = value;
  }

  function startActivityTicker() {
    if (activityTickerTimer) return;
    activityTickerTimer = window.setInterval(() => {
      if (!activityLastUpdated?.dataset?.timestamp) return;
      const timestamp = Number(activityLastUpdated.dataset.timestamp);
      if (!Number.isFinite(timestamp)) return;
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
      if (elapsedSeconds <= 1) {
        setActivityLastUpdatedLabel("just now");
      } else {
        setActivityLastUpdatedLabel(`${elapsedSeconds}s ago`);
      }
    }, 1000);
  }

  function stopActivityTicker() {
    if (!activityTickerTimer) return;
    window.clearInterval(activityTickerTimer);
    activityTickerTimer = null;
  }

  return {
    getRunNameFromPath,
    normalizeDefinitionPath,
    findDefinitionByPath,
    setActivityDefinitionLink,
    openDefinitionDetailsByPath,
    setActivityLastUpdatedLabel,
    startActivityTicker,
    stopActivityTicker,
  };
}
