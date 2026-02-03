import { Injectable } from "@angular/core";
import { AiAssetsSettings, DefinitionCard, DefinitionType } from "./models";
import { StorageService } from "./storage.service";

const TYPE_MAP: Array<{ match: RegExp; type: DefinitionType }> = [
  { match: /model/i, type: "Model" },
  { match: /rule/i, type: "Rule" },
  { match: /prompt/i, type: "Prompt" },
  { match: /agent/i, type: "Agent" },
  { match: /user/i, type: "User" },
  { match: /org/i, type: "Org" },
  { match: /mcp/i, type: "MCP Server" },
  { match: /config/i, type: "Config" }
];

@Injectable({ providedIn: "root" })
export class AiAssetsService {
  private directoryHandle?: FileSystemDirectoryHandle;
  private lastSelectedFiles?: File[];
  private lastSourceLabel?: string;

  constructor(private storage: StorageService) {}

  loadCachedDefinitions(): DefinitionCard[] {
    return this.storage.getDefinitions();
  }

  loadSettings(): AiAssetsSettings {
    return this.storage.getSettings();
  }

  canRefresh(): boolean {
    if (this.directoryHandle || this.lastSelectedFiles) {
      return true;
    }
    const settings = this.storage.getSettings();
    if (settings.lastSourceLabel) {
      return true;
    }
    return this.storage.getDefinitions().length > 0;
  }

  async selectAndLoadDefinitions(): Promise<DefinitionCard[]> {
    if ("showDirectoryPicker" in window) {
      const directoryHandle = await (window as Window & { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> })
        .showDirectoryPicker();
      this.directoryHandle = directoryHandle;
      this.lastSelectedFiles = undefined;
      this.lastSourceLabel = undefined;
      const definitions = await this.scanDirectory(directoryHandle, []);
      const unique = this.deduplicate(definitions);
      this.storage.setDefinitions(unique);
      this.storage.setSettings({
        lastLoadedAt: new Date().toISOString(),
        lastSourceLabel: directoryHandle.name
      });
      return unique;
    }

    this.directoryHandle = undefined;
    const { definitions, sourceLabel, files } = await this.selectDirectoryViaInput();
    this.lastSelectedFiles = files;
    this.lastSourceLabel = sourceLabel;
    const unique = this.deduplicate(definitions);
    this.storage.setDefinitions(unique);
    this.storage.setSettings({
      lastLoadedAt: new Date().toISOString(),
      lastSourceLabel: sourceLabel
    });
    return unique;
  }

  async refreshDefinitions(): Promise<DefinitionCard[]> {
    if (!this.directoryHandle) {
      if (this.lastSelectedFiles && this.lastSourceLabel) {
        const definitions = await this.parseFiles(this.lastSelectedFiles);
        const unique = this.deduplicate(definitions);
        this.storage.setDefinitions(unique);
        this.storage.setSettings({
          lastLoadedAt: new Date().toISOString(),
          lastSourceLabel: this.lastSourceLabel
        });
        return unique;
      }
      return this.selectAndLoadDefinitions();
    }
    const definitions = await this.scanDirectory(this.directoryHandle, []);
    const unique = this.deduplicate(definitions);
    this.storage.setDefinitions(unique);
    this.storage.setSettings({
      lastLoadedAt: new Date().toISOString(),
      lastSourceLabel: this.directoryHandle.name
    });
    return unique;
  }

  async getDefinitionFile(definition: DefinitionCard): Promise<File | null> {
    const sourcePath = definition.sourcePath;
    if (this.directoryHandle) {
      console.info("[dcc-hub] getDefinitionFile from directory handle", { sourcePath });
      return this.getFileFromDirectoryHandle(this.directoryHandle, sourcePath);
    }
    if (this.lastSelectedFiles) {
      console.info("[dcc-hub] getDefinitionFile from selected files", { sourcePath });
      const match = this.lastSelectedFiles.find((file) => file.webkitRelativePath === sourcePath);
      if (match) {
        return match;
      }
      const fallback = this.lastSelectedFiles.find((file) => file.webkitRelativePath.endsWith(`/${sourcePath}`));
      return fallback ?? null;
    }
    return null;
  }

  private async selectDirectoryViaInput(): Promise<{
    definitions: DefinitionCard[];
    sourceLabel: string;
    files: File[];
  }> {
    const input = document.createElement("input") as HTMLInputElement & { webkitdirectory?: boolean };
    input.type = "file";
    input.multiple = true;
    input.accept = ".json,.md";
    input.webkitdirectory = true;

    const files = await new Promise<FileList>((resolve, reject) => {
      input.addEventListener("change", () => {
        if (!input.files || input.files.length === 0) {
          reject(new Error("No folder selected."));
          return;
        }
        resolve(input.files);
      });
      input.addEventListener("cancel", () => reject(new Error("Folder selection was canceled.")));
      input.click();
    });

    const parsed = await this.parseFiles(Array.from(files));
    const sourceLabel = this.lastSourceLabel ?? "Local folder";
    return { definitions: parsed, sourceLabel, files: Array.from(files) };
  }

  private async parseFiles(files: File[]): Promise<DefinitionCard[]> {
    const parsed: DefinitionCard[] = [];
    let sourceLabel = "Local folder";
    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith(".json") && !lowerName.endsWith(".md")) {
        continue;
      }
      const relativePath = file.webkitRelativePath || file.name;
      const pathSegments = relativePath.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        sourceLabel = pathSegments[0];
      }
      const content = await file.text();
      const definition = this.parseDefinition(content, pathSegments);
      if (definition) {
        parsed.push(definition);
      }
    }

    this.lastSourceLabel = sourceLabel;
    return parsed;
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
        const directoryEntry = entry as FileSystemDirectoryHandle;
        const nested = await this.scanDirectory(directoryEntry, [...pathSegments, name]);
        results.push(...nested);
        continue;
      }

      if (entry.kind === "file" && this.isSupportedDefinitionFile(name)) {
        const fileEntry = entry as FileSystemFileHandle;
        const file = await fileEntry.getFile();
        const content = await file.text();
        const definition = this.parseDefinition(content, [...pathSegments, name]);
        if (definition) {
          results.push(definition);
        }
      }
    }

    return results;
  }

  private async getFileFromDirectoryHandle(
    handle: FileSystemDirectoryHandle,
    sourcePath: string
  ): Promise<File | null> {
    try {
      const pathSegments = sourcePath.split("/").filter(Boolean);
      if (pathSegments.length === 0) {
        return null;
      }
      let currentHandle = handle;
      const fileName = pathSegments[pathSegments.length - 1];
      for (const segment of pathSegments.slice(0, -1)) {
        currentHandle = await currentHandle.getDirectoryHandle(segment);
      }
      const fileHandle = await currentHandle.getFileHandle(fileName);
      return fileHandle.getFile();
    } catch {
      return null;
    }
  }

  private parseDefinition(content: string, pathSegments: string[]): DefinitionCard | null {
    const inferredType = this.inferType(pathSegments);
    try {
      const data = JSON.parse(content) as Record<string, unknown>;
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
        sourcePath: pathSegments.join("/"),
        rawContent: content
      };
    } catch {
      return this.parseMarkdownDefinition(content, pathSegments, inferredType);
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
    return last.replace(/\.(json|md)$/i, "").replace(/[-_]/g, " ");
  }

  private isSupportedDefinitionFile(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.endsWith(".json") || lower.endsWith(".md");
  }

  private parseMarkdownDefinition(
    content: string,
    pathSegments: string[],
    inferredType: DefinitionType
  ): DefinitionCard | null {
    const lines = content.split(/\r?\n/);
    const heading = lines.find((line) => line.trim().startsWith("#"));
    const title = heading?.replace(/^#+\s*/, "").trim() || this.fallbackTitle(pathSegments);
    const descriptionLine = lines.find((line) => line.trim() && !line.trim().startsWith("#"));
    const description = descriptionLine?.trim() || "No description available for this definition.";
    return {
      id: `${pathSegments.join("/")}`,
      title,
      description,
      provider: "Continue",
      type: inferredType,
      tags: [],
      sourcePath: pathSegments.join("/"),
      rawContent: content
    };
  }
}
