export const FILTER_TYPES = Object.freeze([
  "models",
  "mcp servers",
  "rules",
  "prompts",
  "agents",
  "context",
  "workflows",
  "docs",
  "configs",
  "unknown"
]);

export const FILTER_TYPE_SET = new Set(FILTER_TYPES);
export const MAX_CARD_TAG_PILLS = 3;
export const VALIDATION_AUTO_RUN_DELAY = 1000;

export const API_ENDPOINTS = Object.freeze({
  definitions: "/api/definitions",
  definitionContent: (id, version = "") => `/api/definitions/${id}/content${version ? `?version=${encodeURIComponent(version)}` : ""}`,
  definitionSave: (id) => `/api/definitions/${id}/save`,
  definitionPublish: (id) => `/api/definitions/${id}/publish`,
  definitionDelete: (id) => `/api/definitions/${id}`,
  definitionDuplicate: (id) => `/api/definitions/${id}/duplicate`,
  definitionPush: (id) => `/api/definitions/${id}/upstream/push`,
  definitionVersions: (id) => `/api/definitions/${id}/versions`,
  validate: "/api/definitions/validate",
  devProjects: "/api/dev-projects",
  devProjectCurrent: "/api/dev-projects/current"
});
