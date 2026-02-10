import {
  getDefaultTimeout,
  initLoadingService,
  runWithLoading,
  setDefaultTimeout,
} from "./services/loadingService.js";

const repoUrlInput = document.getElementById("repoUrl");
const repoPathInput = document.getElementById("repoPath");
const settingsForm = document.getElementById("settingsForm");
const clonePullButton = document.getElementById("clonePull");
const loadDefinitionsButton = document.getElementById("loadDefinitions");
const notice = document.getElementById("settingsNotice");
const devRootsTable = document.getElementById("devRootsTable");
const devProjectsTable = document.getElementById("devProjectsTable");
const addDevRootButton = document.getElementById("addDevRoot");
const saveDevRootsButton = document.getElementById("saveDevRoots");
const devRootsNotice = document.getElementById("devRootsNotice");
const themeToggle = document.getElementById("themeToggle");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const loadingTimeoutInput = document.getElementById("loadingTimeoutInput");
const saveLoadingTimeoutButton = document.getElementById("saveLoadingTimeoutBtn");

initLoadingService();

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.style.color = isError ? "#dc2626" : "#6b7280";
}

function setDevRootsNotice(message, isError = false) {
  devRootsNotice.textContent = message;
  devRootsNotice.style.color = isError ? "#dc2626" : "#6b7280";
}

function updateThemeToggleLabel(isLightMode) {
  themeToggleLabel.textContent = isLightMode ? "Light mode" : "Dark mode";
}

if (themeToggle) {
  const currentTheme = window.dccTheme?.getPreferredTheme?.() || "dark";
  const isLightMode = currentTheme === "light";
  themeToggle.checked = isLightMode;
  updateThemeToggleLabel(isLightMode);

  themeToggle.addEventListener("change", (event) => {
    const nextTheme = event.target.checked ? "light" : "dark";
    const appliedTheme = window.dccTheme?.setPreferredTheme?.(nextTheme) || nextTheme;
    updateThemeToggleLabel(appliedTheme === "light");
  });
}

function createDevRootRow(value = "") {
  const row = document.createElement("tr");
  const pathCell = document.createElement("td");
  const actionsCell = document.createElement("td");

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "/path/to/project/root";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    row.remove();
  });

  pathCell.appendChild(input);
  actionsCell.appendChild(removeButton);

  row.appendChild(pathCell);
  row.appendChild(actionsCell);
  return row;
}

function renderDevRoots(roots) {
  devRootsTable.innerHTML = "";
  if (roots.length === 0) {
    devRootsTable.appendChild(createDevRootRow(""));
    return;
  }
  roots.forEach((root) => devRootsTable.appendChild(createDevRootRow(root.path || root)));
}


function formatProjectType(projectType) {
  const value = String(projectType || "unknown").toLowerCase();
  if (value === "dotnet") return ".NET";
  if (value === "polyglot") return "Polyglot";
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLastScannedAt(lastScannedAt) {
  if (!lastScannedAt) return "Not scanned yet";
  const parsed = new Date(lastScannedAt);
  if (Number.isNaN(parsed.getTime())) return "Not scanned yet";
  return parsed.toLocaleString();
}

function createMetaBadge(text, className = "") {
  const badge = document.createElement("span");
  badge.className = `project-meta-badge ${className}`.trim();
  badge.textContent = text;
  return badge;
}

function renderDevProjects(projects) {
  devProjectsTable.innerHTML = "";
  if (projects.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent = "No projects found yet.";
    row.appendChild(cell);
    devProjectsTable.appendChild(row);
    return;
  }

  projects.forEach((project) => {
    const projectData = typeof project === "string" ? { path: project } : project;
    const row = document.createElement("tr");

    const pathCell = document.createElement("td");
    pathCell.textContent = projectData.path || "Unknown path";

    const metadataCell = document.createElement("td");
    const metadataSummary = document.createElement("div");
    metadataSummary.className = "project-meta-summary";

    const typeBadge = createMetaBadge(formatProjectType(projectData.projectType), "project-meta-badge--type");
    metadataSummary.appendChild(typeBadge);

    const signals = Array.isArray(projectData.detectedSignals) ? projectData.detectedSignals : [];
    if (signals.length > 0) {
      signals.slice(0, 3).forEach((signal) => {
        metadataSummary.appendChild(createMetaBadge(signal, "project-meta-badge--signal"));
      });
      if (signals.length > 3) {
        metadataSummary.appendChild(createMetaBadge(`+${signals.length - 3} more`, "project-meta-badge--signal"));
      }
    } else {
      metadataSummary.appendChild(createMetaBadge("No signals", "project-meta-badge--muted"));
    }

    const scannedAt = document.createElement("p");
    scannedAt.className = "project-meta-time";
    scannedAt.textContent = `Scanned: ${formatLastScannedAt(projectData.lastScannedAt)}`;

    metadataCell.appendChild(metadataSummary);
    metadataCell.appendChild(scannedAt);

    row.appendChild(pathCell);
    row.appendChild(metadataCell);
    devProjectsTable.appendChild(row);
  });
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const data = await response.json();
  repoUrlInput.value = data.repoUrl || "";
  repoPathInput.value = data.repoPath || "";
}

async function loadDevProjects() {
  const [rootsResponse, projectsResponse] = await Promise.all([
    fetch("/api/dev-project-roots"),
    fetch("/api/dev-projects")
  ]);
  const roots = await rootsResponse.json();
  const projects = await projectsResponse.json();
  renderDevRoots(roots);
  renderDevProjects(projects);
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const repoUrl = repoUrlInput.value.trim();
  const repoPath = repoPathInput.value.trim();

  const response = await runWithLoading(
    async () => fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl, repoPath })
    }),
    {
      title: "Saving settings...",
      description: "Updating repository configuration.",
    }
  );

  if (!response) return;
  if (response.ok) {
    setNotice("Settings saved.");
    return;
  }

  const data = await response.json();
  setNotice(data.error || "Failed to save settings.", true);
});

addDevRootButton.addEventListener("click", () => {
  devRootsTable.appendChild(createDevRootRow(""));
});

saveDevRootsButton.addEventListener("click", async () => {
  const rows = Array.from(devRootsTable.querySelectorAll("tr"));
  const roots = rows
    .map((row) => row.querySelector("input")?.value.trim())
    .filter((value) => value);

  setDevRootsNotice("Saving roots and scanning projects...");
  const response = await runWithLoading(
    async () => fetch("/api/dev-project-roots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roots })
    }),
    {
      title: "Saving project roots...",
      description: "Scanning for development projects.",
      timeout: 120000,
    }
  );

  if (!response) return;
  if (response.ok) {
    const data = await response.json();
    setDevRootsNotice("Roots saved. Project scan complete.");
    renderDevProjects(data.projects || []);
    return;
  }

  const data = await response.json();
  setDevRootsNotice(data.error || "Failed to save roots.", true);
});

clonePullButton.addEventListener("click", async () => {
  setNotice("Syncing repository...");
  const response = await runWithLoading(
    async () => fetch("/api/clone-pull", { method: "POST" }),
    {
      title: "Syncing repository...",
      description: "Cloning or pulling latest changes.",
      timeout: 180000,
    }
  );

  if (!response) return;
  if (response.ok) {
    setNotice("Repository synced.");
    return;
  }

  const data = await response.json();
  setNotice(data.error || "Sync failed.", true);
});

loadDefinitionsButton.addEventListener("click", async () => {
  setNotice("Loading definitions...");
  const response = await runWithLoading(
    async () => fetch("/api/load-definitions", { method: "POST" }),
    {
      title: "Loading definitions...",
      description: "Importing repository definitions into DCC.",
      timeout: 120000,
    }
  );

  if (!response) return;
  if (response.ok) {
    setNotice("Definitions loaded.");
    return;
  }

  const data = await response.json();
  setNotice(data.error || "Load failed.", true);
});

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

Promise.all([loadSettings(), loadDevProjects()]).catch(() => {
  setNotice("Failed to load settings.", true);
});
