const NOTIFICATION_ROOT_ID = "appNotifications";
const DEFAULT_DURATION_MS = 5000;
const FLASH_NOTIFICATION_KEY = "dcc:flash-notification";

let initialized = false;

function ensureNotificationRoot() {
  let root = document.getElementById(NOTIFICATION_ROOT_ID);
  if (root) return root;

  root = document.createElement("div");
  root.id = NOTIFICATION_ROOT_ID;
  root.className = "app-notifications";
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-atomic", "false");
  document.body.appendChild(root);
  return root;
}


function readFlashNotification() {
  try {
    const raw = window.sessionStorage?.getItem(FLASH_NOTIFICATION_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(FLASH_NOTIFICATION_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      message: String(parsed.message || "").trim(),
      options: parsed.options && typeof parsed.options === "object" ? parsed.options : {}
    };
  } catch {
    return null;
  }
}

export function queueNotification(message, options = {}) {
  const text = String(message || "").trim();
  if (!text) return;
  try {
    window.sessionStorage?.setItem(
      FLASH_NOTIFICATION_KEY,
      JSON.stringify({ message: text, options })
    );
  } catch {
    // Ignore storage failures and fall back to in-page notify.
    notify(text, options);
  }
}

function normalizeType(type = "info", message = "") {
  if (type && type !== "info") return type;
  const text = String(message || "").toLowerCase();
  if (text.includes("error") || text.includes("unable") || text.includes("failed")) {
    return "error";
  }
  if (text.includes("saved") || text.includes("success") || text.includes("installed") || text.includes("pushed")) {
    return "success";
  }
  return "info";
}

export function notify(message, options = {}) {
  const text = String(message || "").trim();
  if (!text) return;

  const { duration = DEFAULT_DURATION_MS, type = "info" } = options;
  const resolvedType = normalizeType(type, text);

  const root = ensureNotificationRoot();
  const item = document.createElement("div");
  item.className = `app-notification app-notification-${resolvedType}`;
  item.setAttribute("role", "status");

  const content = document.createElement("p");
  content.className = "app-notification-message";
  content.textContent = text;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "app-notification-close";
  closeButton.textContent = "OK";

  let removeTimer;
  const dismiss = () => {
    if (item.classList.contains("is-dismissing")) return;
    item.classList.add("is-dismissing");
    window.clearTimeout(removeTimer);
    window.setTimeout(() => item.remove(), 220);
  };

  closeButton.addEventListener("click", dismiss);
  item.append(content, closeButton);
  root.appendChild(item);

  requestAnimationFrame(() => {
    item.classList.add("is-visible");
  });

  removeTimer = window.setTimeout(dismiss, Math.max(1200, Number(duration) || DEFAULT_DURATION_MS));
}

export function initNotificationService() {
  if (initialized) return;
  ensureNotificationRoot();

  const originalAlert = window.alert?.bind(window);
  window.alert = (message) => {
    notify(message);
  };

  const flash = readFlashNotification();
  if (flash?.message) {
    notify(flash.message, flash.options);
  }

  window.dispatchEvent(new CustomEvent("notifications:ready", { detail: { originalAlert } }));
  initialized = true;
}
