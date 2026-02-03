import { Injectable } from "@angular/core";
import { AiAssetsService } from "./ai-assets.service";
import { DefinitionCard, DefinitionType } from "./models";

@Injectable({ providedIn: "root" })
export class ContinueFolderService {
  constructor(private aiAssets: AiAssetsService) {}

  async saveDefinition(definition: DefinitionCard): Promise<void> {
    console.info("[dcc-hub] ContinueFolderService.saveDefinition", {
      id: definition.id,
      sourcePath: definition.sourcePath,
      type: definition.type
    });
    await this.saveViaApi(definition);
  }

  async removeDefinition(definition: DefinitionCard): Promise<void> {
    console.info("[dcc-hub] ContinueFolderService.removeDefinition", {
      id: definition.id,
      sourcePath: definition.sourcePath,
      type: definition.type
    });
    await this.removeViaApi(definition);
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

  private async saveViaApi(definition: DefinitionCard): Promise<void> {
    const content = await this.readDefinitionSource(definition);
    const typeFolder = this.mapTypeFolder(definition);
    const fileName = this.getFileName(definition);
    console.info("[dcc-hub] saving definition via API", { typeFolder, fileName });
    const response = await fetch(`${this.apiBase}/api/continue/definitions`, {
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
    const response = await fetch(`${this.apiBase}/api/continue/definitions`, {
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

  private get apiBase(): string {
    const { hostname, port, protocol } = window.location;
    if (hostname === "localhost" && port === "4200") {
      return `${protocol}//${hostname}:7331`;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
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
