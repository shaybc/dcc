import { API_ENDPOINTS } from "../config/constants.js";
import { apiRequest } from "./apiClient.js";

export const fetchDevProjects = () => apiRequest(API_ENDPOINTS.devProjects, {}, "Unable to load development projects.");

export const fetchCurrentDevProject = () => apiRequest(API_ENDPOINTS.devProjectCurrent, {}, "Unable to load current development project.");

export const setCurrentDevProject = (path) => apiRequest(API_ENDPOINTS.devProjectCurrent, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path })
}, "Unable to set development project.");
