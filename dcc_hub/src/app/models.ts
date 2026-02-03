export type DefinitionType =
  | "Model"
  | "Rule"
  | "MCP Server"
  | "Config"
  | "Prompt"
  | "Agent"
  | "User"
  | "Org"
  | "Unknown";

export interface DefinitionCard {
  id: string;
  title: string;
  description: string;
  provider: string;
  type: DefinitionType;
  tags: string[];
  sourcePath: string;
}

export interface AiAssetsSettings {
  lastLoadedAt?: string;
  lastSourceLabel?: string;
}
