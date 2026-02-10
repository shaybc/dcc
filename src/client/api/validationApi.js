import { API_ENDPOINTS } from "../config/constants.js";
import { apiRequest } from "./apiClient.js";

export const validateDefinition = (content, options = {}) => apiRequest(API_ENDPOINTS.validate, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content, ...options })
}, "Unable to validate definition.");
