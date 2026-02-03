import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AiAssetsService } from "./ai-assets.service";
import { DefinitionCard, DefinitionType } from "./models";
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
  activeType: DefinitionType | "All" = "All";
  definitions: DefinitionCard[] = [];
  filtered: DefinitionCard[] = [];
  types: Array<DefinitionType | "All"> = ["All", "Model", "Rule", "MCP Server", "Config", "Unknown"];
  statusMessage = "";
  lastLoadedAt = "";
  lastSourceLabel = "";
  savedIds = new Set<string>();

  constructor(private aiAssets: AiAssetsService, private storage: StorageService) {}

  ngOnInit(): void {
    this.savedIds = new Set(this.storage.getSavedIds());
    const cached = this.aiAssets.loadCachedDefinitions();
    if (cached.length) {
      this.definitions = cached;
    }
    this.applyFilter();
    this.loadSampleIfEmpty();
    this.loadSettings();
  }

  async pickFolder(): Promise<void> {
    this.statusMessage = "";
    try {
      this.definitions = await this.aiAssets.selectAndLoadDefinitions();
      this.statusMessage = `Loaded ${this.definitions.length} definitions from ai_assets.`;
      this.loadSettings();
      this.applyFilter();
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : "Unable to load definitions.";
    }
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.definitions.filter((definition) => {
      const matchesType = this.activeType === "All" || definition.type === this.activeType;
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

  toggleSaved(definition: DefinitionCard): void {
    if (this.savedIds.has(definition.id)) {
      this.savedIds.delete(definition.id);
    } else {
      this.savedIds.add(definition.id);
    }
    this.storage.setSavedIds(Array.from(this.savedIds));
  }

  isSaved(definition: DefinitionCard): boolean {
    return this.savedIds.has(definition.id);
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
