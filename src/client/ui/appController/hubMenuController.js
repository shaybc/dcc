export function createHubMenuController({
  filterMenu,
  filterButton,
  localDefinitionsToggle,
  hideInstalledMenuToggle,
  getStoredHideInstalledDefinitions,
  getOnlyLocalDefinitions,
  hubMenu,
  hubMenuToggleButton,
  renderHubTagFilterSection,
}) {
  function closeFilterMenu() {
    filterMenu.classList.remove("open");
    filterButton.setAttribute("aria-expanded", "false");
  }

  function updateLocalDefinitionsToggleState() {
    if (!localDefinitionsToggle) return;
    localDefinitionsToggle.setAttribute("aria-checked", String(getOnlyLocalDefinitions()));
  }

  function updateHideInstalledToggleState() {
    if (!hideInstalledMenuToggle) return;
    hideInstalledMenuToggle.setAttribute("aria-checked", String(getStoredHideInstalledDefinitions()));
  }

  function closeHubMenu({ animate = true } = {}) {
    if (!hubMenu || !hubMenuToggleButton || hubMenu.hidden) return;
    hubMenuToggleButton.classList.remove("is-open");
    hubMenuToggleButton.setAttribute("aria-expanded", "false");
    hubMenuToggleButton.setAttribute("aria-label", "Open main menu");
    if (!animate) {
      hubMenu.classList.remove("is-visible", "is-hiding");
      hubMenu.hidden = true;
      return;
    }
    hubMenu.classList.remove("is-visible");
    hubMenu.classList.add("is-hiding");
    window.setTimeout(() => {
      hubMenu.classList.remove("is-hiding");
      hubMenu.hidden = true;
    }, 200);
  }

  function openHubMenu() {
    if (!hubMenu || !hubMenuToggleButton) return;
    renderHubTagFilterSection();
    hubMenu.hidden = false;
    hubMenu.classList.remove("is-hiding");
    hubMenu.classList.add("is-visible");
    hubMenuToggleButton.classList.add("is-open");
    hubMenuToggleButton.setAttribute("aria-expanded", "true");
    hubMenuToggleButton.setAttribute("aria-label", "Close main menu");
  }

  function toggleHubMenu() {
    if (!hubMenu || !hubMenuToggleButton) return;
    if (hubMenu.hidden) {
      openHubMenu();
      return;
    }
    closeHubMenu();
  }

  return {
    closeFilterMenu,
    updateLocalDefinitionsToggleState,
    updateHideInstalledToggleState,
    closeHubMenu,
    openHubMenu,
    toggleHubMenu,
  };
}
