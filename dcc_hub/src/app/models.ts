export type DefinitionType = "Model" | "Rule" | "MCP Server" | "Config" | "Context" | "Unknown";

export interface DefinitionCard {
  id: string;
  title: string;
  description: string;
  provider: string;
  type: DefinitionType;
  tags: string[];
  sourcePath: string;
  fileName?: string;
  rawContent?: string;
}

export interface AiAssetsSettings {
  lastLoadedAt?: string;
  lastSourceLabel?: string;
}
