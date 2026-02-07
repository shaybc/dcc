import openaiRouter from "./routes/openai.js";

import path from "path";
import fs from "fs";
const fsp = fs.promises;
import os from "os";
import { exec } from "child_process";
import express from "express";
import sqliteUV from "sqlite3";
import matter from "gray-matter";
import YAML from "yaml";
const __dirname = import.meta.dirname;

const sqlite3 = sqliteUV.verbose();
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DCC_DB_PATH || path.join(__dirname, "../../data", "dcc.sqlite");
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      name TEXT,
      description TEXT,
      tags TEXT,
      schema TEXT,
      version TEXT,
      content TEXT,
      type TEXT,
      filePath TEXT,
      source TEXT,
      inTeam INTEGER DEFAULT 0,
      status TEXT,
      updatedAt TEXT
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS dev_project_roots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS dev_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS project_definition_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectPath TEXT NOT NULL,
      definitionKey TEXT NOT NULL,
      copiedAt TEXT,
      UNIQUE(projectPath, definitionKey)
    )`
  );

  db.all("PRAGMA table_info(definitions)", (err, rows = []) => {
    if (err) {
      return;
    }
    const hasTagsColumn = rows.some((row) => row.name === "tags");
    if (!hasTagsColumn) {
      db.run("ALTER TABLE definitions ADD COLUMN tags TEXT", () => {});
    }
  });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
}));

// OpenAI-compatible facade for Continue
app.use("/v1", openaiRouter);

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? row.value : null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

function runDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function allDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}


function extractCommandErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || fallbackMessage || "Operation failed.");
  const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines[lines.length - 1] || fallbackMessage || message;
}

function classifyGitError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("conflict") || message.includes("merge conflict") || message.includes("not possible to fast-forward") || message.includes("could not apply")) {
    return "conflict";
  }
  if (message.includes("permission denied") || message.includes("access denied") || message.includes("403") || message.includes("authentication failed") || message.includes("could not read from remote repository") || message.includes("not authorized") || message.includes("insufficient permission") || message.includes("write access to repository not granted") || message.includes("remote: permission")) {
    return "permission";
  }
  return "other";
}

async function walkFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function deriveType(filePath, data) {
  if (data && data.type) {
    return String(data.type).toLowerCase();
  }
  const parts = filePath.split(path.sep);
  const folder = parts[parts.length - 2] || "unknown";
  return folder.toLowerCase();
}

function buildKey(type, filePath) {
  return `${type}/${path.basename(filePath)}`;
}

function sanitizeDuplicateFileName(fileName) {
  const normalized = path.basename(String(fileName || "").trim());
  if (!normalized || normalized === "." || normalized === "..") {
    return "";
  }
  if (/[\/]/.test(normalized)) {
    return "";
  }
  return normalized;
}

function bumpMinorVersion(version) {
  const raw = String(version || "").trim();
  if (!raw) return "0.1";
  const parts = raw.split(".").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return "0.1";
  }
  if (parts.length === 1) {
    return `${parts[0]}.1`;
  }
  const major = parts[0];
  const minor = parts[1] + 1;
  return `${major}.${minor}`;
}

function updateDefinitionVersionInContent(content, nextVersion, filePath) {
  const ext = path.extname(filePath || "").toLowerCase();
  if ([".yaml", ".yml"].includes(ext)) {
    if (/^\s*version\s*:/m.test(content)) {
      return content.replace(/^(\s*version\s*:\s*)(.*)$/m, (_m, p) => `${p}${nextVersion}`);
    }
    return `version: ${nextVersion}\n${content}`;
  }

  const frontmatterRegex = /^---\n[\s\S]*?\n---/;
  if (frontmatterRegex.test(content)) {
    if (/^(---\n[\s\S]*?\n)\s*version\s*:/m.test(content)) {
      return content.replace(/^(---\n[\s\S]*?\n)(\s*version\s*:\s*)(.*)$/m, (_m, before, p) => `${before}${p}${nextVersion}`);
    }
    return content.replace(/^---\n/, `---\nversion: ${nextVersion}\n`);
  }

  return content;
}

function updateDefinitionNameInContent(content, fileName, nextName) {
  const trimmedName = String(nextName || "").trim();
  if (!trimmedName) {
    return content;
  }

  const ext = path.extname(fileName).toLowerCase();
  if ([".yml", ".yaml"].includes(ext)) {
    if (/^\s*name\s*:/m.test(content)) {
      return content.replace(/^(\s*name\s*:\s*)(.*)$/m, (_match, prefix) => `${prefix}${trimmedName}`);
    }
    return `name: ${trimmedName}\n${content}`;
  }

  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!frontmatterMatch) {
    return content;
  }

  const header = frontmatterMatch[1];
  if (/^\s*name\s*:/m.test(header)) {
    return content.replace(/^(---\r?\n[\s\S]*?\r?\n)(\s*name\s*:\s*)(.*)$/m, (_match, before, prefix) => `${before}${prefix}${trimmedName}`);
  }

  return content.replace(/^---\r?\n/, `---\nname: ${trimmedName}\n`);
}

const YAML_HEADER_FIELDS = new Set(["name", "version", "schema", "description", "tags"]);

function parseYamlHeaderFields(raw) {
  const headers = {};
  const normalized = raw.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      break;
    }

    const match = line.match(/^(\s*)([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, indent, key, value] = match;
    if (!YAML_HEADER_FIELDS.has(key)) {
      continue;
    }

    const trimmedValue = value.trim();
    if (["|", ">", "|-", ">-", "|+", ">+"].includes(trimmedValue)) {
      const blockLines = [];
      const blockIndent = indent.length;
      let contentIndent = null;

      for (let next = i + 1; next < lines.length; next += 1) {
        const nextLine = lines[next];
        if (!nextLine.trim()) {
          blockLines.push("");
          continue;
        }

        const nextIndent = (nextLine.match(/^\s*/) || [""])[0].length;
        if (nextIndent <= blockIndent) {
          i = next - 1;
          break;
        }

        if (contentIndent === null) {
          contentIndent = nextIndent;
        }

        blockLines.push(nextLine.slice(contentIndent));

        if (next === lines.length - 1) {
          i = next;
        }
      }

      const blockValue = blockLines.join("\n").trim();
      if (blockValue) {
        headers[key] = blockValue;
      }
      continue;
    }

    const unquoted = value.replace(/^(\"|\')(.*)\1$/, "$2").trim();
    headers[key] = unquoted;
  }

  return headers;
}


async function parseDefinition(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  let parsed = { data: {}, content: raw };
  const ext = path.extname(filePath).toLowerCase();

  if ([".yml", ".yaml"].includes(ext)) {
    let yamlData = {};
    try {
      const parsedYaml = YAML.parse(raw);
      if (parsedYaml && typeof parsedYaml === "object" && !Array.isArray(parsedYaml)) {
        yamlData = parsedYaml;
      }
    } catch (error) {
      yamlData = {};
    }

    parsed = {
      data: {
        ...yamlData,
        ...parseYamlHeaderFields(raw)
      },
      content: raw
    };
  } else {
    try {
      parsed = matter(raw);
    } catch (error) {
      parsed = { data: {}, content: raw };
    }
  }
  const type = deriveType(filePath, parsed.data);
  const tags = normalizeTags(parsed.data.tags);
  const name = parsed.data.name || path.basename(filePath);
  const description = parsed.data.description || "";
  const schema = parsed.data.schema || "";
  const version = parsed.data.version || "";
  return {
    name,
    description,
    tags,
    schema,
    version,
    content: raw,
    type,
    filePath,
    key: buildKey(type, filePath)
  };
}

function normalizeTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof rawTags === "string") {
    return rawTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", ");
  }

  return "";
}


async function getFileCreatedAt(filePath) {
  if (!filePath) {
    return null;
  }

  try {
    const stats = await fsp.stat(filePath);
    const candidates = [stats.birthtime, stats.ctime, stats.mtime]
      .filter(Boolean)
      .map((date) => new Date(date));

    const validDate = candidates.find((date) => !Number.isNaN(date.getTime()) && date.getTime() > 0);
    return validDate ? validDate.toISOString() : null;
  } catch (_error) {
    return null;
  }
}

function getTeamRoot() {
  return path.join(os.homedir(), ".continue", "team");
}

function normalizeDefinitionType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  if (["model", "models"].includes(normalized)) return "models";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcpservers";
  if (["context", "contexts"].includes(normalized)) return "context";
  return normalized;
}

function getProjectDestinationInfo(projectPath, type, filePath) {
  const normalizedType = normalizeDefinitionType(type);
  const fileName = path.basename(filePath || "");
  const mappings = {
    rules: ["rules", "rules"],
    prompts: ["rules", "prompts"],
    workflows: ["workflows", "workflows"],
    models: ["models", "models"],
    agents: ["agents", "agents"],
    mcpservers: ["mcpServers", "mcpServers"]
  };
  const mapped = mappings[normalizedType];
  if (!mapped) {
    return null;
  }
  const [continueFolder, typeFolder] = mapped;
  const destDir = path.join(projectPath, ".continue", continueFolder, "team", typeFolder);
  return { destDir, destPath: path.join(destDir, fileName), normalizedType };
}

function sanitizeYamlHeaderScalars(raw) {
  return String(raw || "").replace(
    /^(\s*)(name|version|schema|description)\s*:\s*(@[^#\r\n]*)(\s*(?:#.*)?)$/gim,
    (_, indent, key, value, suffix) => `${indent}${key}: "${String(value).trim()}"${suffix || ""}`
  );
}

function parseContextProviders(content) {
  const parsed = YAML.parse(sanitizeYamlHeaderScalars(content));
  if (!parsed) {
    return [];
  }

  const stripYamlHeaders = (providerDef) => {
    if (!providerDef || typeof providerDef !== "object") {
      return providerDef;
    }
    return Object.fromEntries(Object.entries(providerDef).filter(([key]) => !YAML_HEADER_FIELDS.has(key)));
  };

  if (Array.isArray(parsed)) {
    return parsed
      .map(stripYamlHeaders)
      .filter((item) => item && typeof item === "object" && item.provider);
  }
  if (parsed.context && Array.isArray(parsed.context)) {
    return parsed.context
      .map(stripYamlHeaders)
      .filter((item) => item && typeof item === "object" && item.provider);
  }
  if (parsed.provider) {
    return [stripYamlHeaders(parsed)].filter((item) => item && item.provider);
  }
  return [];
}

async function upsertContextProviders(projectPath, content) {
  const configPath = path.join(projectPath, ".continue", "agents", "team", "project_config.yaml");
  console.log(`[context-save] target config path: ${configPath}`);
  await fsp.mkdir(path.dirname(configPath), { recursive: true });

  const configExists = fs.existsSync(configPath);
  console.log(`[context-save] config exists before save: ${configExists}`);
  let createdConfig = false;
  let configDoc = {};
  if (!configExists) {
    configDoc = {
      name: "Team Project Config",
      version: "1.0.0",
      schema: "v1"
    };
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
    createdConfig = true;
    console.log(`[context-save] created config file with header: ${configPath}`);
  } else {
    const existingRaw = await fsp.readFile(configPath, "utf8");
    configDoc = YAML.parse(existingRaw) || {};
  }
  if (!Array.isArray(configDoc.context)) {
    configDoc.context = [];
  }

  let providersToAdd = [];
  try {
    providersToAdd = parseContextProviders(content);
    console.log(`[context-save] parsed providers to add: ${providersToAdd.length}`);
  } catch (error) {
    console.error("[context-save] failed to parse provider yaml", error);
    throw error;
  }
  const existingProviders = new Set(
    configDoc.context
      .filter((item) => item && typeof item === "object" && item.provider)
      .map((item) => String(item.provider))
  );

  let changed = false;
  for (const providerDef of providersToAdd) {
    const providerName = String(providerDef.provider);
    if (existingProviders.has(providerName)) {
      continue;
    }
    configDoc.context.push(providerDef);
    existingProviders.add(providerName);
    changed = true;
  }

  if (!configExists || changed) {
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
    console.log(`[context-save] wrote config file: ${configPath}`);
  } else if (!createdConfig) {
    console.log("[context-save] no changes detected, skipping file write");
  }
}

async function removeContextProviders(projectPath, content) {
  const configPath = path.join(projectPath, ".continue", "agents", "team", "project_config.yaml");
  console.log(`[context-remove] target config path: ${configPath}`);
  if (!fs.existsSync(configPath)) {
    console.log("[context-remove] config file not found, skipping remove");
    return;
  }
  const existingRaw = await fsp.readFile(configPath, "utf8");
  const configDoc = YAML.parse(existingRaw) || {};
  if (!Array.isArray(configDoc.context)) {
    return;
  }

  const providersToRemove = new Set(parseContextProviders(content).map((providerDef) => String(providerDef.provider)));
  if (providersToRemove.size === 0) {
    return;
  }

  const nextContext = configDoc.context.filter((item) => {
    if (!item || typeof item !== "object" || !item.provider) {
      return true;
    }
    return !providersToRemove.has(String(item.provider));
  });

  if (nextContext.length !== configDoc.context.length) {
    configDoc.context = nextContext;
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
  }
}

async function collectTeamFiles() {
  const teamRoot = getTeamRoot();
  if (!fs.existsSync(teamRoot)) {
    return [];
  }
  return walkFiles(teamRoot);
}

async function loadDefinitions() {
  const repoPath = await getSetting("repoPath");
  if (!repoPath || !fs.existsSync(repoPath)) {
    throw new Error("Repo path not found. Configure settings and clone the repo first.");
  }

  const repoFiles = await walkFiles(repoPath);
  const teamFiles = await collectTeamFiles();

  const normalizedRepoFiles = repoFiles.filter((filePath) => !filePath.includes(path.join(repoPath, ".git")));
  const trackedRepoFiles = new Set();
  try {
    const trackedOutput = await runCommand("git ls-files -z", { cwd: repoPath });
    for (const relativePath of trackedOutput.split("\0").filter(Boolean)) {
      trackedRepoFiles.add(path.resolve(repoPath, relativePath));
    }
  } catch (_error) {
    // If git metadata is unavailable, treat files as tracked.
    for (const filePath of normalizedRepoFiles) {
      trackedRepoFiles.add(path.resolve(filePath));
    }
  }
  const repoKeyMap = new Map();
  const teamKeyMap = new Set();

  for (const filePath of normalizedRepoFiles) {
    const type = path.basename(path.dirname(filePath)).toLowerCase();
    const key = buildKey(type, filePath);
    repoKeyMap.set(key, filePath);
  }

  for (const filePath of teamFiles) {
    const type = path.basename(path.dirname(filePath)).toLowerCase();
    const key = buildKey(type, filePath);
    teamKeyMap.add(key);
  }

  const now = new Date().toISOString();

  for (const filePath of normalizedRepoFiles) {
    const definition = await parseDefinition(filePath);
    const inTeam = teamKeyMap.has(definition.key) ? 1 : 0;
    const absoluteFilePath = path.resolve(filePath);
    const source = trackedRepoFiles.has(absoluteFilePath) ? "repo" : "untracked";
    const status = inTeam ? "saved" : "repo";

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO definitions
          (key, name, description, tags, schema, version, content, type, filePath, source, inTeam, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            tags = excluded.tags,
            schema = excluded.schema,
            version = excluded.version,
            content = excluded.content,
            type = excluded.type,
            filePath = excluded.filePath,
            source = excluded.source,
            inTeam = excluded.inTeam,
            status = excluded.status,
            updatedAt = excluded.updatedAt
        `,
        [
          definition.key,
          definition.name,
          definition.description,
          definition.tags,
          definition.schema,
          definition.version,
          definition.content,
          definition.type,
          definition.filePath,
          source,
          inTeam,
          status,
          now
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  for (const filePath of teamFiles) {
    const type = path.basename(path.dirname(filePath)).toLowerCase();
    const key = buildKey(type, filePath);
    if (repoKeyMap.has(key)) {
      continue;
    }
    const definition = await parseDefinition(filePath);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO definitions
          (key, name, description, tags, schema, version, content, type, filePath, source, inTeam, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            tags = excluded.tags,
            schema = excluded.schema,
            version = excluded.version,
            content = excluded.content,
            type = excluded.type,
            filePath = excluded.filePath,
            source = excluded.source,
            inTeam = excluded.inTeam,
            status = excluded.status,
            updatedAt = excluded.updatedAt
        `,
        [
          key,
          definition.name,
          definition.description,
          definition.tags,
          definition.schema,
          definition.version,
          definition.content,
          type,
          filePath,
          "team",
          1,
          "local-only",
          now
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  const repoKeys = [...repoKeyMap.keys()];
  if (repoKeys.length > 0) {
    const placeholders = repoKeys.map(() => "?").join(", ");
    await runDb(`DELETE FROM definitions WHERE source IN ('repo', 'untracked') AND key NOT IN (${placeholders})`, repoKeys);
  } else {
    await runDb("DELETE FROM definitions WHERE source IN ('repo', 'untracked')");
  }

  const teamKeys = [...teamKeyMap];
  if (teamKeys.length > 0) {
    const placeholders = teamKeys.map(() => "?").join(", ");
    await runDb(`DELETE FROM definitions WHERE source = 'team' AND key NOT IN (${placeholders})`, teamKeys);
  } else {
    await runDb("DELETE FROM definitions WHERE source = 'team'");
  }

  await runDb("DELETE FROM project_definition_copies WHERE definitionKey NOT IN (SELECT key FROM definitions)");

  return { repoCount: normalizedRepoFiles.length, teamCount: teamFiles.length };
}

async function scanDevProjects(roots) {
  const projects = new Set();

  async function scanDir(dir) {
    let stat;
    try {
      stat = await fsp.stat(dir);
    } catch (error) {
      return;
    }
    if (!stat.isDirectory()) {
      return;
    }

    const gitPath = path.join(dir, ".git");
    try {
      const gitStat = await fsp.stat(gitPath);
      if (gitStat.isDirectory()) {
        projects.add(dir);
        return;
      }
    } catch (error) {
      // ignore missing .git
    }

    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await scanDir(path.join(dir, entry.name));
      }
    }
  }

  for (const root of roots) {
    if (!root) {
      continue;
    }
    await scanDir(root);
  }

  return Array.from(projects).sort();
}

async function refreshDevProjects(roots) {
  const projects = await scanDevProjects(roots);
  await runDb("DELETE FROM dev_projects");
  for (const project of projects) {
    await runDb("INSERT OR IGNORE INTO dev_projects (path) VALUES (?)", [project]);
  }
  return projects;
}

app.get("/api/settings", async (req, res) => {
  try {
    const repoUrl = await getSetting("repoUrl");
    const repoPath = await getSetting("repoPath");
    res.json({ repoUrl: repoUrl || "", repoPath: repoPath || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  const { repoUrl, repoPath } = req.body;
  try {
    if (repoUrl !== undefined) {
      await setSetting("repoUrl", repoUrl);
    }
    if (repoPath !== undefined) {
      await setSetting("repoPath", repoPath);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/current-dev-project", async (req, res) => {
  try {
    const path = await getSetting("currentDevProject");
    res.json({ path: path || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/current-dev-project", async (req, res) => {
  try {
    const path = String(req.body?.path || "").trim();
    await setSetting("currentDevProject", path);
    res.json({ ok: true, path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/dev-project-roots", async (req, res) => {
  try {
    const rows = await allDb("SELECT id, path FROM dev_project_roots ORDER BY path ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/dev-project-roots", async (req, res) => {
  try {
    const roots = Array.isArray(req.body?.roots) ? req.body.roots : [];
    await runDb("DELETE FROM dev_project_roots");
    for (const root of roots) {
      const trimmed = String(root || "").trim();
      if (!trimmed) {
        continue;
      }
      await runDb("INSERT OR IGNORE INTO dev_project_roots (path) VALUES (?)", [trimmed]);
    }
    const projects = await refreshDevProjects(roots.map((root) => String(root || "").trim()).filter(Boolean));
    res.json({ ok: true, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/dev-projects", async (req, res) => {
  try {
    const rows = await allDb("SELECT id, path FROM dev_projects ORDER BY path ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clone-pull", async (req, res) => {
  try {
    const repoUrl = await getSetting("repoUrl");
    const repoPath = await getSetting("repoPath");
    if (!repoUrl || !repoPath) {
      res.status(400).json({ error: "Missing repoUrl or repoPath in settings." });
      return;
    }

    if (!fs.existsSync(repoPath)) {
      await runCommand(`git clone ${repoUrl} ${repoPath}`);
    } else {
      await runCommand("git pull", { cwd: repoPath });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/load-definitions", async (req, res) => {
  try {
    const result = await loadDefinitions();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/definitions", async (req, res) => {
  try {
    const currentDevProject = await getSetting("currentDevProject");
    const definitionsRows = await allDb(
      "SELECT id, key, name, description, tags, schema, version, type, filePath, source, inTeam, status FROM definitions"
    );

    if (!currentDevProject) {
      res.json(definitionsRows);
      return;
    }

    const copiedRows = await allDb(
      "SELECT definitionKey FROM project_definition_copies WHERE projectPath = ?",
      [currentDevProject]
    );
    const copiedKeys = new Set(copiedRows.map((row) => row.definitionKey));
    const rows = definitionsRows.map((row) => ({ ...row, status: copiedKeys.has(row.key) ? "saved" : "repo" }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/definitions/:id/duplicate", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const nextName = String(req.body?.name || "").trim();
    if (!nextName) {
      res.status(400).json({ error: "Definition name is required." });
      return;
    }

    const nextFileName = sanitizeDuplicateFileName(req.body?.fileName);
    if (!nextFileName) {
      res.status(400).json({ error: "Definition file name is required." });
      return;
    }

    const sourceFilePath = path.resolve(row.filePath || "");
    if (!fs.existsSync(sourceFilePath)) {
      await loadDefinitions();
      res.status(404).json({ error: "Definition file was not found." });
      return;
    }

    const targetDir = path.dirname(sourceFilePath);
    const targetPath = path.join(targetDir, nextFileName);
    if (fs.existsSync(targetPath)) {
      res.status(409).json({ error: "A definition file with that name already exists." });
      return;
    }

    try {
      const originalContent = await fsp.readFile(sourceFilePath, "utf8");
      const duplicatedContent = updateDefinitionNameInContent(originalContent, nextFileName, nextName);
      await fsp.writeFile(targetPath, duplicatedContent, "utf8");

      await loadDefinitions();

      const duplicatedKey = buildKey(deriveType(targetPath, { type: row.type }), targetPath);
      const duplicatedRow = await getDb("SELECT id FROM definitions WHERE key = ?", [duplicatedKey]);
      if (!duplicatedRow) {
        res.status(500).json({ error: "Definition duplicated but could not be indexed." });
        return;
      }

      res.json({ ok: true, id: duplicatedRow.id, message: "Definition duplicated." });
    } catch (error) {
      res.status(500).json({ error: error.message || "Unable to duplicate definition." });
    }
  });
});

app.post("/api/definitions/:id/push-upstream", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const source = String(row.source || "").toLowerCase();
    if (source === "repo") {
      res.status(400).json({ error: "Definition is already tracked in the repository." });
      return;
    }

    const absoluteRepoPath = path.resolve(repoPath);
    const absoluteDefinitionPath = path.resolve(row.filePath || "");
    if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
      res.status(400).json({ error: "Definition file is not in the configured repository." });
      return;
    }

    if (!fs.existsSync(absoluteDefinitionPath)) {
      await loadDefinitions();
      res.status(404).json({ error: "Definition file was not found in the repository." });
      return;
    }

    const commitMessage = String(req.body?.commitMessage || "").trim() || `Add definition ${row.name}`;
    const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath);

    try {
      await runCommand("git pull", { cwd: absoluteRepoPath });
      await runCommand(`git add ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
      await runCommand(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: absoluteRepoPath });
      await runCommand("git push", { cwd: absoluteRepoPath });
      await loadDefinitions();
      res.json({ ok: true, message: "Definition pushed to upstream repository." });
    } catch (error) {
      res.status(500).json({ error: extractCommandErrorMessage(error, "Failed to push definition to upstream.") });
    }
  });
});

app.get("/api/definitions/:id", (req, res) => {
  db.get(
    "SELECT * FROM definitions WHERE id = ?",
    [req.params.id],
    async (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: "Definition not found." });
        return;
      }

      const createdAt = await getFileCreatedAt(row.filePath);

      let content = row.content;
      if (row.filePath) {
        try {
          content = await fsp.readFile(row.filePath, "utf8");
        } catch (_error) {
          content = row.content;
        }
      }

      res.json({ ...row, content, createdAt });
    }
  );
});

app.post("/api/definitions/:id/edit-save", async (req, res) => {
  const row = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
  if (!row) {
    res.status(404).json({ error: "Definition not found." });
    return;
  }

  const repoPath = await getSetting("repoPath");
  if (!repoPath) {
    res.status(400).json({ error: "Repo path not configured." });
    return;
  }

  const absoluteRepoPath = path.resolve(repoPath);
  const absoluteDefinitionPath = path.resolve(row.filePath || "");
  if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
    res.status(400).json({ error: "Definition file is not in the configured repository." });
    return;
  }

  if (!fs.existsSync(absoluteDefinitionPath)) {
    await loadDefinitions();
    res.status(404).json({ error: "Definition file not found." });
    return;
  }

  const content = String(req.body?.content || "");
  const nextVersion = bumpMinorVersion(row.version || "");
  const nextContent = updateDefinitionVersionInContent(content, nextVersion, absoluteDefinitionPath);
  const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath);

  try {
    await runCommand("git pull", { cwd: absoluteRepoPath });
    await fsp.writeFile(absoluteDefinitionPath, nextContent, "utf8");
    await runCommand(`git add ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
    await runCommand(`git commit -m ${JSON.stringify(`Edit definition ${row.name}`)}`, { cwd: absoluteRepoPath });
    await runCommand("git push", { cwd: absoluteRepoPath });
    await loadDefinitions();
    res.json({ ok: true, message: "Definition edit saved to repository." });
  } catch (error) {
    res.status(500).json({ error: extractCommandErrorMessage(error, "Failed to save definition edit.") });
  }
});

app.post("/api/definitions/create-local", async (req, res) => {
  const repoPath = await getSetting("repoPath");
  if (!repoPath) {
    res.status(400).json({ error: "Repo path not configured." });
    return;
  }

  const fileName = sanitizeDuplicateFileName(req.body?.fileName);
  const directoryPath = String(req.body?.directoryPath || "").trim().replace(/^\/+|\/+$/g, "");
  const content = String(req.body?.content || "");

  if (!fileName) {
    res.status(400).json({ error: "File name is required." });
    return;
  }
  if (!directoryPath) {
    res.status(400).json({ error: "Directory path is required." });
    return;
  }

  const absoluteRepoPath = path.resolve(repoPath);
  const targetDir = path.resolve(absoluteRepoPath, directoryPath);
  if (!targetDir.startsWith(`${absoluteRepoPath}${path.sep}`) && targetDir !== absoluteRepoPath) {
    res.status(400).json({ error: "Directory path must be inside repo." });
    return;
  }

  const targetPath = path.join(targetDir, fileName);
  if (fs.existsSync(targetPath)) {
    res.status(409).json({ error: "File already exists." });
    return;
  }

  try {
    await fsp.mkdir(targetDir, { recursive: true });
    await fsp.writeFile(targetPath, content, "utf8");
    await loadDefinitions();
    res.json({ ok: true, message: "Local untracked definition created." });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to create local definition." });
  }
});

app.post("/api/definitions/:id/save", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    let currentDevProject = null;
    try {
      currentDevProject = await getSetting("currentDevProject");
      if (!currentDevProject) {
        res.status(400).json({ error: "Current dev project not selected." });
        return;
      }

      const normalizedType = normalizeDefinitionType(row.type);
      if (normalizedType === "context") {
        console.log(`[definition-save] saving context definition id=${row.id} key=${row.key} project=${currentDevProject}`);
        await upsertContextProviders(currentDevProject, row.content || "");
      } else {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        await fsp.mkdir(destinationInfo.destDir, { recursive: true });
        await fsp.copyFile(row.filePath, destinationInfo.destPath);
      }

      await runDb(
        "INSERT OR IGNORE INTO project_definition_copies (projectPath, definitionKey, copiedAt) VALUES (?, ?, ?)",
        [currentDevProject, row.key, new Date().toISOString()]
      );
      db.run(
        "UPDATE definitions SET inTeam = 1, status = 'saved' WHERE id = ?",
        [row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      console.error("[definition-save] failed to save definition", {
        id: row.id,
        key: row.key,
        type: row.type,
        project: currentDevProject,
        error
      });
      res.status(500).json({ error: error.message });
    }
  });
});

app.post("/api/definitions/:id/publish", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    try {
      const repoPath = await getSetting("repoPath");
      if (!repoPath) {
        res.status(400).json({ error: "Repo path not configured." });
        return;
      }
      const typeFolder = row.type || "misc";
      const destDir = path.join(repoPath, typeFolder);
      await fsp.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, path.basename(row.filePath));
      await runCommand("git pull", { cwd: repoPath });
      await fsp.copyFile(row.filePath, destPath);
      await runCommand(`git add ${destPath}`, { cwd: repoPath });
      await runCommand(`git commit -m "Add definition ${row.name}"`, { cwd: repoPath });
      await runCommand("git push", { cwd: repoPath });

      db.run(
        "UPDATE definitions SET filePath = ?, source = 'repo', status = 'saved', inTeam = 1 WHERE id = ?",
        [destPath, row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});


app.post("/api/definitions/:id/delete-repo", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const absoluteDefinitionPath = path.resolve(row.filePath || "");
    const isUntrackedDefinition = String(row.source || "").toLowerCase() === "untracked";

    if (isUntrackedDefinition) {
      if (!fs.existsSync(absoluteDefinitionPath)) {
        await loadDefinitions();
        res.status(404).json({ error: "Definition file was not found in local files." });
        return;
      }

      try {
        await fsp.unlink(absoluteDefinitionPath);
        await loadDefinitions();
        res.json({
          ok: true,
          message: "Definition deleted from local files.",
        });
      } catch (deleteError) {
        await loadDefinitions();
        res.status(500).json({ error: deleteError.message || "Failed to delete local definition file." });
      }
      return;
    }

    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const absoluteRepoPath = path.resolve(repoPath);
    if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
      res.status(400).json({ error: "Definition file is not in the configured repository." });
      return;
    }

    const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath);

    try {
      await runCommand("git pull", { cwd: absoluteRepoPath });
    } catch (pullError) {
      if (classifyGitError(pullError) === "conflict") {
        try {
          await runCommand("git reset --hard HEAD", { cwd: absoluteRepoPath });
          await runCommand("git clean -fd", { cwd: absoluteRepoPath });
          await runCommand("git pull --rebase", { cwd: absoluteRepoPath });
          await loadDefinitions();
        } catch (_rollbackError) {}

        res.status(409).json({
          error: "Deletion cancelled due to merge conflicts while syncing the repository. Please resolve this deletion manually in the Git repository.",
        });
        return;
      }
      res.status(500).json({ error: extractCommandErrorMessage(pullError, "Failed to sync repository before deletion.") });
      return;
    }

    if (!fs.existsSync(absoluteDefinitionPath)) {
      await loadDefinitions();
      res.status(404).json({ error: "Definition file was not found in the repository." });
      return;
    }

    try {
      await fsp.unlink(absoluteDefinitionPath);
      await runCommand(`git add ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
      await runCommand(`git commit -m "Delete definition ${row.name}"`, { cwd: absoluteRepoPath });
    } catch (localError) {
      try {
        await runCommand("git reset --hard HEAD", { cwd: absoluteRepoPath });
        await runCommand("git clean -fd", { cwd: absoluteRepoPath });
      } catch (_resetError) {}
      await loadDefinitions();
      res.status(500).json({ error: extractCommandErrorMessage(localError, "Failed to prepare deletion commit.") });
      return;
    }

    try {
      await runCommand("git push", { cwd: absoluteRepoPath });
      await loadDefinitions();
      res.json({
        ok: true,
        message: "Definition deleted from the cloned repository and pushed to the team repository.",
      });
    } catch (pushError) {
      const category = classifyGitError(pushError);
      try {
        await runCommand("git reset --hard HEAD~1", { cwd: absoluteRepoPath });
        await runCommand("git clean -fd", { cwd: absoluteRepoPath });
        await runCommand("git pull --rebase", { cwd: absoluteRepoPath });
        await loadDefinitions();
      } catch (_rollbackError) {
        try {
          await loadDefinitions();
        } catch (_loadError) {}
      }

      if (category === "permission") {
        res.status(403).json({
          error: "Deletion was cancelled because you do not have permission to push this change. Ask the DCC administrators if you need this permission.",
        });
        return;
      }

      if (category === "conflict") {
        res.status(409).json({
          error: "Deletion cancelled due to merge conflicts while pushing. Please resolve this deletion manually in the Git repository.",
        });
        return;
      }

      res.status(500).json({ error: extractCommandErrorMessage(pushError, "Failed to push deletion commit.") });
    }
  });
});

app.post("/api/definitions/:id/remove", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    let currentDevProject = null;
    try {
      currentDevProject = await getSetting("currentDevProject");
      if (!currentDevProject) {
        res.status(400).json({ error: "Current dev project not selected." });
        return;
      }

      const normalizedType = normalizeDefinitionType(row.type);
      if (normalizedType === "context") {
        await removeContextProviders(currentDevProject, row.content || "");
      } else {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        if (fs.existsSync(destinationInfo.destPath)) {
          await fsp.unlink(destinationInfo.destPath);
        }
      }

      await runDb(
        "DELETE FROM project_definition_copies WHERE projectPath = ? AND definitionKey = ?",
        [currentDevProject, row.key]
      );

      db.run(
        "UPDATE definitions SET inTeam = 0, status = 'repo' WHERE id = ?",
        [row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "../client", "settings.html"));
});

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
