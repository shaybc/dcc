import path from "path";
import BaseAdapter, {
  buildDefinitionIdentity,
  buildTraceabilityHeader,
  stableSlug
} from "./baseAdapter.js";

const GEMINI_RULES_FILE = path.join(".gemini", "instructions.md");
const GEMINI_COMMANDS_DIR = path.join(".gemini", "commands");

function normalizeType(definitionRow = {}) {
  return String(definitionRow.normalizedType || definitionRow.type || "").trim().toLowerCase();
}

function buildRuleBlockMarkers(definitionRow = {}) {
  const identity = buildDefinitionIdentity(definitionRow);
  return {
    start: `<!-- DCC:BEGIN ${identity} -->`,
    end: `<!-- DCC:END ${identity} -->`
  };
}

function buildRulesBlock(definitionRow = {}) {
  const { start, end } = buildRuleBlockMarkers(definitionRow);
  const header = buildTraceabilityHeader(definitionRow);
  const content = String(definitionRow.content || "").trim();
  const lines = [start];
  if (header) lines.push(header);
  if (content) lines.push(content);
  lines.push(end);
  return `${lines.join("\n")}\n`;
}

function buildSlashCommandContent(definitionRow = {}, slug = "") {
  const header = buildTraceabilityHeader(definitionRow);
  const body = String(definitionRow.content || "").trim();
  const lines = [`# /${slug}`, "", "## Instructions", ""];
  if (header) {
    lines.push(header, "");
  }
  if (body) {
    lines.push(body);
  }
  return `${lines.join("\n").trim()}\n`;
}

export class GeminiAdapter extends BaseAdapter {
  constructor() {
    super("gemini");
  }

  getDestinationRoot(projectPath) {
    return path.resolve(projectPath, ".gemini");
  }

  convertDefinition(definitionRow = {}) {
    const normalizedType = normalizeType(definitionRow);

    if (normalizedType === "rules") {
      return {
        destination: this.destination,
        type: normalizedType,
        relativePath: GEMINI_RULES_FILE,
        mergeStrategy: "dcc_marked_block",
        markers: buildRuleBlockMarkers(definitionRow),
        content: buildRulesBlock(definitionRow)
      };
    }

    if (normalizedType === "prompts") {
      const slug = stableSlug(definitionRow);
      return {
        destination: this.destination,
        type: normalizedType,
        relativePath: path.join(GEMINI_COMMANDS_DIR, `${slug}.md`),
        mergeStrategy: "replace_file",
        content: buildSlashCommandContent(definitionRow, slug)
      };
    }

    throw new Error(`Unsupported definition type for Gemini export: ${normalizedType || "unknown"}`);
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
        relativePath: GEMINI_RULES_FILE,
        markers: buildRuleBlockMarkers(definitionRow)
      }];
    }

    if (normalizedType === "prompts") {
      const slug = stableSlug(definitionRow);
      return [{
        op: "delete_file",
        relativePath: path.join(GEMINI_COMMANDS_DIR, `${slug}.md`)
      }];
    }

    return [];
  }
}

export default GeminiAdapter;
