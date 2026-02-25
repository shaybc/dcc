export const RECOMMENDATIONS_VISIBILITY_STORAGE_KEY = "dcc.recommendations.visible";
export const INTENT_RECOMMENDATIONS_STORAGE_KEY = "dcc.recommendations.intent";
export const HIDE_INSTALLED_DEFINITIONS_STORAGE_KEY = "dcc.hub.hideInstalledDefinitions";
export const ONLY_LOCAL_DEFINITIONS_STORAGE_KEY = "dcc.hub.onlyLocalDefinitions";

export const FILTER_TYPES = ["models", "mcp servers", "rules", "prompts", "agents", "context", "workflows", "docs", "configs", "unknown"];
export const SPECIAL_FILTERS = [];
export const GENERATED_DEFINITION_STORAGE_KEY = "dcc.generated.definition";
export const GENERATABLE_DEFINITION_TYPES = ["prompt", "mcpServer", "agent", "rule", "model", "workflow", "context", "doc", "config"];
export const COMMON_DEFINITION_HELP_PAGE_PATH = "/help/user-guide/pages/usage/definition-details-actions-test-schema-common.md";
export const DEFINITION_HELP_PAGE_BY_TYPE = {
  prompt: "/help/user-guide/pages/usage/definition-details-actions-test-schema-prompt.md",
  mcpServer: "/help/user-guide/pages/usage/definition-details-actions-test-schema-mcpserver.md",
  agent: "/help/user-guide/pages/usage/definition-details-actions-test-schema-agent.md",
  rule: "/help/user-guide/pages/usage/definition-details-actions-test-schema-rule.md",
  model: "/help/user-guide/pages/usage/definition-details-actions-test-schema-model.md",
  workflow: "/help/user-guide/pages/usage/definition-details-actions-test-schema-workflow.md",
  context: "/help/user-guide/pages/usage/definition-details-actions-test-schema-context.md",
  doc: "/help/user-guide/pages/usage/definition-details-actions-test-schema-docs.md",
  config: "/help/user-guide/pages/usage/definition-details-actions-test-schema-config.md"
};
export const DEFINITION_TYPE_ALIASES = {
  prompt: "prompt",
  prompts: "prompt",
  mcpserver: "mcpServer",
  mcpservers: "mcpServer",
  agent: "agent",
  agents: "agent",
  rule: "rule",
  rules: "rule",
  model: "model",
  models: "model",
  workflow: "workflow",
  workflows: "workflow",
  context: "context",
  contexts: "context",
  doc: "doc",
  docs: "doc",
  config: "config",
  configs: "config"
};
export const FILTER_TYPE_SET = new Set(FILTER_TYPES);

export const INSTALL_DESTINATION_OPTIONS = [
  { key: "continue", label: "Continue" },
  { key: "copilot", label: "GitHub Copilot" },
  { key: "gemini", label: "Gemini CLI" }
];

export const DESTINATION_COMPATIBILITY = {
  continue: new Set(["rules", "prompts", "workflows", "models", "agents", "mcpservers", "context", "docs", "configs"]),
  copilot: new Set(["rules", "prompts"]),
  gemini: new Set(["rules", "prompts"])
};

export const MAX_CARD_TAG_PILLS = 3;
export const CARDS_PER_PAGE = 25;
export const RECENT_AGENT_RUNS_STORAGE_KEY = "dcc.agent.builder.recent-runs";
export const RECENT_AGENT_RUN_PACKS_ENDPOINT = "/api/agent-run-packs";
export const AGENT_RUNS_ENDPOINT = "/api/agent-runs";
export const FAVORITE_DEFINITION_IDS_STORAGE_KEY = "dcc.favorite.definition.ids";
