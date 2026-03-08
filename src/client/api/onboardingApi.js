import { apiRequest } from "./apiClient.js";

const ONBOARDING_STATUS_ENDPOINT = "/api/onboarding-status";

export function fetchOnboardingStatus() {
  return apiRequest(ONBOARDING_STATUS_ENDPOINT, {}, "Unable to load onboarding status.");
}

export function markOnboardingAsSeen() {
  return apiRequest(
    ONBOARDING_STATUS_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seen: true }),
    },
    "Unable to save onboarding status."
  );
}
