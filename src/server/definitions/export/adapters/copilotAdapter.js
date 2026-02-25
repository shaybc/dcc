import path from "path";
import BaseAdapter, { buildTraceabilityHeader } from "./baseAdapter.js";
import {
  getDccBlockMarkers,
  getManagedRelativePath,
} from "../fileStrategy.js";

function normalizeType(definitionRow = {}) {
  return String(definitionRow.normalizedType || definitionRow.type || "").trim().toLowerCase();
}

function buildRulesBlock(definitionRow = {}) {
  const { start, end } = getDccBlockMarkers(definitionRow) || {};
  const header = buildTraceabilityHeader(definitionRow);
  const content = String(definitionRow.content || "").trim();
  const lines = [start];
  if (header) lines.push(header);
  if (content) lines.push(content);
  if (end) lines.push(end);
  return `${lines.join("\n")}\n`;
}

function buildPromptContent(definitionRow = {}) {
  const header = buildTraceabilityHeader(definitionRow);
  const body = String(definitionRow.content || "").trim();
  const chunks = ["# Prompt", ""];
  if (header) {
    chunks.push(header, "");
  }
  if (body) {
    chunks.push(body);
  }
  return `${chunks.join("\n").trim()}\n`;
}

export class CopilotAdapter extends BaseAdapter {
  constructor() {
    super("copilot");
  }

  getDestinationRoot(projectPath) {
    return path.resolve(projectPath);
  }

  convertDefinition(definitionRow = {}) {
    const normalizedType = normalizeType(definitionRow);

    if (normalizedType === "rules") {
      return {
        destination: this.destination,
        type: normalizedType,
        relativePath: getManagedRelativePath({ destination: this.destination, type: normalizedType, dccUri: definitionRow }),
        mergeStrategy: "dcc_marked_block",
        markers: getDccBlockMarkers(definitionRow),
        content: buildRulesBlock(definitionRow)
      };
    }

    if (normalizedType === "prompts") {
      return {
        destination: this.destination,
        type: normalizedType,
        relativePath: getManagedRelativePath({ destination: this.destination, type: normalizedType, dccUri: definitionRow }),
        mergeStrategy: "replace_file",
        content: buildPromptContent(definitionRow)
      };
    }

    throw new Error(`Unsupported definition type for Copilot export: ${normalizedType || "unknown"}`);
  }

  planWrites(convertedArtifact = {}) {
    return [{
      op: "upsert_file",
      relativePath: convertedArtifact.relativePath,
      mergeStrategy: convertedArtifact.mergeStrategy || "replace_file",
      content: convertedArtifact.content,
      markers: convertedArtifact.markers || null
    }];
  }

  getRemovePlan(definitionRow = {}) {
    const normalizedType = normalizeType(definitionRow);

    if (normalizedType === "rules") {
      return [{
        op: "remove_marked_block",
        relativePath: getManagedRelativePath({ destination: this.destination, type: normalizedType, dccUri: definitionRow }),
        markers: getDccBlockMarkers(definitionRow)
      }];
    }

    if (normalizedType === "prompts") {
      return [{
        op: "delete_file",
        relativePath: getManagedRelativePath({ destination: this.destination, type: normalizedType, dccUri: definitionRow })
      }];
    }

    return [];
  }
}

export default CopilotAdapter;
