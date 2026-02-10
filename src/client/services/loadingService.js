const DEFAULT_CONFIG = {
  defaultTimeout: 60000,
  warningThreshold: 0.8,
  autoHideErrorDelay: 5000,
  minTimeout: 15000,
  maxTimeout: 300000,
};

let loadingConfig = { ...DEFAULT_CONFIG };
let initialized = false;
let activeOperation = null;
let timeoutTimer = null;
let warningTimer = null;
let autoHideTimer = null;
let warningVisible = false;
let operationStartTime = 0;
let overlayElements = null;

function clearTimers() {
  window.clearTimeout(timeoutTimer);
  window.clearTimeout(warningTimer);
  window.clearTimeout(autoHideTimer);
  timeoutTimer = null;
  warningTimer = null;
  autoHideTimer = null;
}

function clearRetryHandler() {
  if (overlayElements?.retryBtn) {
    overlayElements.retryBtn.onclick = null;
  }
}

function getElements() {
  if (overlayElements) return overlayElements;
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return null;
  overlayElements = {
    overlay,
    spinner: overlay.querySelector(".loading-spinner"),
    title: document.getElementById("loadingTitle"),
    description: document.getElementById("loadingDescription"),
    progressContainer: document.getElementById("loadingProgress"),
    progressFill: overlay.querySelector(".progress-fill"),
    progressText: overlay.querySelector(".progress-text"),
    timeoutWarning: document.getElementById("loadingTimeoutWarning"),
    errorContainer: document.getElementById("loadingError"),
    errorMessage: document.getElementById("loadingErrorMessage"),
    retryBtn: document.getElementById("retryOperationBtn"),
    dismissBtn: document.getElementById("dismissErrorBtn"),
    extendBtn: document.getElementById("extendTimeoutBtn"),
    cancelBtn: document.getElementById("cancelOperationBtn"),
  };
  return overlayElements;
}

function clampTimeout(timeout) {
  const numeric = Number(timeout);
  if (!Number.isFinite(numeric)) return loadingConfig.defaultTimeout;
  return Math.max(loadingConfig.minTimeout, Math.min(loadingConfig.maxTimeout, numeric));
}

function buildOperationId() {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function onDismissError() {
  hideLoading();
}

function onExtendTimeout() {
  if (!activeOperation) return;
  const extension = activeOperation.timeout;
  if (overlayElements?.timeoutWarning) {
    overlayElements.timeoutWarning.classList.add("hidden");
  }
  warningVisible = false;
  if (overlayElements?.description) {
    overlayElements.description.textContent = activeOperation.description || "";
  }
  scheduleTimers(activeOperation.id, extension);
}

function onCancelOperation() {
  if (!activeOperation) return;
  if (activeOperation.abortController) {
    activeOperation.abortController.abort();
  }
  hideLoading(activeOperation.id);
}

function ensureEventListeners() {
  const elements = getElements();
  if (!elements || elements.overlay.dataset.loadingBound === "true") return;
  elements.dismissBtn?.addEventListener("click", onDismissError);
  elements.extendBtn?.addEventListener("click", onExtendTimeout);
  elements.cancelBtn?.addEventListener("click", onCancelOperation);
  elements.overlay.dataset.loadingBound = "true";
}

function showTimeoutWarning() {
  if (!activeOperation) return;
  warningVisible = true;
  const elements = getElements();
  elements?.timeoutWarning?.classList.remove("hidden");
  if (elements?.title) {
    elements.title.textContent = "Still working...";
  }
  if (elements?.description) {
    elements.description.textContent = "This is taking longer than expected.";
  }
}

function scheduleTimers(operationId, timeout) {
  clearTimers();
  const warningTime = timeout * loadingConfig.warningThreshold;
  warningTimer = window.setTimeout(() => {
    if (activeOperation?.id !== operationId) return;
    showTimeoutWarning();
  }, warningTime);

  timeoutTimer = window.setTimeout(() => {
    if (activeOperation?.id !== operationId) return;
    if (activeOperation.abortController) {
      activeOperation.abortController.abort();
    }
    showError({
      message: "Operation took too long and was cancelled.",
      autoHide: false,
      operationId,
    });
  }, timeout);
}

export function initLoadingService(config = {}) {
  loadingConfig = {
    ...loadingConfig,
    ...config,
  };

  const savedTimeout = Number(window.localStorage.getItem("loadingTimeoutMs"));
  if (Number.isFinite(savedTimeout)) {
    loadingConfig.defaultTimeout = clampTimeout(savedTimeout);
  } else {
    loadingConfig.defaultTimeout = clampTimeout(loadingConfig.defaultTimeout);
  }

  ensureEventListeners();
  initialized = true;
}

export function showLoading({
  title = "Processing...",
  description = "",
  timeout = loadingConfig.defaultTimeout,
  showProgress = false,
  abortController = null,
} = {}) {
  if (!initialized) {
    initLoadingService();
  }

  if (activeOperation) {
    return activeOperation.id;
  }

  const elements = getElements();
  if (!elements) {
    return "";
  }

  clearTimers();
  clearRetryHandler();
  warningVisible = false;

  const operationId = buildOperationId();
  const effectiveTimeout = clampTimeout(timeout);
  operationStartTime = Date.now();
  activeOperation = {
    id: operationId,
    title,
    description,
    timeout: effectiveTimeout,
    abortController,
  };

  if (elements.title) elements.title.textContent = title;
  if (elements.description) elements.description.textContent = description;
  elements.spinner?.classList.remove("hidden");
  elements.errorContainer?.classList.add("hidden");
  elements.timeoutWarning?.classList.add("hidden");

  if (elements.progressContainer) {
    elements.progressContainer.classList.toggle("hidden", !showProgress);
    if (showProgress) {
      if (elements.progressFill) elements.progressFill.style.width = "0%";
      if (elements.progressText) elements.progressText.textContent = "0%";
    }
  }

  elements.overlay.classList.remove("hidden");
  elements.overlay.setAttribute("aria-busy", "true");
  void elements.overlay.offsetWidth;
  elements.overlay.classList.add("active");
  document.body.classList.add("loading-active");

  scheduleTimers(operationId, effectiveTimeout);

  return operationId;
}

export function hideLoading(operationId = null) {
  if (operationId && activeOperation?.id !== operationId) {
    return;
  }
  clearTimers();
  clearRetryHandler();
  warningVisible = false;

  const elements = getElements();
  if (elements?.overlay) {
    elements.overlay.classList.remove("active");
    elements.overlay.setAttribute("aria-busy", "false");
    window.setTimeout(() => {
      elements.overlay.classList.add("hidden");
      elements.timeoutWarning?.classList.add("hidden");
      elements.errorContainer?.classList.add("hidden");
      elements.spinner?.classList.remove("hidden");
      if (elements.description) {
        elements.description.textContent = "";
      }
    }, 260);
  }

  document.body.classList.remove("loading-active");
  activeOperation = null;
  operationStartTime = 0;
}

export function updateProgress(percent) {
  if (!activeOperation) return;
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const elements = getElements();
  if (!elements) return;
  if (elements.progressFill) {
    elements.progressFill.style.width = `${value}%`;
  }
  if (elements.progressText) {
    elements.progressText.textContent = `${Math.round(value)}%`;
  }
}

export function updateMessage(title = "", description = "") {
  if (!activeOperation) return;
  const elements = getElements();
  if (!elements) return;
  if (title && elements.title) {
    elements.title.textContent = title;
  }
  if (elements.description) {
    elements.description.textContent = description;
  }
}

export function showError({
  message = "An error occurred. Please try again.",
  onRetry = null,
  autoHide = true,
  operationId = null,
} = {}) {
  if (operationId && activeOperation?.id !== operationId) {
    return;
  }

  clearTimers();
  warningVisible = false;

  const elements = getElements();
  if (!elements) return;

  elements.spinner?.classList.add("hidden");
  elements.timeoutWarning?.classList.add("hidden");
  elements.errorContainer?.classList.remove("hidden");
  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
  }

  if (elements.retryBtn) {
    if (typeof onRetry === "function") {
      elements.retryBtn.classList.remove("hidden");
      elements.retryBtn.onclick = () => {
        hideLoading();
        onRetry();
      };
    } else {
      elements.retryBtn.classList.add("hidden");
      elements.retryBtn.onclick = null;
    }
  }

  if (autoHide) {
    autoHideTimer = window.setTimeout(() => {
      hideLoading(activeOperation?.id || null);
    }, loadingConfig.autoHideErrorDelay);
  }
}

function normalizeErrorMessage(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  const message = String(error.message || error || fallbackMessage);
  if (message.includes("Failed to fetch")) {
    return "Connection lost. Please check your internet connection and try again.";
  }
  return message;
}

export async function runWithLoading(asyncFn, loadingOptions = {}) {
  const abortController = new AbortController();
  const operationId = showLoading({
    ...loadingOptions,
    abortController,
  });

  try {
    const result = await asyncFn({ signal: abortController.signal, operationId });
    hideLoading(operationId);
    return result;
  } catch (error) {
    if (error?.name === "AbortError") {
      hideLoading(operationId);
      return null;
    }

    showError({
      message: normalizeErrorMessage(error, "Operation failed. Please try again."),
      onRetry: typeof loadingOptions.onRetry === "function" ? loadingOptions.onRetry : null,
      autoHide: loadingOptions.autoHideError !== false,
      operationId,
    });
    throw error;
  }
}

export function setDefaultTimeout(timeoutMs) {
  const value = clampTimeout(timeoutMs);
  loadingConfig.defaultTimeout = value;
  window.localStorage.setItem("loadingTimeoutMs", String(value));
}

export function getDefaultTimeout() {
  return loadingConfig.defaultTimeout;
}

export function getLoadingState() {
  return {
    activeOperationId: activeOperation?.id || null,
    warningVisible,
    elapsedMs: operationStartTime ? Date.now() - operationStartTime : 0,
  };
}
