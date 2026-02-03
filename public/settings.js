const repoUrlInput = document.getElementById("repoUrl");
const repoPathInput = document.getElementById("repoPath");
const settingsForm = document.getElementById("settingsForm");
const clonePullButton = document.getElementById("clonePull");
const loadDefinitionsButton = document.getElementById("loadDefinitions");
const notice = document.getElementById("settingsNotice");

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.style.color = isError ? "#dc2626" : "#6b7280";
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const data = await response.json();
  repoUrlInput.value = data.repoUrl || "";
  repoPathInput.value = data.repoPath || "";
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const repoUrl = repoUrlInput.value.trim();
  const repoPath = repoPathInput.value.trim();
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl, repoPath })
  });
  if (response.ok) {
    setNotice("Settings saved.");
  } else {
    const data = await response.json();
    setNotice(data.error || "Failed to save settings.", true);
  }
});

clonePullButton.addEventListener("click", async () => {
  setNotice("Syncing repository...");
  const response = await fetch("/api/clone-pull", { method: "POST" });
  if (response.ok) {
    setNotice("Repository synced.");
  } else {
    const data = await response.json();
    setNotice(data.error || "Sync failed.", true);
  }
});

loadDefinitionsButton.addEventListener("click", async () => {
  setNotice("Loading definitions...");
  const response = await fetch("/api/load-definitions", { method: "POST" });
  if (response.ok) {
    setNotice("Definitions loaded.");
  } else {
    const data = await response.json();
    setNotice(data.error || "Load failed.", true);
  }
});

loadSettings();
