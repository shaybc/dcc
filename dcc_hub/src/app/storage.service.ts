import { Injectable } from "@angular/core";
import { AiAssetsSettings, DefinitionCard } from "./models";

const DEFINITIONS_KEY = "dcc-hub.cachedDefinitions";
const SETTINGS_KEY = "dcc-hub.settings";
const SAVED_KEY = "dcc-hub.saved";

@Injectable({ providedIn: "root" })
export class StorageService {
  getDefinitions(): DefinitionCard[] {
    const raw = localStorage.getItem(DEFINITIONS_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as DefinitionCard[];
    } catch {
      return [];
    }
  }

  setDefinitions(definitions: DefinitionCard[]): void {
    localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(definitions));
  }

  getSettings(): AiAssetsSettings {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as AiAssetsSettings;
    } catch {
      return {};
    }
  }

  setSettings(settings: AiAssetsSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  getSavedIds(): string[] {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  setSavedIds(ids: string[]): void {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  }
}
