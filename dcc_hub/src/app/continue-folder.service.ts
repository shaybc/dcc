import { Injectable } from "@angular/core";
import { AiAssetsService } from "./ai-assets.service";
import { DefinitionCard, DefinitionType } from "./models";

@Injectable({ providedIn: "root" })
export class ContinueFolderService {
  private continueHandle?: FileSystemDirectoryHandle;

  constructor(private aiAssets: AiAssetsService) {}

  async saveDefinition(definition: DefinitionCard): Promise<void> {
    console.info("[dcc-hub] ContinueFolderService.saveDefinition", {
      id: definition.id,
      sourcePath: definition.sourcePath,
      type: definition.type
    });
    if (!this.canUseNativeAccess()) {
      await this.saveViaApi(definition);
      return;
    }
    const destination = await this.getDestinationHandles(definition);
    if (!destination) {
      throw new Error("Unable to resolve the Continue folder destination.");
    }
    const content = await this.readDefinitionSource(definition);
    console.info("[dcc-hub] writing definition", { fileName: destination.fileName });
    const writable = await destination.fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async removeDefinition(definition: DefinitionCard): Promise<void> {
    console.info("[dcc-hub] ContinueFolderService.removeDefinition", {
      id: definition.id,
      sourcePath: definition.sourcePath,
      type: definition.type
    });
    if (!this.canUseNativeAccess()) {
      await this.removeViaApi(definition);
      return;
    }
    const destination = await this.getDestinationHandles(definition, false);
    if (!destination) {
      console.warn("[dcc-hub] no Continue destination found for removal");
      return;
    }
    await destination.directoryHandle.removeEntry(destination.fileName);
    console.info("[dcc-hub] removed definition", { fileName: destination.fileName });
  }

  private async getDestinationHandles(
    definition: DefinitionCard,
    create = true
  ): Promise<{ directoryHandle: FileSystemDirectoryHandle; fileHandle: FileSystemFileHandle; fileName: string } | null> {
    const continueHandle = await this.ensureContinueHandle();
    const teamHandle = await this.getOrCreateDirectory(continueHandle, "team");
    const typeFolder = this.mapTypeFolder(definition);
    const typeHandle = await this.getOrCreateDirectory(teamHandle, typeFolder);
    const fileName = this.getFileName(definition);
    if (!create) {
      try {
        const fileHandle = await typeHandle.getFileHandle(fileName);
        return { directoryHandle: typeHandle, fileHandle, fileName };
      } catch {
        return null;
      }
    }
    const fileHandle = await typeHandle.getFileHandle(fileName, { create: true });
    return { directoryHandle: typeHandle, fileHandle, fileName };
  }

  private async readDefinitionSource(definition: DefinitionCard): Promise<string> {
    if (definition.rawContent) {
      console.info("[dcc-hub] using cached definition content", { id: definition.id });
      return definition.rawContent;
    }
    console.info("[dcc-hub] cached content missing; refreshing definitions", { id: definition.id });
    const refreshed = await this.aiAssets.refreshDefinitions();
    const match = refreshed.find((item) => item.id === definition.id);
    if (match?.rawContent) {
      console.info("[dcc-hub] using refreshed definition content", { id: definition.id });
      return match.rawContent;
    }
    const source = await this.aiAssets.getDefinitionFile(definition);
    if (!source) {
      throw new Error("Unable to locate the source file. Load your ai_assets folder and try again.");
    }
    console.info("[dcc-hub] reading definition source", { name: source.name });
    return source.text();
  }

  private async ensureContinueHandle(): Promise<FileSystemDirectoryHandle> {
    if (this.continueHandle) {
      console.info("[dcc-hub] using cached Continue handle");
      return this.continueHandle;
    }
    let handle: FileSystemDirectoryHandle | undefined;
    if ("showDirectoryPicker" in window) {
      console.info("[dcc-hub] requesting Continue folder picker");
      handle = await (window as Window & { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> })
        .showDirectoryPicker();
    } else if ("chooseFileSystemEntries" in window) {
      console.info("[dcc-hub] requesting Continue folder picker via legacy API");
      handle = await (
        window as Window & {
          chooseFileSystemEntries(options: { type: "openDirectory" }): Promise<FileSystemDirectoryHandle>;
        }
      ).chooseFileSystemEntries({ type: "openDirectory" });
    } else {
      console.error("[dcc-hub] showDirectoryPicker unsupported");
      throw new Error(
        "Your browser does not support selecting the Continue folder. Use a Chromium-based browser like Chrome or Edge."
      );
    }
    console.info("[dcc-hub] Continue folder picked", { name: handle.name });
    if (handle.name !== ".continue") {
      throw new Error("Select your %USERPROFILE%\\.continue folder to save definitions.");
    }
    this.continueHandle = handle;
    return handle;
  }

  private canUseNativeAccess(): boolean {
    return "showDirectoryPicker" in window || "chooseFileSystemEntries" in window;
  }

  private async saveViaApi(definition: DefinitionCard): Promise<void> {
    const content = await this.readDefinitionSource(definition);
    const typeFolder = this.mapTypeFolder(definition);
    const fileName = this.getFileName(definition);
    console.info("[dcc-hub] saving definition via API", { typeFolder, fileName });
    const response = await fetch("/api/continue/definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        typeFolder,
        fileName,
        content
      })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to save definition via server API.");
    }
  }

  private async removeViaApi(definition: DefinitionCard): Promise<void> {
    const typeFolder = this.mapTypeFolder(definition);
    const fileName = this.getFileName(definition);
    console.info("[dcc-hub] removing definition via API", { typeFolder, fileName });
    const response = await fetch("/api/continue/definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        typeFolder,
        fileName
      })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to remove definition via server API.");
    }
  }

  private async getOrCreateDirectory(
    parent: FileSystemDirectoryHandle,
    name: string
  ): Promise<FileSystemDirectoryHandle> {
    return parent.getDirectoryHandle(name, { create: true });
  }

  private mapTypeFolder(definition: DefinitionCard): string {
    const resolvedType = definition.type === "Unknown" ? this.inferTypeFromPath(definition.sourcePath) : definition.type;
    switch (resolvedType) {
      case "Model":
        return "model";
      case "Rule":
        return "rule";
      case "Prompt":
        return "prompt";
      case "Agent":
        return "agent";
      case "User":
        return "user";
      case "Org":
        return "org";
      case "MCP Server":
        return "mcp";
      case "Config":
        return "config";
      default:
        return resolvedType.toLowerCase().replace(/\s+/g, "-") || "unknown";
    }
  }

  private getFileName(definition: DefinitionCard): string {
    const segments = definition.sourcePath.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? `${definition.id}.md`;
  }

  private inferTypeFromPath(sourcePath: string): DefinitionType {
    const lower = sourcePath.toLowerCase();
    if (lower.includes("prompts")) {
      return "Prompt";
    }
    if (lower.includes("rules")) {
      return "Rule";
    }
    if (lower.includes("models")) {
      return "Model";
    }
    if (lower.includes("agents")) {
      return "Agent";
    }
    if (lower.includes("users")) {
      return "User";
    }
    if (lower.includes("orgs")) {
      return "Org";
    }
    if (lower.includes("mcp")) {
      return "MCP Server";
    }
    if (lower.includes("config")) {
      return "Config";
    }
    return "Unknown";
  }
}
