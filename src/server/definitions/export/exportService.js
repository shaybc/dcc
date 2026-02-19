import fs from "fs";
import path from "path";
import { validateExportRequest } from "./validateExportRequest.js";
import { DESTINATIONS } from "./compatibility.js";
import CopilotAdapter from "./adapters/copilotAdapter.js";
import GeminiAdapter from "./adapters/geminiAdapter.js";

const fsp = fs.promises;

const VALID_MODES = new Set(["install", "remove"]);

function normalizeMode(mode) {
  const normalizedMode = String(mode || "install").trim().toLowerCase();
  return VALID_MODES.has(normalizedMode) ? normalizedMode : "install";
}

function createAdapter(destination) {
  const normalizedDestination = String(destination || "").trim().toLowerCase();
  if (normalizedDestination === DESTINATIONS.COPILOT) return new CopilotAdapter();
  if (normalizedDestination === DESTINATIONS.GEMINI) return new GeminiAdapter();
  return null;
}

function ensureTypeCounts(countsByType, type) {
  const normalizedType = String(type || "unknown").trim().toLowerCase() || "unknown";
  if (!countsByType[normalizedType]) {
    countsByType[normalizedType] = {
      total: 0,
      written: 0,
      skipped: 0
    };
  }
  return countsByType[normalizedType];
}

async function applyWriteOperation(rootPath, writeOp) {
  const relativePath = String(writeOp?.relativePath || "").trim();
  if (!relativePath) {
    return { skipped: true, reason: "missing_relative_path", filePath: "" };
  }

  const filePath = path.resolve(rootPath, relativePath);

  if (writeOp.op === "delete_file") {
    await fsp.rm(filePath, { force: true });
    return { filePath };
  }

  if (writeOp.op === "remove_marked_block") {
    const markerStart = String(writeOp?.markers?.start || "").trim();
    const markerEnd = String(writeOp?.markers?.end || "").trim();
    if (!markerStart || !markerEnd) {
      return { skipped: true, reason: "missing_markers", filePath };
    }

    let existing = "";
    try {
      existing = await fsp.readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        return { skipped: true, reason: "file_not_found", filePath };
      }
      throw error;
    }

    const pattern = new RegExp(`${escapeRegExp(markerStart)}[\\s\\S]*?${escapeRegExp(markerEnd)}\\n?`, "g");
    const nextContent = existing.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trimEnd();

    if (nextContent.trim()) {
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, `${nextContent}\n`, "utf8");
    } else {
      await fsp.rm(filePath, { force: true });
    }

    return { filePath };
  }

  if (writeOp.op === "upsert_file") {
    const content = String(writeOp?.content || "");

    await fsp.mkdir(path.dirname(filePath), { recursive: true });

    if (writeOp.mergeStrategy === "dcc_marked_block") {
      const markerStart = String(writeOp?.markers?.start || "").trim();
      const markerEnd = String(writeOp?.markers?.end || "").trim();
      if (!markerStart || !markerEnd) {
        return { skipped: true, reason: "missing_markers", filePath };
      }

      let existing = "";
      try {
        existing = await fsp.readFile(filePath, "utf8");
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }

      const pattern = new RegExp(`${escapeRegExp(markerStart)}[\\s\\S]*?${escapeRegExp(markerEnd)}\\n?`, "g");
      const withoutOldBlock = existing.replace(pattern, "").trimEnd();
      const withSeparation = withoutOldBlock ? `${withoutOldBlock}\n\n` : "";
      await fsp.writeFile(filePath, `${withSeparation}${content}`, "utf8");
      return { filePath };
    }

    await fsp.writeFile(filePath, content, "utf8");
    return { filePath };
  }

  return { skipped: true, reason: "unknown_operation", filePath };
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function exportDefinitionsToDestination({
  projectPath,
  destination,
  definitions,
  mode
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const adapter = createAdapter(destination);
  const warnings = [];

  if (!projectPath) {
    throw new Error("projectPath is required for exportDefinitionsToDestination");
  }

  if (!adapter) {
    return {
      writtenFiles: [],
      skipped: Array.isArray(definitions) ? definitions.map((definition) => ({
        definition,
        reason: "unsupported_destination"
      })) : [],
      warnings: [`Unsupported export destination: ${String(destination || "unknown")}`],
      countsByType: {}
    };
  }

  const validated = validateExportRequest(definitions, destination);
  const destinationRoot = adapter.getDestinationRoot(projectPath);
  const countsByType = {};
  const writtenFiles = [];
  const skipped = [...validated.skipped];

  skipped.forEach((item) => {
    ensureTypeCounts(countsByType, item.normalizedType || item.type).skipped += 1;
  });

  if (!validated.destinationSupported) {
    warnings.push(`Destination \"${validated.destination}\" is not recognized.`);
  }

  if (!validated.hasExportable) {
    return {
      writtenFiles,
      skipped,
      warnings,
      countsByType
    };
  }

  for (const definition of validated.exportable) {
    const typeCounts = ensureTypeCounts(countsByType, definition.normalizedType || definition.type);
    typeCounts.total += 1;

    let writePlan = [];
    try {
      if (normalizedMode === "remove") {
        writePlan = adapter.getRemovePlan(definition) || [];
      } else {
        const converted = adapter.convertDefinition(definition);
        writePlan = adapter.planWrites(converted) || [];
      }
    } catch (error) {
      skipped.push({
        definition,
        destination: validated.destination,
        type: definition.type,
        normalizedType: definition.normalizedType,
        reason: "conversion_failed",
        message: error?.message || String(error)
      });
      typeCounts.skipped += 1;
      continue;
    }

    if (!Array.isArray(writePlan) || writePlan.length === 0) {
      skipped.push({
        definition,
        destination: validated.destination,
        type: definition.type,
        normalizedType: definition.normalizedType,
        reason: "no_write_plan"
      });
      typeCounts.skipped += 1;
      continue;
    }

    for (const writeOp of writePlan) {
      const opResult = await applyWriteOperation(destinationRoot, writeOp);

      if (opResult.skipped) {
        skipped.push({
          definition,
          destination: validated.destination,
          type: definition.type,
          normalizedType: definition.normalizedType,
          reason: opResult.reason,
          relativePath: writeOp?.relativePath || ""
        });
        typeCounts.skipped += 1;
        continue;
      }

      writtenFiles.push({
        definitionId: definition.key || definition.id || definition.name || "definition",
        destination: validated.destination,
        mode: normalizedMode,
        type: definition.normalizedType || definition.type,
        relativePath: writeOp.relativePath,
        filePath: opResult.filePath,
        op: writeOp.op
      });
      typeCounts.written += 1;
    }
  }

  return {
    writtenFiles,
    skipped,
    warnings,
    countsByType
  };
}

export default exportDefinitionsToDestination;
