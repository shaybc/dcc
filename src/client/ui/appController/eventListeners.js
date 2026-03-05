export function setupEventListeners(ctx) {
  const {
    filterButton,
    filterMenu,
    hubMenu,
    activeVersionDropdownRef,
    closeFilterMenu,
    closeHubMenu,
    closeVersionDropdown,
    hideInstalledDefinitionsStorageKey,
    onlyLocalDefinitionsStorageKey,
    updateHideInstalledToggleState,
    renderCards,
    getStoredOnlyLocalDefinitions,
    setOnlyLocalDefinitions,
    updateLocalDefinitionsToggleState,
    renderFilters,
    clearSearchButton,
    setSearchValue,
    deleteDefinitionButton,
    getCurrentDetailDefinitionId,
    getCurrentDetailDefinitionSource,
    deleteDefinitionFromRepo,
    fetchDefinitions,
    updateRouteForHub,
    showHubPage,
    pushUpstreamDefinitionButton,
    openPushUpstreamModal,
    getCurrentDetailDefinitionName,
    pushDefinitionToUpstream,
    showDetails,
    installDefinitionButton,
    devProjectInput,
    getDefinitions,
    getSupportedDestinationOptions,
    openInstallDestinationMenu,
    favoriteDefinitionButton,
    toggleFavoriteDefinition,
    updateFavoriteDefinitionButton,
    autoTagDefinitionButton,
    getCurrentDetailDefinitionTags,
    suggestTagsForDefinitionContent,
    getCurrentDetailDefinitionContent,
    applyDefinitionTags,
    renderDetailTags,
    copyDefinitionButton,
    copyDefinitionToClipboard,
    duplicateDefinitionButton,
    createDuplicateDefaults,
    getCurrentDetailDefinitionPath,
    getCurrentDetailDefinitionDccUri,
    openDuplicateDefinitionModal,
    getCurrentDetailDefinitionContentValue,
    duplicateDefinition,
    updateRouteForDetails,
    definitionTabPreview,
    setDefinitionTab,
    definitionTabSource,
    definitionTabContextSize,
    definitionTabTest,
    runValidationButton,
    runValidationForCurrentDefinition,
    copyValidationReportButton,
    getLastValidationResult,
    validationSeverityFilter,
    renderValidationResult,
    closeModal,
    updateRouteForHubNoReplace,
    handleRoute,
    newDefinitionMenu,
    newDefinitionButton,
    toggleNewMenu,
    generateDefinitionMenuItem,
    generateDefinitionFromDescription,
    formatFilterLabel,
    filterIconSvg,
    escapeHtml,
    hubMenuToggleButton,
    toggleHubMenu,
    topNav,
    setActiveTopPage,
    localDefinitionsToggle,
    persistOnlyLocalDefinitions,
    hideInstalledMenuToggle,
    getStoredHideInstalledDefinitions,
    persistHideInstalledDefinitions,
    installGuideMenuItem,
    getIdeasMenuItem,
    settingsMenuItem,
    aboutMenuItem,
    openGetIdeasModal,
    closeGetIdeasModal,
    getIdeasOverlay,
    getIdeasCloseButton,
    openAboutModal,
    closeAboutModal,
    aboutDccOverlay,
    aboutDccCloseButton,
    aboutDccUpdateButton,
    triggerDccUpdate,
    openEditorForCurrentDefinition,
    editDefinitionButton,
    versionHistoryButton,
    openVersionHistoryDropdown,
  } = ctx;

  filterButton.addEventListener("click", () => {
    const isOpen = filterMenu.classList.toggle("open");
    filterButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    const eventPath = typeof event.composedPath === "function" ? event.composedPath() : [];
    const clickedInsideHubMenuWrap = eventPath.includes(hubMenu) || eventPath.some((node) => node?.classList?.contains?.("header-menu-wrap"));

    if (!event.target.closest(".filter-dropdown")) {
      closeFilterMenu();
    }
    if (hubMenu && !hubMenu.hidden && !clickedInsideHubMenuWrap) {
      closeHubMenu();
    }
    if (activeVersionDropdownRef() && !event.target.closest(".version-dropdown") && !event.target.closest("#versionHistoryButton")) {
      closeVersionDropdown();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === hideInstalledDefinitionsStorageKey) {
      updateHideInstalledToggleState();
      renderCards();
      return;
    }
    if (event.key === onlyLocalDefinitionsStorageKey) {
      setOnlyLocalDefinitions(getStoredOnlyLocalDefinitions());
      updateLocalDefinitionsToggleState();
      renderFilters();
      renderCards();
    }
  });

  clearSearchButton.addEventListener("click", () => {
    setSearchValue("");
    renderCards();
  });

  deleteDefinitionButton.addEventListener("click", async () => {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    const isUntrackedDefinition = getCurrentDetailDefinitionSource() === "untracked";
    const confirmationMessage = isUntrackedDefinition
      ? "Are you sure you want to delete this untracked local definition file? Note: if this definition is already installed in any project - it will not be deleted from those projects."
      : "Are you sure you want to delete this definition from team repository? Note: projects that already have this definition installed - will not be deleted, but you will not be able to install this definition to new projects or update existing installations. If you want to remove this definition from specific project(s) only - please select the project,and click 'Remove from project' button from the definition card or details page.";

    const isConfirmed = window.confirm(confirmationMessage);

    if (!isConfirmed) {
      return;
    }

    try {
      const result = await deleteDefinitionFromRepo(currentDetailDefinitionId);
      await fetchDefinitions();
      updateRouteForHub(true);
      showHubPage();
      const successMessage = isUntrackedDefinition
        ? "Definition deleted from local files."
        : "Definition deleted from the repository.";
      window.alert(result?.message || successMessage);
    } catch (error) {
      window.alert(error.message || "Unable to delete definition.");
    }
  });

  pushUpstreamDefinitionButton.addEventListener("click", async () => {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    const submission = await openPushUpstreamModal({ definitionName: getCurrentDetailDefinitionName() || "" });
    if (!submission) {
      return;
    }

    try {
      const result = await pushDefinitionToUpstream(currentDetailDefinitionId, submission);
      await fetchDefinitions();
      const updatedDefinitionId = Number(result?.definition?.id || currentDetailDefinitionId);
      await showDetails(updatedDefinitionId);
      window.alert(result?.message || "Definition pushed to upstream repository.");
    } catch (error) {
      window.alert(error.message || "Unable to push definition.");
    }
  });

  installDefinitionButton?.addEventListener("click", () => {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }
    if (!devProjectInput.value.trim()) {
      window.alert("Please select a project first.");
      return;
    }

    const currentDefinition = getDefinitions().find((item) => Number(item.id) === Number(currentDetailDefinitionId));
    if (!currentDefinition) {
      window.alert("Definition not found.");
      return;
    }
    if (getSupportedDestinationOptions(currentDefinition).length === 0) {
      window.alert("This definition type cannot be installed/exported to available destinations.");
      return;
    }

    openInstallDestinationMenu(installDefinitionButton, currentDefinition);
  });

  favoriteDefinitionButton?.addEventListener("click", () => {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    toggleFavoriteDefinition(currentDetailDefinitionId);
    updateFavoriteDefinitionButton();
    renderCards();
  });

  autoTagDefinitionButton?.addEventListener("click", async () => {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    const existingTags = Array.isArray(getCurrentDetailDefinitionTags()) ? [...getCurrentDetailDefinitionTags()] : [];
    if (existingTags.length > 0) {
      const confirmed = window.confirm("Auto-tagging will replace current tags. Continue?");
      if (!confirmed) {
        return;
      }
    }

    try {
      const suggestedTags = await suggestTagsForDefinitionContent({
        definitionContent: getCurrentDetailDefinitionContent(),
        existingTags,
        availableTags: await (ctx.loadAvailableDefinitionTags || (() => Promise.resolve([])))(),
      });
      if (!Array.isArray(suggestedTags) || suggestedTags.length === 0) {
        window.alert("No tags were suggested for this definition.");
        return;
      }
      await applyDefinitionTags(currentDetailDefinitionId, suggestedTags);
      renderDetailTags(suggestedTags);
      renderCards();
      window.alert("Definition tags updated.");
    } catch (error) {
      window.alert(error.message || "Unable to auto-tag definition.");
    }
  });

  copyDefinitionButton?.addEventListener("click", async () => {
    await copyDefinitionToClipboard();
  });

  duplicateDefinitionButton?.addEventListener("click", async () => {
    const currentDetailDefinitionId = getCurrentDetailDefinitionId();
    if (!Number.isFinite(Number(currentDetailDefinitionId)) || currentDetailDefinitionId <= 0) {
      return;
    }

    const { defaultName, defaultFileName, defaultDccUri } = createDuplicateDefaults(
      getCurrentDetailDefinitionName(),
      getCurrentDetailDefinitionPath(),
      getCurrentDetailDefinitionContentValue(),
      getCurrentDetailDefinitionDccUri()
    );

    const duplicateDetails = await openDuplicateDefinitionModal({
      defaultName,
      defaultDccUri,
      defaultContent: getCurrentDetailDefinitionContentValue(),
    });
    if (!duplicateDetails) {
      return;
    }

    const duplicateFileName = window.prompt("New definition file name", defaultFileName);
    if (duplicateFileName === null) {
      return;
    }

    const normalizedFileName = duplicateFileName.trim();
    if (!normalizedFileName) {
      window.alert("Definition file name cannot be empty.");
      return;
    }

    try {
      const result = await duplicateDefinition(currentDetailDefinitionId, {
        name: duplicateDetails.name,
        fileName: normalizedFileName,
        dccUri: duplicateDetails.dccUri,
        content: duplicateDetails.content,
      });
      await fetchDefinitions();
      if (Number.isFinite(Number(result?.id)) && result.id > 0) {
        updateRouteForDetails(result.id);
        await showDetails(result.id);
        return;
      }
      window.alert("Definition duplicated, but unable to locate the new copy.");
    } catch (error) {
      window.alert(error.message || "Unable to duplicate definition.");
    }
  });

  definitionTabPreview.addEventListener("click", () => {
    setDefinitionTab("preview");
  });

  definitionTabSource.addEventListener("click", () => {
    setDefinitionTab("source");
  });

  definitionTabContextSize.addEventListener("click", () => {
    setDefinitionTab("contextSize");
  });

  definitionTabTest.addEventListener("click", () => {
    setDefinitionTab("test");
  });

  runValidationButton?.addEventListener("click", () => {
    runValidationForCurrentDefinition();
  });

  copyValidationReportButton?.addEventListener("click", async () => {
    const lastValidationResult = getLastValidationResult();
    if (!lastValidationResult) {
      return;
    }
    const raw = JSON.stringify(lastValidationResult, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(raw);
    }
  });

  validationSeverityFilter?.addEventListener("change", () => {
    const lastValidationResult = getLastValidationResult();
    if (lastValidationResult) {
      renderValidationResult(lastValidationResult);
    }
  });

  closeModal.addEventListener("click", () => {
    showHubPage();
    updateRouteForHubNoReplace();
  });

  window.addEventListener("popstate", () => {
    handleRoute();
  });

  document.addEventListener("click", (event) => {
    if (newDefinitionMenu && !event.target.closest(".new-menu-wrap")) {
      newDefinitionMenu.hidden = true;
      if (newDefinitionButton) {
        newDefinitionButton.setAttribute("aria-expanded", "false");
      }
    }
  });

  if (newDefinitionButton) {
    newDefinitionButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNewMenu();
    });
  }

  if (newDefinitionMenu) {
    newDefinitionMenu.querySelectorAll("[data-new-type]").forEach((button) => {
      const type = button.getAttribute("data-new-type") || "prompt";
      const label = button.getAttribute("data-type-label") || formatFilterLabel(type);
      button.innerHTML = `<span class="menu-type-icon">${filterIconSvg(type)}</span><span>${escapeHtml(label)}</span>`;
      button.addEventListener("click", () => {
        window.location.assign(`/editor/editor.html?mode=create&type=${encodeURIComponent(type)}`);
      });
    });
  }

  if (generateDefinitionMenuItem) {
    generateDefinitionMenuItem.innerHTML = `<span class="menu-type-icon">✨</span><span>Generate Definition</span>`;
    generateDefinitionMenuItem.addEventListener("click", async () => {
      newDefinitionMenu.hidden = true;
      newDefinitionButton?.setAttribute("aria-expanded", "false");
      await generateDefinitionFromDescription();
    });
  }

  if (hubMenuToggleButton) {
    hubMenuToggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleHubMenu();
    });
  }

  if (topNav) {
    topNav.querySelectorAll("[data-top-nav-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const selectedPage = button.getAttribute("data-top-nav-tab") || "discover";
        setActiveTopPage(selectedPage);
      });
    });
  }

  if (localDefinitionsToggle) {
    updateLocalDefinitionsToggleState();
    localDefinitionsToggle.addEventListener("click", () => {
      const nextValue = !getStoredOnlyLocalDefinitions();
      persistOnlyLocalDefinitions(nextValue);
      setOnlyLocalDefinitions(nextValue);
      updateLocalDefinitionsToggleState();
      ctx.setCurrentCardsPage(1);
      renderFilters();
      renderCards();
    });
  }

  if (hideInstalledMenuToggle) {
    updateHideInstalledToggleState();
    hideInstalledMenuToggle.addEventListener("click", () => {
      const nextValue = !getStoredHideInstalledDefinitions();
      persistHideInstalledDefinitions(nextValue);
      updateHideInstalledToggleState();
      ctx.setCurrentCardsPage(1);
      renderCards();
    });
  }

  if (installGuideMenuItem) {
    installGuideMenuItem.addEventListener("click", () => {
      closeHubMenu({ animate: false });
      window.location.assign("/user-guide.html");
    });
  }


  if (getIdeasMenuItem) {
    getIdeasMenuItem.addEventListener("click", () => {
      closeHubMenu({ animate: false });
      openGetIdeasModal();
    });
  }

  if (settingsMenuItem) {
    settingsMenuItem.addEventListener("click", () => {
      closeHubMenu({ animate: false });
      window.location.assign("/settings.html");
    });
  }

  if (aboutMenuItem) {
    aboutMenuItem.addEventListener("click", async () => {
      closeHubMenu({ animate: false });
      await openAboutModal();
    });
  }


  if (getIdeasCloseButton) {
    getIdeasCloseButton.addEventListener("click", () => {
      closeGetIdeasModal();
    });
  }

  if (getIdeasOverlay) {
    getIdeasOverlay.addEventListener("click", (event) => {
      if (event.target === getIdeasOverlay) {
        closeGetIdeasModal();
      }
    });
  }

  if (aboutDccCloseButton) {
    aboutDccCloseButton.addEventListener("click", () => {
      closeAboutModal();
    });
  }

  if (aboutDccOverlay) {
    aboutDccOverlay.addEventListener("click", (event) => {
      if (event.target === aboutDccOverlay) {
        closeAboutModal();
      }
    });
  }

  if (aboutDccUpdateButton) {
    aboutDccUpdateButton.addEventListener("click", async () => {
      await triggerDccUpdate();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && hubMenu && !hubMenu.hidden) {
      closeHubMenu();
      return;
    }
    if (event.key === "Escape" && getIdeasOverlay && !getIdeasOverlay.hidden) {
      closeGetIdeasModal();
      return;
    }
    if (event.key === "Escape" && aboutDccOverlay && !aboutDccOverlay.hidden) {
      closeAboutModal();
    }
  });

  if (editDefinitionButton) {
    editDefinitionButton.addEventListener("click", () => {
      openEditorForCurrentDefinition();
    });
  }

  if (versionHistoryButton) {
    versionHistoryButton.addEventListener("click", async () => {
      try {
        await openVersionHistoryDropdown();
      } catch (error) {
        window.alert(error.message || "Unable to load version history.");
      }
    });
  }
}
