export function createPreferencesStorage({
  recommendationsVisibilityStorageKey,
  intentRecommendationsStorageKey,
  hideInstalledDefinitionsStorageKey,
  onlyLocalDefinitionsStorageKey,
  normalizeAiSuggestedEntries,
}) {
  function getStoredRecommendationsVisibility() {
    try {
      return localStorage.getItem(recommendationsVisibilityStorageKey) === "true";
    } catch (_error) {
      return false;
    }
  }

  function persistRecommendationsVisibility(value) {
    try {
      localStorage.setItem(recommendationsVisibilityStorageKey, String(Boolean(value)));
    } catch (_error) {
      // Ignore local storage access errors and keep the in-memory state.
    }
  }

  function getStoredIntentRecommendations() {
    try {
      const raw = localStorage.getItem(intentRecommendationsStorageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      const projectPath = String(parsed?.projectPath || "").trim();
      const intent = String(parsed?.intent || "").trim();
      const suggestions = normalizeAiSuggestedEntries(parsed?.suggestions || []);
      if (!projectPath || !intent || !suggestions.length) {
        return null;
      }
      return { projectPath, intent, suggestions };
    } catch (_error) {
      return null;
    }
  }

  function persistIntentRecommendations(projectPath, intent, suggestions = []) {
    try {
      const normalizedProjectPath = String(projectPath || "").trim();
      const normalizedIntent = String(intent || "").trim();
      const normalizedSuggestions = normalizeAiSuggestedEntries(suggestions);
      if (!normalizedProjectPath || !normalizedIntent || !normalizedSuggestions.length) {
        localStorage.removeItem(intentRecommendationsStorageKey);
        return;
      }
      localStorage.setItem(intentRecommendationsStorageKey, JSON.stringify({
        projectPath: normalizedProjectPath,
        intent: normalizedIntent,
        suggestions: normalizedSuggestions,
      }));
    } catch (_error) {
      // Ignore local storage access errors and keep in-memory state.
    }
  }

  function clearPersistedIntentRecommendations() {
    try {
      localStorage.removeItem(intentRecommendationsStorageKey);
    } catch (_error) {
      // Ignore local storage access errors and keep in-memory state.
    }
  }

  function getStoredHideInstalledDefinitions() {
    try {
      return localStorage.getItem(hideInstalledDefinitionsStorageKey) === "true";
    } catch (_error) {
      return false;
    }
  }

  function persistHideInstalledDefinitions(value) {
    try {
      localStorage.setItem(hideInstalledDefinitionsStorageKey, String(Boolean(value)));
    } catch (_error) {
      // Ignore local storage access errors and keep in-memory state.
    }
  }

  function getStoredOnlyLocalDefinitions() {
    try {
      return localStorage.getItem(onlyLocalDefinitionsStorageKey) === "true";
    } catch (_error) {
      return false;
    }
  }

  function persistOnlyLocalDefinitions(value) {
    try {
      localStorage.setItem(onlyLocalDefinitionsStorageKey, String(Boolean(value)));
    } catch (_error) {
      // Ignore local storage access errors and keep in-memory state.
    }
  }

  return {
    getStoredRecommendationsVisibility,
    persistRecommendationsVisibility,
    getStoredIntentRecommendations,
    persistIntentRecommendations,
    clearPersistedIntentRecommendations,
    getStoredHideInstalledDefinitions,
    persistHideInstalledDefinitions,
    getStoredOnlyLocalDefinitions,
    persistOnlyLocalDefinitions,
  };
}
