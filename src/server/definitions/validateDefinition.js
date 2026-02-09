import matter from "gray-matter";
import YAML from "yaml";
import { z } from "zod";

function inferFormat(filePath, content) {
  const normalizedPath = String(filePath || "").toLowerCase();
  if (normalizedPath.endsWith(".md") || normalizedPath.endsWith(".markdown")) return "markdown";
  if (normalizedPath.endsWith(".yaml") || normalizedPath.endsWith(".yml")) return "yaml";
  if (normalizedPath.endsWith(".json")) return "json";

  const raw = String(content || "").trim();
  if (raw.startsWith("---")) return "markdown";
  if (raw.startsWith("{") || raw.startsWith("[")) return "json";
  return "yaml";
}

function addCheck(checks, check) {
  checks.push({
    id: check.id,
    category: check.category,
    severity: check.severity,
    passed: Boolean(check.passed),
    message: check.message,
    path: check.path || "",
    location: check.location || null,
  });
}

function schemaForType(type, strict) {
  const base = {
    name: z.string().min(1, "name is required"),
    dcc_uri: z.string().min(1, "dcc_uri is required"),
    description: z.string().min(1, "description is required"),
  };
  const commonMetadata = {
    version: z.string().min(1).optional(),
    schema: z.string().min(1).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    invokable: z.boolean().optional(),
    key: z.string().optional(),
    type: z.string().optional(),
  };
  const passthrough = strict ? "strict" : "passthrough";
  const applyMode = (schema) => (passthrough === "strict" ? schema.strict() : schema.passthrough());

  if (type === "prompts") {
    return applyMode(z.object({ ...base, ...commonMetadata, prompt: z.string().optional(), messages: z.array(z.any()).optional() }));
  }
  if (type === "rules") {
    return applyMode(z.object({ ...base, ...commonMetadata }));
  }
  if (type === "workflows") {
    return applyMode(z.object({ ...base, ...commonMetadata, steps: z.array(z.object({ id: z.string().min(1).optional() })).min(1) }));
  }
  if (type === "agents") {
    return applyMode(z.object({ ...base, ...commonMetadata }));
  }
  if (type === "models") {
    return applyMode(z.object({ ...base, ...commonMetadata, provider: z.string().optional(), model: z.string().optional() }));
  }
  if (type === "context") {
    return applyMode(z.object({ ...base, ...commonMetadata, provider: z.string().optional() }));
  }
  if (type === "mcpservers") {
    return applyMode(z.object({ ...base, ...commonMetadata, transport: z.string().optional(), tools: z.array(z.any()).optional() }));
  }
  return applyMode(z.object({ ...base, ...commonMetadata }));
}

function lintCommon(rawSource, checks) {
  const text = String(rawSource || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  let trailingSpaces = 0;

  lines.forEach((line, idx) => {
    if (/\s+$/.test(line)) {
      trailingSpaces += 1;
      addCheck(checks, {
        id: "lint.trailing-spaces",
        category: "lint",
        severity: "warning",
        passed: false,
        message: "Line has trailing whitespace.",
        path: "source",
        location: { line: idx + 1, col: line.length },
      });
    }
  });

  if (!text.trim()) {
    addCheck(checks, {
      id: "lint.empty-content",
      category: "lint",
      severity: "error",
      passed: false,
      message: "Definition content is empty.",
      path: "source",
    });
  }

  const placeholderMatch = text.match(/\b(TODO|TBD|lorem ipsum)\b/i);
  if (placeholderMatch) {
    addCheck(checks, {
      id: "lint.placeholder",
      category: "lint",
      severity: "warning",
      passed: false,
      message: `Suspicious placeholder found: ${placeholderMatch[0]}`,
      path: "source",
    });
  }

  if (!trailingSpaces) {
    addCheck(checks, {
      id: "lint.trailing-spaces",
      category: "lint",
      severity: "info",
      passed: true,
      message: "No trailing whitespace detected.",
      path: "source",
    });
  }
}

function lintMarkdown(markdownBody, checks) {
  const lines = String(markdownBody || "").replace(/\r\n/g, "\n").split("\n");
  let previousHeading = 0;
  let fenceCount = 0;

  lines.forEach((line, idx) => {
    const heading = line.match(/^(#{1,6})\s+/);
    if (heading) {
      const level = heading[1].length;
      if (previousHeading && level > previousHeading + 1) {
        addCheck(checks, {
          id: "lint.markdown.heading-order",
          category: "lint",
          severity: "warning",
          passed: false,
          message: "Heading levels should not skip levels.",
          path: "body",
          location: { line: idx + 1, col: 1 },
        });
      }
      previousHeading = level;
    }

    if (/^```/.test(line.trim())) {
      fenceCount += 1;
    }
  });

  if (fenceCount % 2 !== 0) {
    addCheck(checks, {
      id: "lint.markdown.code-fence",
      category: "lint",
      severity: "error",
      passed: false,
      message: "Markdown code fences are not balanced.",
      path: "body",
    });
  } else {
    addCheck(checks, {
      id: "lint.markdown.code-fence",
      category: "lint",
      severity: "info",
      passed: true,
      message: "Markdown code fences are balanced.",
      path: "body",
    });
  }
}

function checkReferenceExists(reference, knownDefinitions, expectedTypes) {
  if (!reference) return true;
  const candidate = String(reference).trim();
  if (!candidate) return true;
  const match = knownDefinitions.find((item) => {
    if (item.key === candidate || item.name === candidate) {
      return expectedTypes.length === 0 || expectedTypes.includes(item.type);
    }
    return false;
  });
  return Boolean(match);
}

function runReferenceChecks(definition, normalized, knownDefinitions, checks) {
  const type = String(definition.type || "").toLowerCase();

  const addRefFailure = (id, message, path) => {
    addCheck(checks, {
      id,
      category: "reference",
      severity: "warning",
      passed: false,
      message,
      path,
    });
  };

  if (type === "workflows") {
    const steps = Array.isArray(normalized.steps) ? normalized.steps : [];
    const seenStepIds = new Set();
    steps.forEach((step, index) => {
      const stepId = String(step?.id || "").trim();
      if (stepId) {
        if (seenStepIds.has(stepId)) {
          addRefFailure("reference.workflow.duplicate-step-id", `Duplicate workflow step id '${stepId}'.`, `steps[${index}].id`);
        }
        seenStepIds.add(stepId);
      }
      const promptRef = step?.prompt || step?.promptKey || step?.promptId;
      if (!checkReferenceExists(promptRef, knownDefinitions, ["prompts"])) {
        addRefFailure("reference.workflow.prompt", `Workflow step references unknown prompt '${promptRef}'.`, `steps[${index}]`);
      }
      const toolRef = step?.tool || step?.toolName;
      if (!checkReferenceExists(toolRef, knownDefinitions, ["mcpservers"])) {
        addRefFailure("reference.workflow.tool", `Workflow step references unknown tool/server '${toolRef}'.`, `steps[${index}]`);
      }
    });
  }

  if (type === "agents") {
    const refs = [
      ...(Array.isArray(normalized.rules) ? normalized.rules.map((value) => ({ value, types: ["rules"], key: "rules" })) : []),
      ...(Array.isArray(normalized.prompts) ? normalized.prompts.map((value) => ({ value, types: ["prompts"], key: "prompts" })) : []),
      ...(Array.isArray(normalized.models) ? normalized.models.map((value) => ({ value, types: ["models"], key: "models" })) : []),
      ...(Array.isArray(normalized.context) ? normalized.context.map((value) => ({ value, types: ["context"], key: "context" })) : []),
    ];

    refs.forEach((ref, index) => {
      if (!checkReferenceExists(ref.value, knownDefinitions, ref.types)) {
        addRefFailure("reference.agent.missing", `Agent references unknown ${ref.key} value '${ref.value}'.`, `${ref.key}[${index}]`);
      }
    });
  }

  if (type === "prompts") {
    const modelRef = normalized.model || normalized.modelId;
    if (!checkReferenceExists(modelRef, knownDefinitions, ["models"])) {
      addRefFailure("reference.prompt.model", `Prompt references unknown model '${modelRef}'.`, "model");
    }
  }

  if (checks.filter((item) => item.category === "reference" && !item.passed).length === 0) {
    addCheck(checks, {
      id: "reference.summary",
      category: "reference",
      severity: "info",
      passed: true,
      message: "No reference issues detected.",
      path: "",
    });
  }
}

function summarizeChecks(checks) {
  return checks.reduce((summary, check) => {
    if (check.passed) {
      summary.infos += 1;
      return summary;
    }
    if (check.severity === "error") {
      summary.errors += 1;
      return summary;
    }
    if (check.severity === "warning") {
      summary.warnings += 1;
      return summary;
    }
    summary.infos += 1;
    return summary;
  }, { errors: 0, warnings: 0, infos: 0 });
}

export function validateDefinition({ definition, options = {}, knownDefinitions = [] }) {
  const startedAt = Date.now();
  const strict = Boolean(options.strict);
  const lintEnabled = options.lint !== false;
  const referencesEnabled = options.references !== false;

  const checks = [];
  const rawContent = String(definition.content || "");
  const format = inferFormat(definition.filePath, rawContent);
  let normalized = {};
  let markdownBody = "";

  try {
    if (format === "markdown") {
      const parsed = matter(rawContent);
      normalized = parsed.data || {};
      markdownBody = parsed.content || "";
    } else if (format === "json") {
      normalized = JSON.parse(rawContent || "{}");
    } else {
      normalized = YAML.parse(rawContent || "") || {};
    }
  } catch (error) {
    addCheck(checks, {
      id: "schema.parse",
      category: "schema",
      severity: "error",
      passed: false,
      message: `Unable to parse definition: ${error.message}`,
      path: "source",
    });
  }

  const schema = schemaForType(String(definition.type || "").toLowerCase(), strict);
  const schemaResult = schema.safeParse(normalized);

  if (!schemaResult.success) {
    schemaResult.error.issues.forEach((issue) => {
      addCheck(checks, {
        id: `schema.${issue.code}`,
        category: "schema",
        severity: "error",
        passed: false,
        message: issue.message,
        path: issue.path.join("."),
      });
    });
  } else {
    addCheck(checks, {
      id: "schema.valid",
      category: "schema",
      severity: "info",
      passed: true,
      message: "Schema validation passed.",
      path: "",
    });
  }

  if (lintEnabled) {
    lintCommon(rawContent, checks);
    if (format === "markdown") {
      lintMarkdown(markdownBody, checks);
      if (!markdownBody.trim()) {
        addCheck(checks, {
          id: "lint.markdown.empty-body",
          category: "lint",
          severity: "warning",
          passed: false,
          message: "Markdown definition body is empty.",
          path: "body",
        });
      }
    }

    if (!normalized.name) {
      addCheck(checks, {
        id: "lint.best-practice.name",
        category: "lint",
        severity: "warning",
        passed: false,
        message: "Missing recommended 'name' field.",
        path: "name",
      });
    }
    if (!normalized.description) {
      addCheck(checks, {
        id: "lint.best-practice.description",
        category: "lint",
        severity: "warning",
        passed: false,
        message: "Missing recommended 'description' field.",
        path: "description",
      });
    }
  }

  if (referencesEnabled) {
    runReferenceChecks(definition, normalized, knownDefinitions, checks);
  }

  const summary = summarizeChecks(checks);
  const status = summary.errors > 0 ? "failure" : summary.warnings > 0 ? "warning" : "success";

  return {
    success: true,
    status,
    definitionKey: definition.key,
    definitionType: String(definition.type || ""),
    durationMs: Date.now() - startedAt,
    summary,
    checks,
    normalized: {
      format,
      parsed: normalized,
    },
  };
}
