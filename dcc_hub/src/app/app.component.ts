import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AiAssetsService } from "./ai-assets.service";
import { DefinitionCard, DefinitionType } from "./models";
import { ContinueFolderService } from "./continue-folder.service";
import { StorageService } from "./storage.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss"
})
export class AppComponent implements OnInit {
  searchTerm = "";
  activeType: DefinitionType | "All" | "Prompt" | "Agent" | "User" | "Org" = "All";
  definitions: DefinitionCard[] = [];
  filtered: DefinitionCard[] = [];
  filterOptions: Array<{ label: string; value: DefinitionType | "All" | "Prompt" | "Agent" | "User" | "Org" }> = [
    { label: "All", value: "All" },
    { label: "Models", value: "Model" },
    { label: "MCP Servers", value: "MCP Server" },
    { label: "Rules", value: "Rule" },
    { label: "Prompts", value: "Prompt" },
    { label: "Agents", value: "Agent" },
    { label: "Users", value: "User" },
    { label: "Orgs", value: "Org" }
  ];
  statusMessage = "";
  lastLoadedAt = "";
  lastSourceLabel = "";
  savedIds = new Set<string>();
  canRefresh = false;
  filterMenuOpen = false;

  constructor(
    private aiAssets: AiAssetsService,
    private continueFolder: ContinueFolderService,
    private storage: StorageService
  ) {}

  ngOnInit(): void {
    this.savedIds = new Set(this.storage.getSavedIds());
    const cached = this.aiAssets.loadCachedDefinitions();
    if (cached.length) {
      this.definitions = cached;
    }
    this.applyFilter();
    this.loadSampleIfEmpty();
    this.loadSettings();
    this.canRefresh = this.aiAssets.canRefresh();
  }

  async pickFolder(): Promise<void> {
    this.statusMessage = "";
    try {
      this.definitions = await this.aiAssets.selectAndLoadDefinitions();
      this.statusMessage = `Loaded ${this.definitions.length} definitions from ai_assets.`;
      this.loadSettings();
      this.canRefresh = this.aiAssets.canRefresh();
      this.applyFilter();
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : "Unable to load definitions.";
    }
  }

  async refreshDefinitions(): Promise<void> {
    this.statusMessage = "";
    try {
      this.definitions = await this.aiAssets.refreshDefinitions();
      this.statusMessage = `Refreshed ${this.definitions.length} definitions from ai_assets.`;
      this.loadSettings();
      this.canRefresh = this.aiAssets.canRefresh();
      this.applyFilter();
    } catch (error) {
      this.statusMessage =
        error instanceof Error ? error.message : "Unable to refresh definitions. Load your ai_assets folder first.";
    }
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.definitions.filter((definition) => {
      const matchesType = this.matchesActiveType(definition);
      if (!matchesType) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        definition.title,
        definition.description,
        definition.provider,
        definition.type,
        definition.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  toggleFilterMenu(): void {
    this.filterMenuOpen = !this.filterMenuOpen;
  }

  selectFilter(type: DefinitionType | "All" | "Prompt" | "Agent" | "User" | "Org"): void {
    this.activeType = type;
    this.filterMenuOpen = false;
    this.applyFilter();
  }

  clearFilter(): void {
    this.activeType = "All";
    this.applyFilter();
  }

  get activeFilterLabel(): string {
    const match = this.filterOptions.find((option) => option.value === this.activeType);
    return match?.label ?? "All";
  }

  async toggleSaved(definition: DefinitionCard): Promise<void> {
    this.statusMessage = "";
    console.info("[dcc-hub] toggleSaved start", {
      id: definition.id,
      title: definition.title,
      sourcePath: definition.sourcePath,
      type: definition.type
    });
    if (this.savedIds.has(definition.id)) {
      try {
        console.info("[dcc-hub] removing definition from Continue folder");
        await this.continueFolder.removeDefinition(definition);
        this.savedIds.delete(definition.id);
        this.storage.setSavedIds(Array.from(this.savedIds));
        this.statusMessage = `Removed ${definition.title} from your Continue team folder.`;
        console.info("[dcc-hub] removal complete");
      } catch (error) {
        console.error("[dcc-hub] removal failed", error);
        this.statusMessage =
          error instanceof Error ? error.message : "Unable to remove definition from your Continue folder.";
      }
      return;
    }

    try {
      console.info("[dcc-hub] saving definition to Continue folder");
      await this.continueFolder.saveDefinition(definition);
      this.savedIds.add(definition.id);
      this.storage.setSavedIds(Array.from(this.savedIds));
      this.statusMessage = `Saved ${definition.title} to your Continue team folder.`;
      console.info("[dcc-hub] save complete");
    } catch (error) {
      console.error("[dcc-hub] save failed", error);
      this.statusMessage = error instanceof Error ? error.message : "Unable to save definition to your Continue folder.";
    }
  }

  isSaved(definition: DefinitionCard): boolean {
    return this.savedIds.has(definition.id);
  }

  private matchesActiveType(definition: DefinitionCard): boolean {
    if (this.activeType === "All") {
      return true;
    }
    return definition.type === this.activeType;
  }

  private loadSettings(): void {
    const settings = this.aiAssets.loadSettings();
    this.lastLoadedAt = settings.lastLoadedAt ?? "";
    this.lastSourceLabel = settings.lastSourceLabel ?? "";
  }

  private async loadSampleIfEmpty(): Promise<void> {
    if (this.definitions.length) {
      return;
    }
    const response = await fetch("assets/sample-definitions.json");
    if (response.ok) {
      this.definitions = (await response.json()) as DefinitionCard[];
      this.applyFilter();
      this.statusMessage = "Showing sample data. Load your ai_assets folder to see live definitions.";
    }
  }
}
