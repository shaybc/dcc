import { DESTINATION_COMPATIBILITY, INSTALL_DESTINATION_OPTIONS } from "./constants.js";

function normalizeFilterType(type) {
  return String(type || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeDestinationCompatibilityType(type) {
  const normalizedType = normalizeFilterType(type);
  if (normalizedType === "mcpservers") return "mcpservers";
  return normalizedType;
}

export function getSupportedDestinationOptions(definition = {}) {
  const normalizedType = normalizeDestinationCompatibilityType(definition?.type);
  if (!normalizedType || normalizedType === "unknown") return [];
  return INSTALL_DESTINATION_OPTIONS.filter((option) => DESTINATION_COMPATIBILITY[option.key]?.has(normalizedType));
}

export function getDestinationLogoPath(destinationKey) {
  const normalizedKey = String(destinationKey || "").trim().toLowerCase();
  const currentTheme = String(document.documentElement.getAttribute("data-theme") || "dark").trim().toLowerCase();
  const logoTone = currentTheme === "light" ? "black" : "white";
  if (!["continue", "copilot", "gemini"].includes(normalizedKey)) return "";
  return `/img/${normalizedKey}_small_${logoTone}_logo.png`;
}

export function getDestinationLabel(destination) {
  const normalizedDestination = String(destination || "continue").trim().toLowerCase();
  if (normalizedDestination === "copilot") return "GitHub Copilot";
  if (normalizedDestination === "gemini") return "Gemini CLI";
  return "Continue";
}

export function getInstalledDestinationSet(definition = {}) {
  const installed = Array.isArray(definition?.installedDestinations) ? definition.installedDestinations : [];
  return new Set(installed.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
}

export function formatSkippedReason(skippedItem) {
  const reason = String(skippedItem?.reason || "not_exported").trim().toLowerCase();
  const message = String(skippedItem?.message || "").trim();
  const reasonLabels = {
    unknown_destination: "unknown destination",
    unsupported_type_for_destination: "unsupported definition type",
    conversion_failed: "conversion failed",
    no_write_plan: "no output generated",
    unsupported_destination: "unsupported destination",
    unknown_operation: "unsupported write operation"
  };

  const label = reasonLabels[reason] || reason.replace(/_/g, " ");
  return message ? `${label} (${message})` : label;
}

export function buildInstallExportSummary(result, destination) {
  const normalizedDestination = String(destination || "continue").trim().toLowerCase();
  const destinationLabel = normalizedDestination === "continue"
    ? "current project"
    : normalizedDestination === "copilot"
      ? "GitHub Copilot"
      : normalizedDestination === "gemini"
        ? "Gemini CLI"
        : normalizedDestination;

  const writtenFiles = Array.isArray(result?.writtenFiles) ? result.writtenFiles : [];
  const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
  const exportedCount = Number.isFinite(Number(result?.exportedCount))
    ? Number(result.exportedCount)
    : (result?.exported ? 1 : 0);

  const lines = [
    normalizedDestination === "continue"
      ? "Definition installed in current project."
      : `Definition exported to ${destinationLabel}.`,
    `Exported: ${exportedCount}`,
    `Files written: ${writtenFiles.length}`,
    `Skipped definitions: ${skipped.length}`
  ];

  if (skipped.length > 0) {
    lines.push("Skipped details:");
    skipped.forEach((entry, index) => {
      const label = entry?.name || entry?.key || entry?.definitionKey || `Definition ${index + 1}`;
      lines.push(`- ${label}: ${formatSkippedReason(entry)}`);
    });
  }

  return lines.join("\n");
}
