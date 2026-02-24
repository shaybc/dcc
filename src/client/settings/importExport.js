import { setTextNotice } from "./helpers.js";

function getTransferModeConfig(mode) {
  const configByMode = {
    "settings-import": {
      title: "Import Settings",
      description: "Choose the JSON file path to import settings from.",
      buttonText: "Import Settings",
      endpoint: "/api/settings/import",
      placeholder: "/tmp/dcc-settings.json",
      reloadOnSuccess: true,
      successMessage: "Settings imported."
    },
    "settings-export": {
      title: "Export Settings",
      description: "Choose a local path and file name for the exported JSON settings file.",
      buttonText: "Export Settings",
      endpoint: "/api/settings/export",
      placeholder: "/tmp/dcc-settings.json",
      reloadOnSuccess: false,
      successMessage: "Settings exported."
    },
    "db-backup": {
      title: "Backup Database",
      description: "Choose a local path and file name for the database backup file.",
      buttonText: "Backup Database",
      endpoint: "/api/database/backup",
      placeholder: "/tmp/dcc.sqlite",
      reloadOnSuccess: false,
      successMessage: "Database backup created."
    },
    "db-restore": {
      title: "Restore Database",
      description: "Choose the database backup file path to restore from.",
      buttonText: "Restore Database",
      endpoint: "/api/database/restore",
      placeholder: "/tmp/dcc.sqlite",
      reloadOnSuccess: true,
      successMessage: "Database restored."
    }
  };
  return configByMode[mode] || configByMode["settings-export"];
}

export function initImportExport(domRefs) {
  const {
    importExportMenu,
    importExportMenuButton,
    importExportMenuList,
    importSettingsButton,
    exportSettingsButton,
    backupDatabaseButton,
    restoreDatabaseButton,
    settingsImportExportOverlay,
    settingsImportExportTitle,
    settingsImportExportDescription,
    settingsTransferPathInput,
    settingsImportExportNotice,
    confirmSettingsImportExportButton,
    closeSettingsImportExportDialogButton,
  } = domRefs;

  let settingsTransferMode = "settings-export";

  function setSettingsTransferNotice(message, isError = false) {
    setTextNotice(settingsImportExportNotice, message, isError);
  }

  function setImportExportMenuOpen(isOpen) {
    if (!importExportMenuList || !importExportMenuButton) return;
    importExportMenuList.hidden = !isOpen;
    importExportMenuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeImportExportDialog() {
    if (!settingsImportExportOverlay) return;
    settingsImportExportOverlay.hidden = true;
    setSettingsTransferNotice("");
  }

  function openImportExportDialog(mode) {
    if (!settingsImportExportOverlay || !settingsTransferPathInput || !settingsImportExportTitle || !settingsImportExportDescription || !confirmSettingsImportExportButton) {
      return;
    }
    settingsTransferMode = mode;
    const modeConfig = getTransferModeConfig(mode);
    settingsImportExportTitle.textContent = modeConfig.title;
    settingsImportExportDescription.textContent = modeConfig.description;
    confirmSettingsImportExportButton.textContent = modeConfig.buttonText;
    settingsTransferPathInput.placeholder = modeConfig.placeholder;
    setSettingsTransferNotice("");
    settingsImportExportOverlay.hidden = false;
    setTimeout(() => settingsTransferPathInput.focus(), 0);
  }

  importExportMenuButton?.addEventListener("click", () => {
    if (!importExportMenuList) return;
    setImportExportMenuOpen(importExportMenuList.hidden);
  });

  importSettingsButton?.addEventListener("click", () => {
    setImportExportMenuOpen(false);
    openImportExportDialog("settings-import");
  });

  exportSettingsButton?.addEventListener("click", () => {
    setImportExportMenuOpen(false);
    openImportExportDialog("settings-export");
  });

  backupDatabaseButton?.addEventListener("click", () => {
    setImportExportMenuOpen(false);
    openImportExportDialog("db-backup");
  });

  restoreDatabaseButton?.addEventListener("click", () => {
    setImportExportMenuOpen(false);
    openImportExportDialog("db-restore");
  });

  closeSettingsImportExportDialogButton?.addEventListener("click", closeImportExportDialog);

  settingsImportExportOverlay?.addEventListener("click", (event) => {
    if (event.target === settingsImportExportOverlay) {
      closeImportExportDialog();
    }
  });

  confirmSettingsImportExportButton?.addEventListener("click", async () => {
    const filePath = String(settingsTransferPathInput?.value || "").trim();
    if (!filePath) {
      setSettingsTransferNotice("Please provide a file path.", true);
      return;
    }

    const modeConfig = getTransferModeConfig(settingsTransferMode);
    const response = await fetch(modeConfig.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSettingsTransferNotice(payload.error || "Operation failed.", true);
      return;
    }

    if (modeConfig.reloadOnSuccess) {
      closeImportExportDialog();
      window.location.reload();
      return;
    }

    setSettingsTransferNotice(`${modeConfig.successMessage} Saved to ${filePath}.`);
  });

  document.addEventListener("click", (event) => {
    if (!importExportMenu || !importExportMenuList || importExportMenuList.hidden) return;
    if (!(event.target instanceof Node)) return;
    if (!importExportMenu.contains(event.target)) {
      setImportExportMenuOpen(false);
    }
  });

  return {
    closeImportExportDialog,
    isOpen: () => Boolean(settingsImportExportOverlay && !settingsImportExportOverlay.hidden),
  };
}
