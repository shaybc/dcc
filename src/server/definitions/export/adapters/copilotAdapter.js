import path from "path";
import BaseAdapter, {
  buildDefinitionIdentity,
  buildTraceabilityHeader,
  stableSlug
} from "./baseAdapter.js";

const COPILOT_RULES_FILE = path.join(".github", "copilot-instructions.md");
const COPILOT_PROMPTS_DIR = path.join(".github", "prompts");

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
    return path.resolve(projectPath, ".github");
  }

  convertDefinition(definitionRow = {}) {
    const normalizedType = normalizeType(definitionRow);

    if (normalizedType === "rules") {
      return {
        destination: this.destination,
        type: normalizedType,
        relativePath: COPILOT_RULES_FILE,
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
        relativePath: path.join(COPILOT_PROMPTS_DIR, `${slug}.prompt.md`),
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
        relativePath: COPILOT_RULES_FILE,
        markers: buildRuleBlockMarkers(definitionRow)
      }];
    }

    if (normalizedType === "prompts") {
      const slug = stableSlug(definitionRow);
      return [{
        op: "delete_file",
        relativePath: path.join(COPILOT_PROMPTS_DIR, `${slug}.prompt.md`)
      }];
    }

    return [];
  }
}

export default CopilotAdapter;
