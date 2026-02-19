import { normalizeDefinitionType } from "../parse.js";
import { DESTINATIONS, getExportability } from "./compatibility.js";

function normalizeDestination(destination) {
  return String(destination || "").trim().toLowerCase();
}

function toDefinitionIdentifier(row, fallbackIndex) {
  if (row?.key) return row.key;
  if (row?.id) return String(row.id);
  if (row?.name) return row.name;
  return `definition_${fallbackIndex + 1}`;
}

function buildSkippedEntry(row, fallbackIndex, reason, destination, normalizedType) {
  return {
    definition: row,
    definitionId: toDefinitionIdentifier(row, fallbackIndex),
    destination,
    type: row?.type || "",
    normalizedType,
    reason
  };
}

export function validateExportRequest(selectedDefinitionRows = [], destination) {
  const normalizedDestination = normalizeDestination(destination);
  const destinationSupported = Object.values(DESTINATIONS).includes(normalizedDestination);
  const rows = Array.isArray(selectedDefinitionRows) ? selectedDefinitionRows : [];

  const exportable = [];
  const skipped = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      skipped.push(buildSkippedEntry(row, index, "invalid_definition_row", normalizedDestination, ""));
      return;
    }

    const normalizedType = normalizeDefinitionType(row.type);
    const exportability = destinationSupported
      ? getExportability(normalizedType, normalizedDestination)
      : { supported: false, reason: "unknown_destination" };

    if (!exportability.supported) {
      skipped.push(buildSkippedEntry(
        row,
        index,
        exportability.reason || "not_exportable",
        normalizedDestination,
        normalizedType
      ));
      return;
    }

    exportable.push({
      ...row,
      normalizedType,
      destination: normalizedDestination
    });
  });

  const reasonCounts = skipped.reduce((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1;
    return acc;
  }, {});

  return {
    destination: normalizedDestination,
    destinationSupported,
    totals: {
      selected: rows.length,
      exportable: exportable.length,
      skipped: skipped.length
    },
    exportable,
    skipped,
    reasonCounts,
    hasExportable: exportable.length > 0
  };
}
