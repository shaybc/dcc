import {
  getDefaultTimeout,
  initLoadingService,
  runWithLoading,
  setDefaultTimeout,
} from "./services/loadingService.js";
import { initNotificationService } from "./services/notificationService.js";
import * as dom from "./settings/dom.js";
import { initAssetRepos, loadAssetRepos } from "./settings/assetRepos.js";
import { initDevProjects, loadDevProjects } from "./settings/devProjects.js";
import { setTextNotice } from "./settings/helpers.js";
import { initImportExport } from "./settings/importExport.js";
import { initModelsDialog } from "./settings/modelsDialog.js";
import { initRecommendationSettings, loadRecommendationSettings } from "./settings/recommendations.js";
import { initThemeSettings } from "./settings/theme.js";

initLoadingService();
initNotificationService();

const setNotice = (message, isError = false) => setTextNotice(dom.notice, message, isError);
const setDevRootsNotice = (message, isError = false) => setTextNotice(dom.devRootsNotice, message, isError);

initThemeSettings({ themeToggle: dom.themeToggle, themeToggleLabel: dom.themeToggleLabel });

initAssetRepos({
  settingsForm: dom.settingsForm,
  addAssetRepoButton: dom.addAssetRepoButton,
  clonePullButton: dom.clonePullButton,
  loadDefinitionsButton: dom.loadDefinitionsButton,
  assetReposTable: dom.assetReposTable,
  assetRepoSyncTable: dom.assetRepoSyncTable,
  setNotice,
  runWithLoading,
  reloadAssetRepos: () => loadAssetRepos({ assetReposTable: dom.assetReposTable }),
});

initDevProjects({
  addDevRootButton: dom.addDevRootButton,
  saveDevRootsButton: dom.saveDevRootsButton,
  devRootsTable: dom.devRootsTable,
  devRootDropzone: dom.devRootDropzone,
  devProjectsTable: dom.devProjectsTable,
  setDevRootsNotice,
  runWithLoading,
});

initRecommendationSettings(dom, {
  setNotice,
  getDefaultTimeout,
  setDefaultTimeout,
});

const importExportController = initImportExport(dom);
const modelsController = initModelsDialog(dom);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && importExportController.isOpen()) {
    importExportController.closeImportExportDialog();
    return;
  }
  if (event.key === "Escape" && modelsController.isOpen()) {
    modelsController.closeModelsDialog();
  }
});

Promise.all([
  loadAssetRepos({ assetReposTable: dom.assetReposTable }),
  loadDevProjects({ devRootsTable: dom.devRootsTable, devProjectsTable: dom.devProjectsTable }),
  loadRecommendationSettings(dom)
]).catch(() => {
  setNotice("Failed to load settings.", true);
});
