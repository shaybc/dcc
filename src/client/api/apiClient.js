export function parseErrorMessage(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;
  if (typeof payload === "string") return payload;
  if (payload.error) return String(payload.error);
  return fallbackMessage;
}

export async function apiRequest(url, options = {}, fallbackMessage = "Request failed.") {
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, fallbackMessage));
  }

  return payload;
}
