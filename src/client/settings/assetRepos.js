import { escapeHtml, inferRepoName, normalizeLocalPath } from "./helpers.js";

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

function renderAssetRepos(assetReposTable, repos) {
  if (!assetReposTable) return;
  assetReposTable.innerHTML = "";
  if (!repos.length) {
    assetReposTable.appendChild(createAssetRepoRow({ localPath: "" }));
    return;
  }
  repos.forEach((repo) => assetReposTable.appendChild(createAssetRepoRow(repo)));
}

export async function loadAssetRepos({ assetReposTable }) {
  const response = await fetch("/api/asset-repos");
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to load repositories.");
  }
  const data = await response.json();
  renderAssetRepos(assetReposTable, Array.isArray(data) ? data : []);
}

function collectAssetReposFromRows(assetReposTable) {
  const rows = Array.from(assetReposTable?.querySelectorAll("tr") || []);
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

function renderRepoSyncResults(assetRepoSyncTable, results = []) {
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

function showSkippedDefinitionsModal(skippedDefinitions = []) {
  const entries = Array.isArray(skippedDefinitions) ? skippedDefinitions.filter((item) => item?.filePath && item?.reason) : [];
  if (entries.length === 0) return;

  document.getElementById("skippedDefinitionsOverlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "skippedDefinitionsOverlay";
  overlay.className = "settings-models-overlay";

  const rowsHtml = entries
    .map((item) => {
      const source = String(item.source || "").trim();
      const sourceLabel = source ? ` (${source})` : "";
      return `<tr><td><code>${escapeHtml(String(item.filePath))}</code>${escapeHtml(sourceLabel)}</td><td>${escapeHtml(String(item.reason))}</td></tr>`;
    })
    .join("");

  overlay.innerHTML = `
    <div class="settings-models-dialog" role="dialog" aria-modal="true" aria-labelledby="skippedDefinitionsTitle">
      <div class="modal-topbar">
        <div>
          <p class="modal-kicker">Definition load report</p>
          <h3 id="skippedDefinitionsTitle">Some definitions could not be loaded</h3>
        </div>
        <button class="btn" type="button" data-role="close-skipped-definitions">Close</button>
      </div>
      <p class="helper-text">The files below were skipped while loading definitions.</p>
      <div class="settings-models-content">
        <table class="settings-table" aria-label="Skipped definitions">
          <thead>
            <tr>
              <th>File</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;

  function closeModal() {
    overlay.remove();
  }

  overlay.querySelector('[data-role="close-skipped-definitions"]')?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
}

export function initAssetRepos({
  settingsForm,
  addAssetRepoButton,
  clonePullButton,
  loadDefinitionsButton,
  assetReposTable,
  assetRepoSyncTable,
  setNotice,
  runWithLoading,
  reloadAssetRepos,
}) {
  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const repos = collectAssetReposFromRows(assetReposTable);

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
        const toDelete = existingRepos.filter((repo) => repo.id && !submittedIds.has(repo.id));

        for (const repo of toDelete) {
          const deleteResponse = await fetch(`/api/asset-repos/${repo.id}`, { method: "DELETE" });
          if (!deleteResponse.ok) {
            const payload = await deleteResponse.json().catch(() => ({}));
            throw new Error(payload.error || `Failed to delete repository ${repo.name}.`);
          }
        }

        for (const repo of repos) {
          if (repo.id && existingById.has(repo.id)) {
            const updateResponse = await fetch(`/api/asset-repos/${repo.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: repo.name,
                remoteUrl: repo.remoteUrl,
                localPath: repo.localPath,
                enabled: repo.enabled
              })
            });
            if (!updateResponse.ok) {
              const payload = await updateResponse.json().catch(() => ({}));
              throw new Error(payload.error || `Failed to update repository ${repo.name}.`);
            }
            continue;
          }

          const createResponse = await fetch("/api/asset-repos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: repo.name,
              remoteUrl: repo.remoteUrl,
              localPath: repo.localPath,
              enabled: repo.enabled
            })
          });
          if (!createResponse.ok) {
            const payload = await createResponse.json().catch(() => ({}));
            throw new Error(payload.error || `Failed to create repository ${repo.name}.`);
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
      await reloadAssetRepos();
      return;
    }

    const data = await response.json().catch(() => ({}));
    setNotice(data.error || "Failed to save repositories.", true);
  });

  addAssetRepoButton?.addEventListener("click", () => {
    assetReposTable?.appendChild(createAssetRepoRow({ localPath: "" }));
  });

  clonePullButton?.addEventListener("click", async () => {
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
      renderRepoSyncResults(assetRepoSyncTable, results);
      const failedCount = results.filter((entry) => entry.status === "failed").length;
      setNotice(failedCount > 0 ? `Sync completed with ${failedCount} failure(s).` : "All repositories synced.", failedCount > 0);
      return;
    }

    renderRepoSyncResults(assetRepoSyncTable, Array.isArray(data.results) ? data.results : []);
    setNotice(data.error || "Sync failed.", true);
  });

  loadDefinitionsButton?.addEventListener("click", async () => {
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
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const skippedCount = Array.isArray(data?.result?.skippedDefinitions) ? data.result.skippedDefinitions.length : 0;
      if (skippedCount > 0) {
        setNotice(`Definitions loaded with ${skippedCount} skipped file(s).`, true);
        showSkippedDefinitionsModal(data.result.skippedDefinitions);
      } else {
        setNotice("Definitions loaded.");
      }
      return;
    }

    setNotice(data.error || "Load failed.", true);
  });
}
