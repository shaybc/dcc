export function normalizeRecentAgentRunPack(entry) {
  if (!entry || typeof entry !== "object") return null;

  const agentId = String(entry.agentId || "").trim();
  const configId = String(entry.configId || "").trim();
  if (!agentId || !configId) return null;

  return {
    agentId,
    configId,
    prompt: String(entry.prompt || ""),
    runOptions: {
      verbose: Boolean(entry?.runOptions?.verbose),
      readonly: Boolean(entry?.runOptions?.readonly),
      denyRead: Boolean(entry?.runOptions?.denyRead),
      denyList: Boolean(entry?.runOptions?.denyList),
      denySearch: Boolean(entry?.runOptions?.denySearch),
      denyFetch: Boolean(entry?.runOptions?.denyFetch),
      denyDiff: Boolean(entry?.runOptions?.denyDiff),
      allowWrite: Boolean(entry?.runOptions?.allowWrite),
      allowEdit: Boolean(entry?.runOptions?.allowEdit),
      allowMultiEdit: Boolean(entry?.runOptions?.allowMultiEdit),
      allowTerminal: Boolean(entry?.runOptions?.allowTerminal),
      allowOnly: Array.isArray(entry?.runOptions?.allowOnly)
        ? entry.runOptions.allowOnly.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
      denyTerminalCommands: Array.isArray(entry?.runOptions?.denyTerminalCommands)
        ? entry.runOptions.denyTerminalCommands.map((value) => String(value || "").trim()).filter(Boolean)
        : []
    }
  };
}

export function getStoredRecentAgentRunPacks(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => normalizeRecentAgentRunPack(value))
      .filter(Boolean)
      .slice(0, 30);
  } catch (_error) {
    return [];
  }
}

export function persistRecentAgentRunPacks(storageKey, recentAgentRunPacks) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(recentAgentRunPacks.slice(0, 30)));
  } catch (_error) {
    // Ignore localStorage failures.
  }
}
