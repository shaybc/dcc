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

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.style.color = isError ? "#dc2626" : "#6b7280";
}

function setDevRootsNotice(message, isError = false) {
  devRootsNotice.textContent = message;
  devRootsNotice.style.color = isError ? "#dc2626" : "#6b7280";
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

function renderDevProjects(projects) {
  devProjectsTable.innerHTML = "";
  if (projects.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.textContent = "No projects found yet.";
    row.appendChild(cell);
    devProjectsTable.appendChild(row);
    return;
  }
  projects.forEach((project) => {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.textContent = project.path || project;
    row.appendChild(cell);
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

addDevRootButton.addEventListener("click", () => {
  devRootsTable.appendChild(createDevRootRow(""));
});

saveDevRootsButton.addEventListener("click", async () => {
  const rows = Array.from(devRootsTable.querySelectorAll("tr"));
  const roots = rows
    .map((row) => row.querySelector("input")?.value.trim())
    .filter((value) => value);
  setDevRootsNotice("Saving roots and scanning projects...");
  const response = await fetch("/api/dev-project-roots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roots })
  });
  if (response.ok) {
    const data = await response.json();
    setDevRootsNotice("Roots saved. Project scan complete.");
    renderDevProjects(data.projects || []);
  } else {
    const data = await response.json();
    setDevRootsNotice(data.error || "Failed to save roots.", true);
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
loadDevProjects();
