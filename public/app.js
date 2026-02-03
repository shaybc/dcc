const cardsContainer = document.getElementById("cards");
const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("search");
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

function renderFilters() {
  const types = ["all", ...new Set(definitions.map((def) => def.type))];
  filtersContainer.innerHTML = "";
  types.forEach((type) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = type === "all" ? "All" : type;
    if (type === activeFilter) {
      chip.classList.add("active");
    }
    chip.addEventListener("click", () => {
      activeFilter = type;
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
