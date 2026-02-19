import fs from "fs";
import path from "path";
import YAML from "yaml";
import { stripDccMetadataDeep } from "./metadata.js";
import { readDefinitionYamlData, sanitizeYamlHeaderScalars } from "./content.js";

const fsp = fs.promises;

export function mergeConfigSection(merged, key, rawContent, filePath = "") {
  const { data, body } = readDefinitionYamlData(rawContent, filePath);
  if (key === "rules") {
    if (body) merged[key].push(body);
    return;
  }
  if (key === "prompts") {
    const promptBody = String(body || data.prompt || "").trim();
    if (!promptBody) return;
    merged[key].push({
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim(),
      prompt: promptBody
    });
    return;
  }
  if (!Array.isArray(data[key])) return;
  merged[key].push(...data[key]);
}

export async function buildMergedConfigContent(configDoc, definitionsByDccUri) {
  const merged = { name: configDoc.name || "", version: configDoc.version || "", schema: configDoc.schema || "v1", description: configDoc.description || "", tags: configDoc.tags || [], models: [], context: [], rules: [], prompts: [], docs: [], mcpServers: [] };
  for (const section of ["models", "context", "rules", "prompts", "docs", "mcpServers"]) {
    const refs = Array.isArray(configDoc[section]) ? configDoc[section] : [];
    for (const ref of refs) {
      const dccUse = String(ref?.dcc_use || "").trim();
      if (!dccUse) continue;
      const referenced = definitionsByDccUri.get(dccUse.toLowerCase());
      if (!referenced) throw new Error(`Config references unknown definition '${dccUse}'.`);
      mergeConfigSection(merged, section, referenced.content || "", referenced.filePath || "");
    }
  }
  return YAML.stringify(stripDccMetadataDeep(merged));
}

export function parseContextProviders(content) {
  const parsed = YAML.parse(sanitizeYamlHeaderScalars(content));
  if (!parsed) return [];
  const stripYamlHeaders = (providerDef) => {
    if (!providerDef || typeof providerDef !== "object") return providerDef;
    return Object.fromEntries(Object.entries(providerDef).filter(([key]) => !["name","version","schema","description","tags","dcc_tags","dcc_uri"].includes(key)));
  };
  if (Array.isArray(parsed)) return parsed.map(stripYamlHeaders).filter((item) => item && typeof item === "object" && item.provider);
  if (parsed.context && Array.isArray(parsed.context)) return parsed.context.map(stripYamlHeaders).filter((item) => item && typeof item === "object" && item.provider);
  if (parsed.provider) return [stripYamlHeaders(parsed)].filter((item) => item && item.provider);
  return [];
}

export async function upsertContextProviders(projectPath, content) {
  const configPath = path.join(projectPath, ".continue", "agents", "team", "project_config.yaml");
  await fsp.mkdir(path.dirname(configPath), { recursive: true });
  const configExists = fs.existsSync(configPath);
  let createdConfig = false;
  let configDoc = {};
  if (!configExists) {
    configDoc = { name: "Team Project Config", version: "1.0.0", schema: "v1" };
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
    createdConfig = true;
  } else {
    const existingRaw = await fsp.readFile(configPath, "utf8");
    configDoc = YAML.parse(existingRaw) || {};
  }
  if (!Array.isArray(configDoc.context)) configDoc.context = [];
  const providersToAdd = parseContextProviders(content);
  const existingProviders = new Set(configDoc.context.filter((item) => item && typeof item === "object" && item.provider).map((item) => String(item.provider)));
  let changed = false;
  for (const providerDef of providersToAdd) {
    const providerName = String(providerDef.provider);
    if (existingProviders.has(providerName)) continue;
    configDoc.context.push(providerDef);
    existingProviders.add(providerName);
    changed = true;
  }
  if (!configExists || changed) await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
  else if (!createdConfig) {
    // no-op
  }
}

export async function removeContextProviders(projectPath, content) {
  const configPath = path.join(projectPath, ".continue", "agents", "team", "project_config.yaml");
  if (!fs.existsSync(configPath)) return;
  const existingRaw = await fsp.readFile(configPath, "utf8");
  const configDoc = YAML.parse(existingRaw) || {};
  if (!Array.isArray(configDoc.context)) return;
  const providersToRemove = new Set(parseContextProviders(content).map((providerDef) => String(providerDef.provider)));
  if (providersToRemove.size === 0) return;
  const nextContext = configDoc.context.filter((item) => !item || typeof item !== "object" || !item.provider || !providersToRemove.has(String(item.provider)));
  if (nextContext.length !== configDoc.context.length) {
    configDoc.context = nextContext;
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
  }
}
