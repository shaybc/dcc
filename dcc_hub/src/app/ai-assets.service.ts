import { Injectable } from "@angular/core";
import { AiAssetsSettings, DefinitionCard, DefinitionType } from "./models";
import { StorageService } from "./storage.service";

const TYPE_MAP: Array<{ match: RegExp; type: DefinitionType }> = [
  { match: /model/i, type: "Model" },
  { match: /rule/i, type: "Rule" },
  { match: /mcp/i, type: "MCP Server" },
  { match: /config/i, type: "Config" }
];

@Injectable({ providedIn: "root" })
export class AiAssetsService {
  constructor(private storage: StorageService) {}

  loadCachedDefinitions(): DefinitionCard[] {
    return this.storage.getDefinitions();
  }

  loadSettings(): AiAssetsSettings {
    return this.storage.getSettings();
  }

  async selectAndLoadDefinitions(): Promise<DefinitionCard[]> {
    if (!("showDirectoryPicker" in window)) {
      throw new Error("Directory picker is not supported in this browser.");
    }

    const directoryHandle = await (window as Window & { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> })
      .showDirectoryPicker();
    const definitions = await this.scanDirectory(directoryHandle, []);
    const unique = this.deduplicate(definitions);
    this.storage.setDefinitions(unique);
    this.storage.setSettings({
      lastLoadedAt: new Date().toISOString(),
      lastSourceLabel: directoryHandle.name
    });
    return unique;
  }

  private deduplicate(definitions: DefinitionCard[]): DefinitionCard[] {
    const seen = new Map<string, DefinitionCard>();
    for (const definition of definitions) {
      if (!seen.has(definition.id)) {
        seen.set(definition.id, definition);
      }
    }
    return Array.from(seen.values());
  }

  private async scanDirectory(
    handle: FileSystemDirectoryHandle,
    pathSegments: string[]
  ): Promise<DefinitionCard[]> {
    const results: DefinitionCard[] = [];
    const entries = (handle as FileSystemDirectoryHandle & { entries(): AsyncIterable<[string, FileSystemHandle]> })
      .entries();
    // eslint-disable-next-line no-restricted-syntax
    for await (const [name, entry] of entries) {
      if (entry.kind === "directory") {
        const nested = await this.scanDirectory(entry, [...pathSegments, name]);
        results.push(...nested);
        continue;
      }

      if (entry.kind === "file" && name.toLowerCase().endsWith(".json")) {
        const file = await entry.getFile();
        const content = await file.text();
        const definition = this.parseDefinition(content, [...pathSegments, name]);
        if (definition) {
          results.push(definition);
        }
      }
    }

    return results;
  }

  private parseDefinition(content: string, pathSegments: string[]): DefinitionCard | null {
    try {
      const data = JSON.parse(content) as Record<string, unknown>;
      const inferredType = this.inferType(pathSegments);
      const title = this.pickString(data, ["title", "name", "displayName"]) ?? this.fallbackTitle(pathSegments);
      const description =
        this.pickString(data, ["description", "summary", "details"]) ??
        "No description available for this definition.";
      const provider =
        this.pickString(data, ["provider", "publisher", "company", "author", "owner"]) ?? "Continue";
      const tags = this.pickStringArray(data, ["tags", "keywords"]) ?? [];

      return {
        id: `${pathSegments.join("/")}`,
        title,
        description,
        provider,
        type: (data["type"] as DefinitionType) ?? inferredType,
        tags,
        sourcePath: pathSegments.join("/")
      };
    } catch {
      return null;
    }
  }

  private inferType(pathSegments: string[]): DefinitionType {
    const haystack = pathSegments.join("/");
    const matched = TYPE_MAP.find((entry) => entry.match.test(haystack));
    return matched?.type ?? "Unknown";
  }

  private pickString(data: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private pickStringArray(data: Record<string, unknown>, keys: string[]): string[] | undefined {
    for (const key of keys) {
      const value = data[key];
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string") as string[];
      }
    }
    return undefined;
  }

  private fallbackTitle(pathSegments: string[]): string {
    const last = pathSegments[pathSegments.length - 1] ?? "Definition";
    return last.replace(/\.json$/i, "").replace(/[-_]/g, " ");
  }
}
