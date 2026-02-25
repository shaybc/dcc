export function createActivityUtils({ getDefinitions, showHubPage, updateRouteForHub, showDetails }) {
  function normalizeDefinitionPath(pathValue) {
    return String(pathValue || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .toLowerCase();
  }

  function findDefinitionByPath(pathValue) {
    const normalizedPath = normalizeDefinitionPath(pathValue);
    if (!normalizedPath) return null;

    const definitions = getDefinitions();
    const exactMatch = definitions.find((definition) => normalizeDefinitionPath(definition?.filePath) === normalizedPath);
    if (exactMatch) return exactMatch;

    const suffixMatch = definitions.find((definition) => {
      const definitionPath = normalizeDefinitionPath(definition?.filePath);
      return definitionPath.endsWith(normalizedPath) || normalizedPath.endsWith(definitionPath);
    });
    if (suffixMatch) return suffixMatch;

    const pathFileName = normalizedPath.split("/").pop();
    if (!pathFileName) return null;
    return definitions.find((definition) => normalizeDefinitionPath(definition?.filePath).split("/").pop() === pathFileName) || null;
  }

  function getRunNameFromPath(pathValue, fallback) {
    const definition = findDefinitionByPath(pathValue);
    if (definition?.name) return definition.name;
    const normalized = String(pathValue || "").trim();
    if (!normalized) return fallback;
    const segments = normalized.split(/[\/]/).filter(Boolean);
    const finalName = segments[segments.length - 1] || fallback;
    return finalName.replace(/\.[^.]+$/, "") || fallback;
  }

  function setActivityDefinitionLink(targetNode, pathValue, fallbackText) {
    if (!targetNode) return;
    const definition = findDefinitionByPath(pathValue);
    const label = definition?.name || getRunNameFromPath(pathValue, fallbackText);
    targetNode.textContent = label;
    targetNode.dataset.definitionId = definition?.id ? String(definition.id) : "";
    targetNode.classList.toggle("activity-detail-link", Boolean(definition?.id));
    if (definition?.id) {
      targetNode.setAttribute("role", "button");
      targetNode.tabIndex = 0;
    } else {
      targetNode.removeAttribute("role");
      targetNode.tabIndex = -1;
    }
  }

  function openDefinitionDetailsByPath(pathValue) {
    const definition = findDefinitionByPath(pathValue);
    const definitionId = Number(definition?.id || 0);
    if (!definitionId) return;
    showHubPage();
    updateRouteForHub();
    showDetails(definitionId).catch((error) => {
      window.alert(error?.message || "Unable to open definition details.");
    });
  }

  return {
    findDefinitionByPath,
    getRunNameFromPath,
    openDefinitionDetailsByPath,
    setActivityDefinitionLink,
  };
}
