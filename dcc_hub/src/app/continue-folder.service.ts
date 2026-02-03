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
    const typeFolder = this.mapTypeFolder(definition.type);
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
    if (!("showDirectoryPicker" in window)) {
      console.error("[dcc-hub] showDirectoryPicker unsupported");
      throw new Error("Your browser does not support selecting the Continue folder.");
    }
    console.info("[dcc-hub] requesting Continue folder picker");
    const handle = await (window as Window & { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> })
      .showDirectoryPicker();
    console.info("[dcc-hub] Continue folder picked", { name: handle.name });
    if (handle.name !== ".continue") {
      throw new Error("Select your %USERPROFILE%\\.continue folder to save definitions.");
    }
    this.continueHandle = handle;
    return handle;
  }

  private async getOrCreateDirectory(
    parent: FileSystemDirectoryHandle,
    name: string
  ): Promise<FileSystemDirectoryHandle> {
    return parent.getDirectoryHandle(name, { create: true });
  }

  private mapTypeFolder(type: DefinitionType): string {
    switch (type) {
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
        return type.toLowerCase().replace(/\s+/g, "-") || "unknown";
    }
  }

  private getFileName(definition: DefinitionCard): string {
    const segments = definition.sourcePath.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? `${definition.id}.md`;
  }
}
