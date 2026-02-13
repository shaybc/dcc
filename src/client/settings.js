import {
  getDefaultTimeout,
  initLoadingService,
  runWithLoading,
  setDefaultTimeout,
} from "./services/loadingService.js";
import { initNotificationService } from "./services/notificationService.js";

const settingsForm = document.getElementById("settingsForm");
const clonePullButton = document.getElementById("clonePull");
const loadDefinitionsButton = document.getElementById("loadDefinitions");
const notice = document.getElementById("settingsNotice");
const assetReposTable = document.getElementById("assetReposTable");
const addAssetRepoButton = document.getElementById("addAssetRepo");
const assetRepoSyncTable = document.getElementById("assetRepoSyncTable");
const devRootsTable = document.getElementById("devRootsTable");
const devProjectsTable = document.getElementById("devProjectsTable");
const addDevRootButton = document.getElementById("addDevRoot");
const saveDevRootsButton = document.getElementById("saveDevRoots");
const devRootsNotice = document.getElementById("devRootsNotice");
const themeToggle = document.getElementById("themeToggle");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const loadingTimeoutInput = document.getElementById("loadingTimeoutInput");
const saveLoadingTimeoutButton = document.getElementById("saveLoadingTimeoutBtn");
function normalizeLocalPath(localPath = "") {
  return String(localPath || "").trim();
}

initLoadingService();
initNotificationService();

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.style.color = isError ? "#dc2626" : "#6b7280";
}

function setDevRootsNotice(message, isError = false) {
  devRootsNotice.textContent = message;
  devRootsNotice.style.color = isError ? "#dc2626" : "#6b7280";
}

function inferRepoName(remoteUrl = "", localPath = "") {
  const fromPath = String(localPath || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  if (fromPath) return fromPath;

  const fromRemote = String(remoteUrl || "")
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean)
    .pop();
  return fromRemote || "repo";
}

function createAssetRepoRow(repo = {}) {
  const row = document.createElement("tr");
  if (repo.id) row.dataset.repoId = String(repo.id);

  const nameCell = document.createElement("td");
  const urlCell = document.createElement("td");
  const pathCell = document.createElement("td");
  const enabledCell = document.createElement("td");
  const actionsCell = document.createElement("td");

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "asset-repo-name";
  nameInput.placeholder = "team-assets";
  nameInput.value = repo.name || "";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "asset-repo-remote";
  urlInput.placeholder = "https://github.com/your-org/ai_assets";
  urlInput.value = repo.remoteUrl || "";

  const pathInput = document.createElement("input");
  pathInput.type = "text";
  pathInput.className = "asset-repo-folder";
  pathInput.placeholder = "C:/GitHub/shaybc/ai_assets";
  pathInput.value = normalizeLocalPath(repo.localPath || "");

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.className = "asset-repo-enabled";
  enabledInput.checked = repo.enabled !== false;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    row.dataset.markedForDelete = "true";
    row.remove();
  });

  nameCell.appendChild(nameInput);
  urlCell.appendChild(urlInput);
  pathCell.appendChild(pathInput);
  enabledCell.appendChild(enabledInput);
  actionsCell.appendChild(removeButton);
  row.append(nameCell, urlCell, pathCell, enabledCell, actionsCell);
  return row;
}

function renderAssetRepos(repos) {
  assetReposTable.innerHTML = "";
  if (!repos.length) {
    assetReposTable.appendChild(createAssetRepoRow({ localPath: "" }));
    return;
  }
  repos.forEach((repo) => assetReposTable.appendChild(createAssetRepoRow(repo)));
}

async function loadAssetRepos() {
  const response = await fetch("/api/asset-repos");
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to load repositories.");
  }
  const data = await response.json();
  renderAssetRepos(Array.isArray(data) ? data : []);
}

function collectAssetReposFromRows() {
  const rows = Array.from(assetReposTable.querySelectorAll("tr"));
  return rows
    .map((row) => {
      const id = row.dataset.repoId ? Number(row.dataset.repoId) : null;
      const name = row.querySelector(".asset-repo-name")?.value.trim() || "";
      const remoteUrl = row.querySelector(".asset-repo-remote")?.value.trim() || "";
      const localFolder = row.querySelector(".asset-repo-folder")?.value.trim() || "";
      const localPath = normalizeLocalPath(localFolder);
      const enabled = Boolean(row.querySelector(".asset-repo-enabled")?.checked);

      if (!name && (remoteUrl || localPath)) {
        return { id, name: inferRepoName(remoteUrl, localPath), remoteUrl, localPath, enabled };
      }
      return { id, name, remoteUrl, localPath, enabled };
    })
    .filter((repo) => repo.name || repo.remoteUrl || repo.localPath);
}

function renderRepoSyncResults(results = []) {
  if (!assetRepoSyncTable) return;
  assetRepoSyncTable.innerHTML = "";

  if (!Array.isArray(results) || results.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "No sync results.";
    row.appendChild(cell);
    assetRepoSyncTable.appendChild(row);
    return;
  }

  results.forEach((entry) => {
    const row = document.createElement("tr");

    const repoCell = document.createElement("td");
    repoCell.textContent = entry.name || entry.remoteUrl || "Unknown repository";

    const statusCell = document.createElement("td");
    statusCell.textContent = entry.status || "unknown";

    const detailsCell = document.createElement("td");
    if (entry.error) {
      detailsCell.textContent = entry.error;
      detailsCell.style.color = "#dc2626";
    } else {
      detailsCell.textContent = entry.localPath || entry.configuredLocalPath || "";
    }

    row.append(repoCell, statusCell, detailsCell);
    assetRepoSyncTable.appendChild(row);
  });
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


const TECHNOLOGY_CANONICAL_LABEL_MAP = Object.freeze({ js: "javascript", ts: "typescript", md: "markdown" });


const PRIMARY_LANGUAGE_TECHNOLOGIES = new Set([
  "node",
  "python",
  "java",
  "csharp",
  "dotnet",
  "go",
  "rust",
  "swift",
  "swiftui",
  "objective-c",
  "c++",
  "groovy",
  "android",
  "angular",
  "springboot"
]);

const MINOR_TECHNOLOGIES = new Set([
  "javascript",
  "typescript",
  "react",
  "vue",
  "html",
  "css",
  "scss"
]);

const DATA_CONFIG_TECHNOLOGIES = new Set([
  "json",
  "yaml",
  "xml",
  "markdown"
]);

function technologyPriority(token, projectType) {
  if (token === projectType && projectType && projectType !== "unknown") {
    return -1;
  }
  if (PRIMARY_LANGUAGE_TECHNOLOGIES.has(token)) {
    return 0;
  }
  if (MINOR_TECHNOLOGIES.has(token)) {
    return 1;
  }
  if (DATA_CONFIG_TECHNOLOGIES.has(token)) {
    return 2;
  }
  return 3;
}

function formatTechnologyLabel(value) {
  const token = String(value || "").trim().toLowerCase();
  if (!token) return "";
  const labels = {
    js: "JS",
    ts: "TS",
    jsx: "JSX",
    tsx: "TSX",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    yaml: "YAML",
    json: "JSON",
    xml: "XML",
    dotnet: ".NET",
    csharp: "C#",
    "c++": "C++",
    "objective-c": "Objective-C",
    swiftui: "SwiftUI",
    javascript: "JavaScript",
    typescript: "TypeScript",
    springboot: "Spring Boot"
  };
  return labels[token] || (token.charAt(0).toUpperCase() + token.slice(1));
}

function formatCorePlatformLabel(value) {
  const token = String(value || "").trim().toLowerCase();
  if (!token) return "";
  if (token === "web") return "Web";
  if (token === "mobile") return "Mobile";
  if (token === "backend") return "Backend";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function collectDisplayTechnologies(projectData) {
  const technologies = Array.isArray(projectData.projectTechnologies) ? projectData.projectTechnologies : [];
  const normalized = technologies
    .map((value) => TECHNOLOGY_CANONICAL_LABEL_MAP[String(value || "").trim().toLowerCase()] || String(value || "").trim().toLowerCase())
    .filter(Boolean);

  const projectType = String(projectData.projectType || "").trim().toLowerCase();
  if (projectType && projectType !== "unknown") {
    normalized.unshift(projectType);
  }

  const deduped = [...new Set(normalized)];
  const withoutUnknown = deduped.filter((value) => value !== "unknown");
  const finalValues = withoutUnknown.length > 0 ? withoutUnknown : deduped;

  return finalValues
    .sort((left, right) => (
      technologyPriority(left, projectType) - technologyPriority(right, projectType)
      || left.localeCompare(right)
    ))
    .slice(0, 4);
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

    const displayTechnologies = collectDisplayTechnologies(projectData);
    const projectCorePlatform = String(projectData.corePlatform || "").trim().toLowerCase();

    if (projectCorePlatform) {
      metadataSummary.appendChild(createMetaBadge(formatCorePlatformLabel(projectCorePlatform), "project-meta-badge--core-platform"));
    }

    if (displayTechnologies.length > 0) {
      displayTechnologies.forEach((technology, index) => {
        const badgeClass = index === 0 ? "project-meta-badge--type" : "project-meta-badge--technology";
        metadataSummary.appendChild(createMetaBadge(formatTechnologyLabel(technology), badgeClass));
      });
    } else {
      metadataSummary.appendChild(createMetaBadge("No technologies", "project-meta-badge--muted"));
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
  const repos = collectAssetReposFromRows();

  const invalidRepo = repos.find((repo) => !repo.name || !repo.remoteUrl || !repo.localPath);
  if (invalidRepo) {
    setNotice("Each repository row must include name, remote URL, and local folder.", true);
    return;
  }

  const response = await runWithLoading(
    async () => {
      const existingResponse = await fetch("/api/asset-repos");
      if (!existingResponse.ok) {
        const payload = await existingResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to load existing repositories.");
      }
      const existingRepos = await existingResponse.json();
      const existingById = new Map(existingRepos.map((repo) => [repo.id, repo]));
      const submittedIds = new Set(repos.filter((repo) => repo.id).map((repo) => repo.id));

      for (const repo of repos) {
        const payload = {
          name: repo.name,
          remoteUrl: repo.remoteUrl,
          localPath: repo.localPath,
          enabled: repo.enabled,
        };
        if (repo.id && existingById.has(repo.id)) {
          const updateResponse = await fetch(`/api/asset-repos/${repo.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!updateResponse.ok) {
            const body = await updateResponse.json().catch(() => ({}));
            throw new Error(body.error || "Failed to update repository.");
          }
        } else {
          const createResponse = await fetch("/api/asset-repos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!createResponse.ok) {
            const body = await createResponse.json().catch(() => ({}));
            throw new Error(body.error || "Failed to create repository.");
          }
        }
      }

      for (const repo of existingRepos) {
        if (!submittedIds.has(repo.id)) {
          const deleteResponse = await fetch(`/api/asset-repos/${repo.id}`, { method: "DELETE" });
          if (!deleteResponse.ok) {
            const body = await deleteResponse.json().catch(() => ({}));
            throw new Error(body.error || "Failed to delete repository.");
          }
        }
      }

      return { ok: true };
    },
    {
      title: "Saving repositories...",
      description: "Updating AI asset repository configuration.",
    }
  );

  if (!response) return;
  if (response.ok) {
    setNotice("Repositories saved.");
    await loadAssetRepos();
    return;
  }

  const data = await response.json().catch(() => ({}));
  setNotice(data.error || "Failed to save repositories.", true);
});

addDevRootButton.addEventListener("click", () => {
  devRootsTable.appendChild(createDevRootRow(""));
});

addAssetRepoButton?.addEventListener("click", () => {
  assetReposTable.appendChild(createAssetRepoRow({ localPath: "" }));
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
  setNotice("Syncing repositories...");
  const response = await runWithLoading(
    async () => fetch("/api/asset-repos/sync", { method: "POST" }),
    {
      title: "Syncing repositories...",
      description: "Pulling all repos and cloning missing folders.",
      timeout: 180000,
    }
  );

  if (!response) return;

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    const results = Array.isArray(data.results) ? data.results : [];
    renderRepoSyncResults(results);
    const failedCount = results.filter((entry) => entry.status === "failed").length;
    if (failedCount > 0) {
      setNotice(`Sync completed with ${failedCount} failure(s).`, true);
    } else {
      setNotice("All repositories synced.");
    }
    return;
  }

  renderRepoSyncResults(Array.isArray(data.results) ? data.results : []);
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

Promise.all([loadAssetRepos(), loadDevProjects()]).catch(() => {
  setNotice("Failed to load settings.", true);
});
