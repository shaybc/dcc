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


function normalizeDroppedPath(value = "") {
  return String(value).trim();
}

function getDroppedPath(file) {
  return normalizeDroppedPath(file?.path || file?.webkitRelativePath || file?.name || "");
}

function getUniqueDroppedPaths(dataTransfer) {
  const files = Array.from(dataTransfer?.files || []);
  return [...new Set(files.map(getDroppedPath).filter(Boolean))];
}

function getExistingDevRootPaths(devRootsTable) {
  return new Set(
    Array.from(devRootsTable?.querySelectorAll("input") || [])
      .map((input) => normalizeDroppedPath(input.value))
      .filter(Boolean)
  );
}

function appendDevRootPaths(devRootsTable, paths) {
  if (!devRootsTable || paths.length === 0) return 0;

  const existingPaths = getExistingDevRootPaths(devRootsTable);
  let addedCount = 0;

  paths.forEach((path) => {
    if (existingPaths.has(path)) return;
    devRootsTable.appendChild(createDevRootRow(path));
    existingPaths.add(path);
    addedCount += 1;
  });

  return addedCount;
}

function initDevRootDropzone({ devRootDropzone, devRootsTable, setDevRootsNotice }) {
  if (!devRootDropzone) return;

  const setDragging = (isDragging) => {
    devRootDropzone.classList.toggle("dev-root-dropzone--dragging", isDragging);
  };

  ["dragenter", "dragover"].forEach((eventName) => {
    devRootDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragging(true);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    });
  });

  ["dragleave", "dragend"].forEach((eventName) => {
    devRootDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragging(false);
    });
  });

  devRootDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);

    const droppedPaths = getUniqueDroppedPaths(event.dataTransfer);
    const addedCount = appendDevRootPaths(devRootsTable, droppedPaths);

    if (addedCount > 0) {
      setDevRootsNotice(`${addedCount} dropped path${addedCount === 1 ? "" : "s"} added. Save to rescan projects.`);
      return;
    }

    setDevRootsNotice(
      droppedPaths.length > 0
        ? "Dropped paths are already in the roots table."
        : "No usable file or folder path was found in the drop.",
      droppedPaths.length === 0
    );
  });
}

function renderDevRoots(devRootsTable, roots) {
  if (!devRootsTable) return;
  devRootsTable.innerHTML = "";
  if (roots.length === 0) {
    devRootsTable.appendChild(createDevRootRow(""));
    return;
  }
  roots.forEach((root) => devRootsTable.appendChild(createDevRootRow(root.path || root)));
}

const TECHNOLOGY_CANONICAL_LABEL_MAP = Object.freeze({ js: "javascript", ts: "typescript", md: "markdown" });
const PRIMARY_LANGUAGE_TECHNOLOGIES = new Set(["node", "python", "java", "csharp", "dotnet", "go", "rust", "swift", "swiftui", "objective-c", "c++", "groovy", "android", "angular", "springboot"]);
const MINOR_TECHNOLOGIES = new Set(["javascript", "typescript", "react", "vue", "html", "css", "scss"]);
const DATA_CONFIG_TECHNOLOGIES = new Set(["json", "yaml", "xml", "markdown"]);

function technologyPriority(token, projectType) {
  if (token === projectType && projectType && projectType !== "unknown") return -1;
  if (PRIMARY_LANGUAGE_TECHNOLOGIES.has(token)) return 0;
  if (MINOR_TECHNOLOGIES.has(token)) return 1;
  if (DATA_CONFIG_TECHNOLOGIES.has(token)) return 2;
  return 3;
}

function formatTechnologyLabel(value) {
  const token = String(value || "").trim().toLowerCase();
  if (!token) return "";
  const labels = {
    js: "JS", ts: "TS", jsx: "JSX", tsx: "TSX", html: "HTML", css: "CSS", scss: "SCSS", yaml: "YAML", json: "JSON", xml: "XML", dotnet: ".NET", csharp: "C#", "c++": "C++", "objective-c": "Objective-C", swiftui: "SwiftUI", javascript: "JavaScript", typescript: "TypeScript", springboot: "Spring Boot"
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
  if (projectType && projectType !== "unknown") normalized.unshift(projectType);

  const deduped = [...new Set(normalized)];
  const withoutUnknown = deduped.filter((value) => value !== "unknown");
  const finalValues = withoutUnknown.length > 0 ? withoutUnknown : deduped;

  return finalValues
    .sort((left, right) => technologyPriority(left, projectType) - technologyPriority(right, projectType) || left.localeCompare(right))
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

function renderDevProjects(devProjectsTable, projects) {
  if (!devProjectsTable) return;
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

    metadataCell.append(metadataSummary, scannedAt);
    row.append(pathCell, metadataCell);
    devProjectsTable.appendChild(row);
  });
}

export async function loadDevProjects({ devRootsTable, devProjectsTable }) {
  const [rootsResponse, projectsResponse] = await Promise.all([
    fetch("/api/dev-project-roots"),
    fetch("/api/dev-projects")
  ]);
  const roots = await rootsResponse.json();
  const projects = await projectsResponse.json();
  renderDevRoots(devRootsTable, roots);
  renderDevProjects(devProjectsTable, projects);
}

export function initDevProjects({ addDevRootButton, saveDevRootsButton, devRootsTable, devRootDropzone, devProjectsTable, setDevRootsNotice, runWithLoading }) {
  initDevRootDropzone({ devRootDropzone, devRootsTable, setDevRootsNotice });

  addDevRootButton?.addEventListener("click", () => {
    devRootsTable?.appendChild(createDevRootRow(""));
  });

  saveDevRootsButton?.addEventListener("click", async () => {
    const rows = Array.from(devRootsTable?.querySelectorAll("tr") || []);
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
      renderDevProjects(devProjectsTable, data.projects || []);
      return;
    }

    const data = await response.json();
    setDevRootsNotice(data.error || "Failed to save roots.", true);
  });
}
