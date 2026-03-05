import { apiRequest } from "./apiClient.js";

export function fetchAboutInfo() {
  return apiRequest("/api/app/about", {}, "Unable to load About information.");
}

export function updateDcc() {
  return apiRequest("/api/app/update", { method: "POST" }, "Unable to update DCC.");
}
