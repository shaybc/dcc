export function toggleGeminiSettingsSections({ geminiClientSelect, geminiAiStudioSection, geminiConnectorSection }) {
  const selectedClient = String(geminiClientSelect?.value || "connector");
  if (geminiAiStudioSection) {
    geminiAiStudioSection.hidden = selectedClient !== "aistudio";
  }
  if (geminiConnectorSection) {
    geminiConnectorSection.hidden = selectedClient !== "connector";
  }
}

export async function loadRecommendationSettings(domRefs) {
  const {
    maxRecommendedDefinitionsInput,
    geminiClientSelect,
    geminiApiKeyInput,
    geminiModelInput,
    geminiConnectorIdInput,
    geminiConnectorBaseUrlInput,
    geminiConnectorApiKeyInput,
    geminiConnectorModelInput,
    openAiResponseLogEnabledInput,
    aiClientTrafficLogEnabledInput,
    aiResponseLogMaxLengthInput,
    logFileMaxSizeMbInput,
    logFileMaxFilesInput,
  } = domRefs;

  if (!maxRecommendedDefinitionsInput && !geminiClientSelect && !geminiApiKeyInput && !geminiModelInput) return;
  const response = await fetch("/api/settings");
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to load settings.");
  }

  const data = await response.json().catch(() => ({}));
  const rawValue = Number(data?.maxRecommendedDefinitions);
  const normalizedValue = Number.isFinite(rawValue) ? Math.min(8, Math.max(3, Math.round(rawValue))) : 8;
  if (maxRecommendedDefinitionsInput) maxRecommendedDefinitionsInput.value = String(normalizedValue);
  if (geminiClientSelect) geminiClientSelect.value = String(data?.geminiClient || "connector");
  if (geminiApiKeyInput) geminiApiKeyInput.value = String(data?.geminiApiKey || "");
  if (geminiModelInput) geminiModelInput.value = String(data?.geminiModel || "gemini-2.5-pro");
  if (geminiConnectorIdInput) geminiConnectorIdInput.value = String(data?.geminiConnectorId || "");
  if (geminiConnectorBaseUrlInput) geminiConnectorBaseUrlInput.value = String(data?.geminiConnectorBaseUrl || "");
  if (geminiConnectorApiKeyInput) geminiConnectorApiKeyInput.value = String(data?.geminiConnectorApiKey || "");
  if (geminiConnectorModelInput) geminiConnectorModelInput.value = String(data?.geminiConnectorModel || "gemini-2.5-pro");
  if (openAiResponseLogEnabledInput) openAiResponseLogEnabledInput.checked = Boolean(data?.openAiResponseLogEnabled);
  if (aiClientTrafficLogEnabledInput) aiClientTrafficLogEnabledInput.checked = Boolean(data?.aiClientTrafficLogEnabled);

  if (aiResponseLogMaxLengthInput) {
    const rawLogLength = Number(data?.aiResponseLogMaxLength);
    const normalizedLogLength = Number.isFinite(rawLogLength) ? Math.max(50, Math.min(5000, Math.round(rawLogLength))) : 300;
    aiResponseLogMaxLengthInput.value = String(normalizedLogLength);
  }
  if (logFileMaxSizeMbInput) {
    const rawLogFileMaxSizeMb = Number(data?.logFileMaxSizeMb);
    const normalizedLogFileMaxSizeMb = Number.isFinite(rawLogFileMaxSizeMb) ? Math.max(10, Math.min(1024, Math.round(rawLogFileMaxSizeMb))) : 100;
    logFileMaxSizeMbInput.value = String(normalizedLogFileMaxSizeMb);
  }
  if (logFileMaxFilesInput) {
    const rawLogFileMaxFiles = Number(data?.logFileMaxFiles);
    const normalizedLogFileMaxFiles = Number.isFinite(rawLogFileMaxFiles) ? Math.max(1, Math.min(365, Math.round(rawLogFileMaxFiles))) : 30;
    logFileMaxFilesInput.value = String(normalizedLogFileMaxFiles);
  }

  toggleGeminiSettingsSections(domRefs);
}

export function initRecommendationSettings(domRefs, { setNotice, getDefaultTimeout, setDefaultTimeout }) {
  const {
    loadingTimeoutInput,
    saveLoadingTimeoutButton,
    maxRecommendedDefinitionsInput,
    saveMaxRecommendedDefinitionsButton,
    saveAiLoggingSettingsButton,
    openAiResponseLogEnabledInput,
    aiClientTrafficLogEnabledInput,
    aiResponseLogMaxLengthInput,
    logFileMaxSizeMbInput,
    logFileMaxFilesInput,
    saveGeminiSettingsButton,
    geminiClientSelect,
    geminiApiKeyInput,
    geminiModelInput,
    geminiConnectorIdInput,
    geminiConnectorBaseUrlInput,
    geminiConnectorApiKeyInput,
    geminiConnectorModelInput,
  } = domRefs;

  geminiClientSelect?.addEventListener("change", () => toggleGeminiSettingsSections(domRefs));

  if (loadingTimeoutInput) {
    loadingTimeoutInput.value = String(Math.round(getDefaultTimeout() / 1000));
  }

  saveLoadingTimeoutButton?.addEventListener("click", () => {
    const timeoutSeconds = Number(loadingTimeoutInput?.value || 0);
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 15 || timeoutSeconds > 300) {
      setNotice("Timeout must be between 15 and 300 seconds.", true);
      return;
    }
    setDefaultTimeout(timeoutSeconds * 1000);
    setNotice("Loading timeout updated.");
  });

  saveMaxRecommendedDefinitionsButton?.addEventListener("click", async () => {
    const rawValue = Number(maxRecommendedDefinitionsInput?.value || 0);
    if (!Number.isFinite(rawValue) || rawValue < 3 || rawValue > 8) {
      setNotice("Recommendation limit must be between 3 and 8.", true);
      return;
    }

    const maxRecommendedDefinitions = Math.round(rawValue);
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxRecommendedDefinitions })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "Failed to save recommendation limit.", true);
      return;
    }

    if (maxRecommendedDefinitionsInput) maxRecommendedDefinitionsInput.value = String(maxRecommendedDefinitions);
    setNotice("Recommendation limit updated.");
  });

  saveAiLoggingSettingsButton?.addEventListener("click", async () => {
    const aiResponseLogMaxLength = Number(aiResponseLogMaxLengthInput?.value || 0);
    const logFileMaxSizeMb = Number(logFileMaxSizeMbInput?.value || 0);
    const logFileMaxFiles = Number(logFileMaxFilesInput?.value || 0);

    if (!Number.isFinite(aiResponseLogMaxLength) || aiResponseLogMaxLength < 50 || aiResponseLogMaxLength > 5000) {
      setNotice("Log max response length must be between 50 and 5000.", true);
      return;
    }
    if (!Number.isFinite(logFileMaxSizeMb) || logFileMaxSizeMb < 10 || logFileMaxSizeMb > 1024) {
      setNotice("Log file max size must be between 10 and 1024 MB.", true);
      return;
    }
    if (!Number.isFinite(logFileMaxFiles) || logFileMaxFiles < 1 || logFileMaxFiles > 365) {
      setNotice("Max log files must be between 1 and 365.", true);
      return;
    }

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openAiResponseLogEnabled: Boolean(openAiResponseLogEnabledInput?.checked),
        aiClientTrafficLogEnabled: Boolean(aiClientTrafficLogEnabledInput?.checked),
        aiResponseLogMaxLength: Math.round(aiResponseLogMaxLength),
        logFileMaxSizeMb: Math.round(logFileMaxSizeMb),
        logFileMaxFiles: Math.round(logFileMaxFiles)
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "Failed to save logging settings.", true);
      return;
    }

    if (aiResponseLogMaxLengthInput) aiResponseLogMaxLengthInput.value = String(Math.round(aiResponseLogMaxLength));
    if (logFileMaxSizeMbInput) logFileMaxSizeMbInput.value = String(Math.round(logFileMaxSizeMb));
    if (logFileMaxFilesInput) logFileMaxFilesInput.value = String(Math.round(logFileMaxFiles));
    setNotice("AI logging settings updated.");
  });

  saveGeminiSettingsButton?.addEventListener("click", async () => {
    const geminiClient = String(geminiClientSelect?.value || "connector");
    const geminiApiKey = String(geminiApiKeyInput?.value || "").trim();
    const geminiModel = String(geminiModelInput?.value || "").trim() || "gemini-2.5-pro";
    const geminiConnectorId = String(geminiConnectorIdInput?.value || "").trim();
    const geminiConnectorBaseUrl = String(geminiConnectorBaseUrlInput?.value || "").trim();
    const geminiConnectorApiKey = String(geminiConnectorApiKeyInput?.value || "").trim();
    const geminiConnectorModel = String(geminiConnectorModelInput?.value || "").trim() || "gemini-2.5-pro";

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geminiClient,
        geminiApiKey,
        geminiModel,
        geminiConnectorId,
        geminiConnectorBaseUrl,
        geminiConnectorApiKey,
        geminiConnectorModel
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "Failed to save Gemini settings.", true);
      return;
    }

    if (geminiClientSelect) geminiClientSelect.value = geminiClient;
    if (geminiApiKeyInput) geminiApiKeyInput.value = geminiApiKey;
    if (geminiModelInput) geminiModelInput.value = geminiModel;
    if (geminiConnectorIdInput) geminiConnectorIdInput.value = geminiConnectorId;
    if (geminiConnectorBaseUrlInput) geminiConnectorBaseUrlInput.value = geminiConnectorBaseUrl;
    if (geminiConnectorApiKeyInput) geminiConnectorApiKeyInput.value = geminiConnectorApiKey;
    if (geminiConnectorModelInput) geminiConnectorModelInput.value = geminiConnectorModel;

    toggleGeminiSettingsSections(domRefs);
    setNotice("Gemini settings updated.");
  });

  toggleGeminiSettingsSections(domRefs);
}
