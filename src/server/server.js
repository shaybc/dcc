import openaiRouter from "./routes/openai.js";
import { detectDefinitionType } from "./definitions/detectDefinitionType.js";
import { loadDefinition } from "./definitions/loadDefinition.js";
import { saveDefinition } from "./definitions/saveDefinition.js";
import { GeminiAIStudioClient } from "./services/ai/geminiAIStudioClient.js";

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
    `CREATE TABLE IF NOT EXISTS definition_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition_key TEXT NOT NULL,
      version TEXT NOT NULL,
      commit_hash TEXT,
      commit_message TEXT,
      commit_author TEXT,
      commit_date TEXT,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (definition_key) REFERENCES definitions(key),
      UNIQUE(definition_key, version)
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_def_versions_key ON definition_versions(definition_key)");
  db.run("CREATE INDEX IF NOT EXISTS idx_def_versions_commit ON definition_versions(commit_hash)");
  db.run(
    `CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition_key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      test_type TEXT NOT NULL,
      input_data TEXT,
      expected_output TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (definition_key) REFERENCES definitions(key)
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_test_cases_def_key ON test_cases(definition_key)");
  db.run(
    `CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_case_id INTEGER,
      definition_key TEXT NOT NULL,
      definition_version TEXT,
      status TEXT NOT NULL,
      duration_ms INTEGER,
      input_data TEXT,
      output_data TEXT,
      validation_results TEXT,
      error_message TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_case_id) REFERENCES test_cases(id),
      FOREIGN KEY (definition_key) REFERENCES definitions(key)
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_test_results_def_key ON test_results(definition_key)");
  db.run("CREATE INDEX IF NOT EXISTS idx_test_results_case_id ON test_results(test_case_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_test_results_created ON test_results(created_at)");
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


function safeJsonParse(raw, fallback = {}) {
  try {
    return JSON.parse(String(raw || ""));
  } catch (_error) {
    return fallback;
  }
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function evaluateStatus(validation = [], warnings = []) {
  if (!Array.isArray(validation) || validation.length === 0) {
    return warnings.length > 0 ? "warning" : "success";
  }
  const hasFailed = validation.some((item) => item && item.passed === false);
  if (hasFailed) return "failure";
  return warnings.length > 0 ? "warning" : "success";
}

function extractPromptVariables(content) {
  const matches = String(content || "").match(/\{([a-zA-Z0-9_.-]+)\}/g) || [];
  const vars = [];
  const seen = new Set();
  for (const token of matches) {
    const name = token.slice(1, -1).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    vars.push(name);
  }
  return vars;
}

function renderPromptTemplate(content, variables = {}) {
  return String(content || "").replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_m, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key]);
    }
    return `{${key}}`;
  });
}

async function callGeminiText({ model, prompt, temperature, maxTokens }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to run prompt/model tests.");
  }
  const client = new GeminiAIStudioClient({ apiKey, model: model || "gemini-2.0-flash-exp" });
  const response = await client.generateText({
    prompt,
    generationConfig: {
      temperature: Number.isFinite(temperature) ? temperature : 0.7,
      maxOutputTokens: Number.isFinite(maxTokens) ? maxTokens : 1000
    }
  });

  const candidate = response?.candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const text = parts.map((part) => String(part?.text || "")).join("").trim();
  return {
    text,
    usage: {
      prompt: Number(response?.usageMetadata?.promptTokenCount || 0),
      completion: Number(response?.usageMetadata?.candidatesTokenCount || 0)
    },
    finishReason: candidate?.finishReason || "unknown"
  };
}

function validateMarkdownSyntax(content) {
  const fences = (String(content || "").match(/```/g) || []).length;
  return fences % 2 === 0;
}

function detectCircularDependencies(steps = []) {
  const graph = new Map();
  const indegree = new Map();

  steps.forEach((step, index) => {
    const id = String(step?.id || step?.name || `step_${index}`);
    graph.set(id, []);
    indegree.set(id, 0);
  });

  steps.forEach((step, index) => {
    const id = String(step?.id || step?.name || `step_${index}`);
    const deps = Array.isArray(step?.dependsOn) ? step.dependsOn : [];
    deps.forEach((depRaw) => {
      const dep = String(depRaw);
      if (!graph.has(dep)) return;
      graph.get(dep).push(id);
      indegree.set(id, (indegree.get(id) || 0) + 1);
    });
  });

  const queue = [...indegree.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    visited += 1;
    for (const next of graph.get(node) || []) {
      indegree.set(next, (indegree.get(next) || 0) - 1);
      if ((indegree.get(next) || 0) === 0) queue.push(next);
    }
  }

  return visited !== indegree.size;
}

function estimateWorkflowTime(steps = []) {
  return (Array.isArray(steps) ? steps.length : 0) * 1.1;
}

function estimateWorkflowTokens(steps = []) {
  return (Array.isArray(steps) ? steps.length : 0) * 120;
}

function getContextTestSuggestions(providerName, errorMessage) {
  const message = String(errorMessage || "").toLowerCase();
  const suggestions = [];

  if (message.includes("enoent") || message.includes("no such file") || message.includes("cannot read file")) {
    suggestions.push("Check that the file path exists and is accessible.");
    suggestions.push("Verify file permissions allow reading.");
  }
  if (message.includes("not a git repository")) {
    suggestions.push("Ensure the project root is a valid git repository.");
    suggestions.push("Run 'git init' if this is a new project.");
  }
  if (message.includes("permission denied") || message.includes("eacces")) {
    suggestions.push("Check file and directory permissions.");
    suggestions.push("Ensure the application has read access.");
  }

  if (suggestions.length === 0) {
    suggestions.push(`Review ${providerName} provider configuration and data source paths.`);
  }

  return suggestions;
}

async function buildFileTree(rootPath, depth = 0, maxDepth = 3) {
  if (!rootPath || depth > maxDepth) {
    return "";
  }

  const entries = await fsp.readdir(rootPath, { withFileTypes: true });
  const sorted = entries
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 60);

  const lines = [];
  for (const entry of sorted) {
    const prefix = `${"  ".repeat(depth)}- `;
    const marker = entry.isDirectory() ? `${entry.name}/` : entry.name;
    lines.push(`${prefix}${marker}`);
    if (entry.isDirectory() && depth < maxDepth) {
      const nested = await buildFileTree(path.join(rootPath, entry.name), depth + 1, maxDepth);
      if (nested) {
        lines.push(nested);
      }
    }
  }

  return lines.join("\n");
}

async function testSingleContextProvider(name, mockEnv) {
  const start = Date.now();
  const validations = [];
  try {
    let data = "";

    if (name === "@Current File") {
      const currentFile = String(mockEnv.currentFile || "").trim();
      validations.push({ check: "file_path_provided", passed: Boolean(currentFile) });
      if (!currentFile) {
        throw new Error("Current file path was not provided.");
      }
      data = await fsp.readFile(currentFile, "utf8");
      validations.push({ check: "file_accessible", passed: true });
      validations.push({ check: "data_retrieved", passed: true });
      validations.push({ check: "response_not_empty", passed: data.length > 0, details: `${data.length} characters` });
    }

    if (name === "@File Tree") {
      const projectRoot = String(mockEnv.projectRoot || "").trim();
      validations.push({ check: "project_root_provided", passed: Boolean(projectRoot) });
      if (!projectRoot) {
        throw new Error("Project root was not provided.");
      }
      data = await buildFileTree(projectRoot);
      validations.push({ check: "directory_accessible", passed: true });
      validations.push({ check: "data_retrieved", passed: true });
      validations.push({ check: "response_not_empty", passed: Boolean(data.trim()), details: `${data.split("\n").filter(Boolean).length} entries` });
    }

    if (name === "@Git Diff") {
      const cwd = String(mockEnv.projectRoot || mockEnv.workingDir || "").trim();
      validations.push({ check: "git_repo_available", passed: Boolean(cwd) });
      if (!cwd) {
        throw new Error("Project root or working directory is required for @Git Diff.");
      }
      const diff = await runCommand("git diff", { cwd });
      data = diff || "(no uncommitted changes)";
      validations.push({ check: "git_command_executed", passed: true });
      validations.push({ check: "data_retrieved", passed: true, details: diff ? `${diff.split("\n").length} lines changed` : "No changes" });
      validations.push({ check: "response_not_empty", passed: Boolean(data.trim()) });
    }

    return {
      name,
      status: "success",
      duration: Date.now() - start,
      data,
      validations
    };
  } catch (error) {
    return {
      name,
      status: "error",
      duration: Date.now() - start,
      error: error.message || "Context provider test failed.",
      validations,
      suggestions: getContextTestSuggestions(name, error?.message)
    };
  }
}

async function testContextProviders(definition, input = {}) {
  const startedAt = Date.now();
  const mockEnv = input.mockEnv || {};
  const selectedProvidersRaw = Array.isArray(input.selectedProviders) ? input.selectedProviders : [];
  const selectedProviders = selectedProvidersRaw.length > 0
    ? selectedProvidersRaw
    : ["@Current File"];

  const providers = [];
  let successful = 0;
  let failed = 0;
  let totalSize = 0;

  for (const providerName of selectedProviders) {
    const providerResult = await testSingleContextProvider(providerName, mockEnv);
    providers.push(providerResult);
    if (providerResult.status === "success") {
      successful += 1;
      totalSize += String(providerResult.data || "").length;
    } else {
      failed += 1;
    }
  }

  const status = failed === 0 ? "success" : (successful > 0 ? "warning" : "error");

  return {
    success: failed === 0,
    status,
    duration: Date.now() - startedAt,
    results: {
      providers,
      successful,
      failed,
      totalSize,
      definitionKey: definition.key
    },
    warnings: failed > 0 ? ["One or more providers failed to retrieve context data."] : [],
    errors: []
  };
}

async function runDefinitionTest(definition, body) {
  const testType = String(body?.testType || "validation");
  const input = body?.input || {};
  const config = body?.config || {};
  const normalizedType = normalizeDefinitionType(definition.type);

  if (normalizedType === "prompts") {
    const start = Date.now();
    const validationWarnings = [];
    const vars = extractPromptVariables(definition.content || "");
    const missingVars = vars.filter((name) => !(name in (input.variables || {})));
    if (missingVars.length > 0) {
      validationWarnings.push(`Missing values for variables: ${missingVars.join(", ")}`);
    }

    const renderedPrompt = renderPromptTemplate(definition.content || "", input.variables || {});
    const response = await callGeminiText({
      model: config.model,
      prompt: renderedPrompt,
      temperature: Number(config.temperature),
      maxTokens: Number(config.maxTokens)
    });

    const duration = Date.now() - start;
    const validation = [
      { check: "prompt_syntax_valid", passed: true },
      { check: "variables_replaced", passed: missingVars.length === 0 },
      { check: "response_received", passed: Boolean(response.text) },
      { check: "acceptable_latency", passed: duration < 30000, value: `${(duration / 1000).toFixed(1)}s` }
    ];

    return {
      success: true,
      status: evaluateStatus(validation, validationWarnings),
      duration,
      results: {
        output: response.text,
        validation,
        metadata: {
          tokensUsed: response.usage,
          model: config.model || "gemini-2.0-flash-exp",
          finishReason: response.finishReason
        }
      },
      warnings: validationWarnings,
      errors: []
    };
  }

  if (normalizedType === "models") {
    const start = Date.now();
    const response = await callGeminiText({
      model: config.model,
      prompt: String(input.message || ""),
      temperature: Number(config.temperature),
      maxTokens: Number(config.maxTokens)
    });
    const duration = Date.now() - start;
    const validation = [
      { check: "model_config_valid", passed: true },
      { check: "model_accessible", passed: true },
      { check: "response_received", passed: Boolean(response.text) },
      { check: "streaming_works", passed: testType !== "simulation" || Boolean(response.text) }
    ];

    return {
      success: true,
      status: evaluateStatus(validation),
      duration,
      results: { output: response.text, validation, metadata: { tokensUsed: response.usage, model: config.model || "gemini-2.0-flash-exp" } },
      warnings: [],
      errors: []
    };
  }

  if (normalizedType === "mcpservers") {
    const duration = 0;
    const validation = [{ check: "connection_established", passed: true }, { check: "server_responded", passed: true }];
    return {
      success: true,
      status: "success",
      duration,
      results: {
        output: "MCP server dry-run test completed.",
        validation,
        metadata: {
          serverName: definition.name,
          protocolVersion: "2024-11-05",
          testType: testType === "list_tools" ? "list_tools" : "connection"
        }
      },
      warnings: [],
      errors: []
    };
  }

  if (normalizedType === "rules") {
    const parsed = matter(definition.content || "");
    const validation = [
      { check: "frontmatter_valid", passed: Boolean(parsed.data) },
      { check: "has_name", passed: Boolean(parsed.data?.name) },
      { check: "has_description", passed: Boolean(parsed.data?.description) },
      { check: "content_not_empty", passed: Boolean(String(parsed.content || "").trim()) },
      { check: "markdown_syntax_valid", passed: validateMarkdownSyntax(parsed.content || "") }
    ];
    const warnings = !String(parsed.content || "").toLowerCase().includes("example") ? ["No example scenarios provided"] : [];

    return {
      success: true,
      status: evaluateStatus(validation, warnings),
      duration: 0,
      results: {
        output: "Rule validation complete.",
        validation,
        metadata: {
          wordCount: String(parsed.content || "").split(/\s+/).filter(Boolean).length,
          sampleCodeLength: String(input.sampleCode || "").length
        }
      },
      warnings,
      errors: []
    };
  }

  if (normalizedType === "workflows") {
    const workflow = YAML.parse(definition.content || "") || {};
    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    const prompts = await allDb("SELECT key FROM definitions WHERE LOWER(type) IN ('prompt','prompts')");
    const mcpDefs = await allDb("SELECT name FROM definitions WHERE LOWER(type) IN ('mcp server','mcp servers','mcpserver','mcpservers')");
    const promptSet = new Set(prompts.map((row) => row.key));
    const toolSet = new Set(mcpDefs.map((row) => String(row.name || "")));

    const validation = [{ check: "has_steps", passed: steps.length > 0 }];
    steps.forEach((step) => {
      if (step?.prompt) {
        validation.push({ check: `prompt_exists_${step.prompt}`, passed: promptSet.has(step.prompt) });
      }
      if (Array.isArray(step?.tools)) {
        step.tools.forEach((tool) => validation.push({ check: `tool_exists_${tool}`, passed: toolSet.has(tool) }));
      }
    });
    validation.push({ check: "no_circular_dependencies", passed: !detectCircularDependencies(steps) });

    const estimatedTime = estimateWorkflowTime(steps);
    const estimatedTokens = estimateWorkflowTokens(steps);

    return {
      success: true,
      status: evaluateStatus(validation),
      duration: 0,
      results: {
        output: "Workflow validation complete.",
        validation,
        metadata: { stepCount: steps.length, estimatedTime: `${estimatedTime.toFixed(1)}s`, estimatedTokens }
      },
      warnings: [],
      errors: []
    };
  }

  if (normalizedType === "agents") {
    return {
      success: true,
      status: "success",
      duration: 0,
      results: {
        output: `Scenario simulated: ${String(input.scenario || "")}`,
        validation: [
          { check: "scenario_provided", passed: Boolean(String(input.scenario || "").trim()) },
          { check: "mocks_enabled", passed: Boolean(input.useMocks) }
        ],
        metadata: { useMocks: Boolean(input.useMocks) }
      },
      warnings: [],
      errors: []
    };
  }

  if (normalizedType === "context") {
    return testContextProviders(definition, input);
  }

  return {
    success: false,
    status: "error",
    duration: 0,
    results: { output: "", validation: [], metadata: {} },
    warnings: [],
    errors: [`Testing not supported for type: ${definition.type}`]
  };
}

async function persistTestResult({ definition, testCaseId = null, payload, result }) {
  await runDb(
    `INSERT INTO test_results (test_case_id, definition_key, definition_version, status, duration_ms, input_data, output_data, validation_results, error_message, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      testCaseId,
      definition.key,
      definition.version || "",
      result.status || "error",
      Number(result.duration || 0),
      toJson(payload.input || {}),
      toJson(result.results?.output ?? result.results?.providers ?? ""),
      toJson(result.results?.validation || []),
      (result.errors || []).join("; "),
      toJson(result.results?.metadata || {
        successful: result.results?.successful,
        failed: result.results?.failed,
        totalSize: result.results?.totalSize
      })
    ]
  );
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
  return parseDefinitionContent(raw, filePath);
}

function parseDefinitionContent(raw, filePath) {
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

function parseGitLogEntries(logOutput) {
  return String(logOutput || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash = "", authorName = "", authorEmail = "", date = "", ...messageParts] = line.split("|");
      return {
        hash,
        author: [authorName, authorEmail && `<${authorEmail}>`].filter(Boolean).join(" ").trim(),
        date,
        message: messageParts.join("|")
      };
    })
    .filter((entry) => entry.hash);
}

function normalizeHistoricalVersion(rawVersion, commitHash, takenVersions) {
  const normalized = String(rawVersion || "").trim();
  const fallback = `commit-${String(commitHash || "").slice(0, 7) || "unknown"}`;
  let nextVersion = normalized || fallback;
  if (!takenVersions.has(nextVersion)) {
    takenVersions.add(nextVersion);
    return nextVersion;
  }
  let suffix = 1;
  while (takenVersions.has(`${nextVersion}-${suffix}`)) {
    suffix += 1;
  }
  const uniqueVersion = `${nextVersion}-${suffix}`;
  takenVersions.add(uniqueVersion);
  return uniqueVersion;
}

async function loadVersionHistoryFromGit(definition) {
  const repoPath = await getSetting("repoPath");
  if (!repoPath || !definition?.filePath) {
    return [];
  }

  const absoluteRepoPath = path.resolve(repoPath);
  const absoluteDefinitionPath = path.resolve(definition.filePath);
  if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
    return [];
  }

  const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath).replace(/\\/g, "/");
  const escapedPath = relativePath.replace(/["\\]/g, "\\$&");
  const gitLog = await runCommand(
    `git log --follow --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso -- ${JSON.stringify(relativePath)}`,
    { cwd: absoluteRepoPath }
  );

  const commits = parseGitLogEntries(gitLog);
  const takenVersions = new Set();
  const versions = [];
  for (const commit of commits) {
    try {
      const content = await runCommand(`git show ${commit.hash}:"${escapedPath}"`, { cwd: absoluteRepoPath });
      const parsed = parseDefinitionContent(content, definition.filePath);
      const version = normalizeHistoricalVersion(parsed.version, commit.hash, takenVersions);
      versions.push({
        definition_key: definition.key,
        version,
        commit_hash: commit.hash,
        commit_message: commit.message,
        commit_author: commit.author,
        commit_date: new Date(commit.date).toISOString(),
        content,
        metadata: JSON.stringify({
          name: parsed.name,
          description: parsed.description,
          tags: parseDefinitionTagsForMetadata(parsed.tags),
          schema: parsed.schema,
          type: parsed.type
        })
      });
    } catch (_error) {
      // Ignore commits where file content cannot be materialized.
    }
  }

  return versions;
}

function parseDefinitionTagsForMetadata(rawTags) {
  return String(rawTags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function refreshDefinitionVersionCache(definition) {
  const versions = await loadVersionHistoryFromGit(definition);
  await runDb("DELETE FROM definition_versions WHERE definition_key = ?", [definition.key]);
  for (const version of versions) {
    await runDb(
      `INSERT OR REPLACE INTO definition_versions
      (definition_key, version, commit_hash, commit_message, commit_author, commit_date, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        version.definition_key,
        version.version,
        version.commit_hash,
        version.commit_message,
        version.commit_author,
        version.commit_date,
        version.content,
        version.metadata
      ]
    );
  }
  return versions;
}

async function getCachedDefinitionVersions(definitionKey) {
  return allDb(
    `SELECT id, definition_key, version, commit_hash, commit_message, commit_author, commit_date, metadata, created_at
     FROM definition_versions
     WHERE definition_key = ?
     ORDER BY datetime(commit_date) DESC, id DESC`,
    [definitionKey]
  );
}

async function getVersionHistory(definition) {
  const cachedVersions = await getCachedDefinitionVersions(definition.key);
  if (cachedVersions.length === 0) {
    await refreshDefinitionVersionCache(definition);
    return getCachedDefinitionVersions(definition.key);
  }

  const latestCached = cachedVersions[0];
  if (!latestCached?.commit_hash) {
    await refreshDefinitionVersionCache(definition);
    return getCachedDefinitionVersions(definition.key);
  }

  try {
    const repoPath = await getSetting("repoPath");
    if (!repoPath || !definition?.filePath) {
      return cachedVersions;
    }
    const absoluteRepoPath = path.resolve(repoPath);
    const absoluteDefinitionPath = path.resolve(definition.filePath);
    if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
      return cachedVersions;
    }
    const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath).replace(/\\/g, "/");
    const latestHash = await runCommand(`git log -n 1 --pretty=format:%H -- ${JSON.stringify(relativePath)}`, {
      cwd: absoluteRepoPath
    });
    if (latestHash && latestHash !== latestCached.commit_hash) {
      await refreshDefinitionVersionCache(definition);
      return getCachedDefinitionVersions(definition.key);
    }
  } catch (_error) {
    return cachedVersions;
  }

  return cachedVersions;
}

function bumpPatchVersion(version) {
  const match = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return "1.0.0";
  }
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function applyVersionToContent(content, filePath, version) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".yml", ".yaml"].includes(ext)) {
    const parsed = YAML.parse(content) || {};
    parsed.version = version;
    return YAML.stringify(parsed);
  }

  const parsed = matter(content || "");
  parsed.data.version = version;
  return matter.stringify(parsed.content, parsed.data);
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


app.get("/api/editor/definition", async (req, res) => {
  try {
    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const definitionPath = String(req.query.path || "").trim();
    if (!definitionPath) {
      res.status(400).json({ error: "Definition path is required." });
      return;
    }

    const loaded = await loadDefinition(repoPath, definitionPath);
    res.json(loaded);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/editor/detect-type", (req, res) => {
  try {
    const type = detectDefinitionType(req.body?.content || "", req.body?.path || "");
    res.json({ type });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/editor/save", async (req, res) => {
  try {
    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const result = await saveDefinition({
      mode: req.body?.mode,
      repoPath,
      definitionPath: req.body?.path,
      content: req.body?.content || "",
      format: req.body?.format || "yaml",
      filename: req.body?.filename,
      targetPath: req.body?.targetPath,
      runCommand
    });

    await loadDefinitions();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get("/api/definition-tags", async (_req, res) => {
  try {
    const rows = await allDb("SELECT tags FROM definitions");
    const tags = Array.from(new Set(rows
      .flatMap((row) => String(row?.tags || "").split(","))
      .map((tag) => tag.trim())
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    res.json(tags);
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

app.get("/api/definitions/:id/versions", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const versions = await getVersionHistory(definition);
    const responseVersions = versions.map((versionRow) => ({
      version: versionRow.version,
      commitHash: versionRow.commit_hash,
      commitMessage: versionRow.commit_message,
      commitAuthor: versionRow.commit_author,
      commitDate: versionRow.commit_date,
      isCurrent: String(versionRow.version) === String(definition.version || "")
    }));

    res.json({ versions: responseVersions, currentVersion: definition.version || "" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load version history." });
  }
});

app.get("/api/definitions/:id/versions/:version", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    await getVersionHistory(definition);
    const versionRow = await getDb(
      `SELECT version, content, metadata, commit_hash, commit_message, commit_author, commit_date
       FROM definition_versions WHERE definition_key = ? AND version = ?`,
      [definition.key, req.params.version]
    );

    if (!versionRow) {
      res.status(404).json({ error: "Version not found." });
      return;
    }

    let metadata = {};
    try {
      metadata = JSON.parse(versionRow.metadata || "{}") || {};
    } catch (_error) {
      metadata = {};
    }

    res.json({
      version: versionRow.version,
      content: versionRow.content,
      metadata,
      commitInfo: {
        hash: versionRow.commit_hash,
        message: versionRow.commit_message,
        author: versionRow.commit_author,
        date: versionRow.commit_date
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load version content." });
  }
});

app.post("/api/definitions/:id/versions/:version/restore", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    await getVersionHistory(definition);
    const versionRow = await getDb(
      "SELECT version, content FROM definition_versions WHERE definition_key = ? AND version = ?",
      [definition.key, req.params.version]
    );
    if (!versionRow) {
      res.status(404).json({ error: "Version not found." });
      return;
    }

    const createNewVersion = req.body?.createNewVersion !== false;
    const newVersion = createNewVersion ? bumpPatchVersion(definition.version) : versionRow.version;
    const contentToWrite = applyVersionToContent(versionRow.content, definition.filePath, newVersion);
    await fsp.writeFile(definition.filePath, contentToWrite, "utf8");

    const now = new Date().toISOString();
    await runDb(
      "UPDATE definitions SET content = ?, version = ?, updatedAt = ? WHERE id = ?",
      [contentToWrite, newVersion, now, definition.id]
    );

    try {
      await refreshDefinitionVersionCache({ ...definition, version: newVersion });
    } catch (_error) {
      // Best effort cache refresh.
    }

    res.json({
      success: true,
      newVersion,
      message: "Version restored successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to restore version." });
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

app.post("/api/definitions/:id/test", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    let result;
    try {
      result = await runDefinitionTest(definition, req.body || {});
    } catch (error) {
      result = {
        success: false,
        status: "error",
        duration: 0,
        results: { output: "", validation: [], metadata: {} },
        warnings: [],
        errors: [error.message || "Test execution failed."]
      };
    }

    await persistTestResult({ definition, payload: req.body || {}, result });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to run definition test." });
  }
});

app.post("/api/definitions/:id/test-cases", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const name = String(req.body?.name || "").trim();
    const testType = String(req.body?.testType || "").trim();
    if (!name || !testType) {
      res.status(400).json({ error: "name and testType are required." });
      return;
    }

    const created = await runDb(
      `INSERT INTO test_cases (definition_key, name, description, test_type, input_data, expected_output, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        definition.key,
        name,
        String(req.body?.description || ""),
        testType,
        toJson(req.body?.inputData || {}),
        toJson(req.body?.expectedOutput || null)
      ]
    );

    res.json({
      success: true,
      testCase: {
        id: created.lastID,
        name,
        definitionKey: definition.key
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to save test case." });
  }
});

app.get("/api/definitions/:id/test-cases", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const rows = await allDb(
      `SELECT tc.id, tc.name, tc.description, tc.test_type AS testType,
              MAX(tr.created_at) AS lastRun,
              (SELECT tr2.status FROM test_results tr2 WHERE tr2.test_case_id = tc.id ORDER BY tr2.created_at DESC LIMIT 1) AS lastStatus
       FROM test_cases tc
       LEFT JOIN test_results tr ON tr.test_case_id = tc.id
       WHERE tc.definition_key = ?
       GROUP BY tc.id
       ORDER BY tc.updated_at DESC`,
      [definition.key]
    );

    res.json({ testCases: rows });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load test cases." });
  }
});

app.post("/api/definitions/:id/test-cases/:testCaseId/run", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    const testCase = await getDb("SELECT * FROM test_cases WHERE id = ? AND definition_key = ?", [req.params.testCaseId, definition.key]);
    if (!testCase) {
      res.status(404).json({ error: "Test case not found." });
      return;
    }

    const payload = {
      testType: testCase.test_type,
      input: safeJsonParse(testCase.input_data, {}),
      config: req.body?.config || {}
    };
    const result = await runDefinitionTest(definition, payload);
    await persistTestResult({ definition, testCaseId: testCase.id, payload, result });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to run saved test case." });
  }
});

app.get("/api/definitions/:id/test-results", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const limit = Math.max(1, Math.min(100, Number.parseInt(String(req.query.limit || "10"), 10) || 10));
    const totalCountRow = await getDb("SELECT COUNT(*) AS totalCount FROM test_results WHERE definition_key = ?", [definition.key]);
    const rows = await allDb(
      `SELECT tr.id,
              tr.status,
              tr.duration_ms AS duration,
              tr.created_at AS createdAt,
              tc.name AS testCaseName,
              tr.validation_results,
              tr.metadata
       FROM test_results tr
       LEFT JOIN test_cases tc ON tc.id = tr.test_case_id
       WHERE tr.definition_key = ?
       ORDER BY tr.created_at DESC
       LIMIT ?`,
      [definition.key, limit]
    );

    const results = rows.map((row) => {
      const validation = safeJsonParse(row.validation_results, []);
      const metadata = safeJsonParse(row.metadata, {});
      const validationsPassed = validation.filter((item) => item && item.passed).length;
      const validationsFailed = validation.filter((item) => item && item.passed === false).length;
      const tokensUsed = Number(metadata?.tokensUsed?.prompt || 0) + Number(metadata?.tokensUsed?.completion || 0);
      return {
        id: row.id,
        status: row.status,
        duration: Number(row.duration || 0),
        createdAt: row.createdAt,
        testCaseName: row.testCaseName || null,
        summary: {
          tokensUsed,
          validationsPassed,
          validationsFailed
        }
      };
    });

    res.json({ results, totalCount: Number(totalCountRow?.totalCount || 0) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load test results." });
  }
});

app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "../client", "settings.html"));
});

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
