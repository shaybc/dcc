import path from "path";

function requiredMethod(name) {
  throw new Error(`${name} must be implemented by export adapter`);
}

export function buildDefinitionIdentity(definitionRow = {}) {
  const dccUri = String(definitionRow.dccUri || definitionRow.dcc_uri || "").trim();
  const fallback = String(definitionRow.key || definitionRow.id || definitionRow.name || "definition").trim();
  return dccUri || fallback;
}

export function stableSlug(definitionRow = {}) {
  const source = buildDefinitionIdentity(definitionRow)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return source || "definition";
}

export function buildTraceabilityHeader(definitionRow = {}, { commentStyle = "html" } = {}) {
  const metadata = {
    dcc_uri: String(definitionRow.dccUri || definitionRow.dcc_uri || "").trim(),
    version: String(definitionRow.version || "").trim(),
    type: String(definitionRow.normalizedType || definitionRow.type || "").trim()
  };

  const metadataParts = Object.entries(metadata)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");

  if (!metadataParts) return "";
  if (commentStyle === "hash") return `# dcc: ${metadataParts}`;
  return `<!-- dcc: ${metadataParts} -->`;
}

export class BaseAdapter {
  constructor(destination) {
    this.destination = destination;
  }

  getDestinationRoot(projectPath) {
    requiredMethod("getDestinationRoot(projectPath)");
    return path.resolve(projectPath);
  }

  convertDefinition(_definitionRow) {
    requiredMethod("convertDefinition(definitionRow)");
    return null;
  }

  planWrites(_convertedArtifact) {
    requiredMethod("planWrites(convertedArtifact)");
    return [];
  }

  getRemovePlan(_definitionRow) {
    return [];
  }
}

export default BaseAdapter;
