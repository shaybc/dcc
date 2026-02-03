const cardsContainer = document.getElementById("cards");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("search");
const clearSearchButton = document.getElementById("clearSearch");
const searchField = document.querySelector(".search-field");
const modal = document.getElementById("detailModal");
const closeModal = document.getElementById("closeModal");
const detailTitle = document.getElementById("detailTitle");
const detailDescription = document.getElementById("detailDescription");
const detailContent = document.getElementById("detailContent");
const detailStatus = document.getElementById("detailStatus");

let definitions = [];
let activeFilter = "all";
let searchTerm = "";

function iconSvg(status) {
  if (status === "saved") {
    return `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 10.5l3 3 7-7" />
      </svg>
    `;
  }
  if (status === "local-only") {
    return `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 4v12" />
        <path d="M6 8l4-4 4 4" />
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  `;
}

function statusLabel(status) {
  if (status === "saved") {
    return "Saved to team";
  }
  if (status === "local-only") {
    return "Local only";
  }
  return "Available";
}

function filterIconSvg(type) {
  if (type === "prompt" || type === "prompts") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 3 1.2-4.6A6 6 0 0 1 3 15a6 6 0 0 1 6-6h8a4 4 0 0 1 4 4z"></path>
      </svg>
    `;
  }
  if (type === "model" || type === "models") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.1.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8"></circle>
      <path d="M8 12h8"></path>
      <path d="M12 8v8"></path>
    </svg>
  `;
}

function renderFilters() {
  const types = ["all", ...new Set(definitions.map((def) => def.type))];
  filtersContainer.innerHTML = "";
  types.forEach((type) => {
    const chip = document.createElement("button");
    const label = type === "all" ? "All" : type;
    chip.className = "chip";
    chip.innerHTML = `
      <span class="chip-icon">${filterIconSvg(type)}</span>
      <span class="chip-label">${label}</span>
      ${
        type === activeFilter && type !== "all"
          ? `<span class="chip-clear" role="button" aria-label="Clear filter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </span>`
          : ""
      }
    `;
    if (type === activeFilter) {
      chip.classList.add("active");
    }
    chip.addEventListener("click", (event) => {
      if (event.target.closest(".chip-clear")) {
        activeFilter = "all";
      } else {
        activeFilter = type;
      }
      renderFilters();
      renderCards();
    });
    filtersContainer.appendChild(chip);
  });
}

function renderCards() {
  const filtered = definitions.filter((def) => {
    const matchesFilter = activeFilter === "all" || def.type === activeFilter;
    const text = `${def.name} ${def.description}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  cardsContainer.innerHTML = "";

  filtered.forEach((def) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="icon-btn" data-action>
        ${iconSvg(def.status)}
      </div>
      <h3>${def.name}</h3>
      <p>${def.description || "No description provided."}</p>
      <div class="meta">${def.type} · ${statusLabel(def.status)}</div>
    `;

    card.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-action]");
      if (action) {
        event.stopPropagation();
        if (def.status === "local-only") {
          await publishDefinition(def.id);
        } else if (def.status !== "saved") {
          await saveDefinition(def.id);
        }
        await fetchDefinitions();
        return;
      }
      await showDetails(def.id);
    });
    cardsContainer.appendChild(card);
  });
}

async function fetchDefinitions() {
  const response = await fetch("/api/definitions");
  definitions = await response.json();
  renderFilters();
  renderCards();
}

async function showDetails(id) {
  const response = await fetch(`/api/definitions/${id}`);
  const def = await response.json();
  detailTitle.textContent = def.name;
  detailDescription.textContent = def.description || "No description provided.";
  detailContent.textContent = def.content || "";
  detailStatus.textContent = statusLabel(def.status);
  detailStatus.className = `status-pill ${def.status}`;
  modal.classList.add("open");
}

async function saveDefinition(id) {
  await fetch(`/api/definitions/${id}/save`, { method: "POST" });
}

async function publishDefinition(id) {
  await fetch(`/api/definitions/${id}/publish`, { method: "POST" });
}

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.toLowerCase();
  searchField.classList.toggle("has-value", searchTerm.length > 0);
  renderCards();
});

clearSearchButton.addEventListener("click", () => {
  searchTerm = "";
  searchInput.value = "";
  searchField.classList.remove("has-value");
  renderCards();
});

closeModal.addEventListener("click", () => {
  modal.classList.remove("open");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("open");
  }
});

fetchDefinitions();
