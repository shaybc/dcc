import { API_ENDPOINTS } from "../config/constants.js";
import { apiRequest } from "./apiClient.js";

export const fetchDefinitions = () => apiRequest(API_ENDPOINTS.definitions, {}, "Unable to fetch definitions.");

export const fetchDefinitionContent = (id, version = "") => apiRequest(
  API_ENDPOINTS.definitionContent(id, version),
  {},
  "Unable to load definition content."
);

export const saveDefinition = (id) => apiRequest(API_ENDPOINTS.definitionSave(id), { method: "POST" }, "Unable to save definition.");

export const publishDefinition = (id) => apiRequest(API_ENDPOINTS.definitionPublish(id), { method: "POST" }, "Unable to publish definition.");

export const deleteDefinition = (id) => apiRequest(API_ENDPOINTS.definitionDelete(id), { method: "DELETE" }, "Unable to delete definition.");

export const duplicateDefinition = (id, data) => apiRequest(API_ENDPOINTS.definitionDuplicate(id), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
}, "Unable to duplicate definition.");

export const pushDefinitionUpstream = (id, commitMessage) => apiRequest(API_ENDPOINTS.definitionPush(id), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ commitMessage })
}, "Unable to push definition upstream.");

export const fetchVersionHistory = (id) => apiRequest(API_ENDPOINTS.definitionVersions(id), {}, "Unable to load version history.");
