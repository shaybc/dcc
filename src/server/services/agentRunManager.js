import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const MAX_LOG_ENTRIES = 2000;
const STUCK_TIMEOUT_MS = 120000;

function nowIso() {
  return new Date().toISOString();
}

function normalizeStatus(run) {
  if (!run) return "unknown";
  if (run.status === "running") {
    const lastActivityAt = run.lastActivityAt ? Date.parse(run.lastActivityAt) : NaN;
    if (Number.isFinite(lastActivityAt) && Date.now() - lastActivityAt > STUCK_TIMEOUT_MS) {
      return "stuck";
    }
  }
  return run.status;
}

function detectCnExecutable(cwd) {
  const binDir = path.join(cwd, "node_modules", ".bin");
  const candidates = process.platform === "win32"
    ? ["cn.cmd", "cn.exe", "cn"]
    : ["cn", "cn.sh"];

  for (const candidate of candidates) {
    const fullPath = path.join(binDir, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return path.join(binDir, process.platform === "win32" ? "cn.cmd" : "cn");
}

function buildArgs({ configPath, prompt, agentPath }) {
  const args = ["--config", configPath];
  const normalizedPrompt = String(prompt || "").trim();
  if (normalizedPrompt) {
    args.push("-p", normalizedPrompt);
  }
  args.push("--agent", agentPath, "--verbose");
  return args;
}

class AgentRunManager {
  constructor() {
    this.runs = new Map();
    this.subscribers = new Map();
    this.sequence = 0;
  }

  startRun({ projectPath, agentPath, configPath, prompt }) {
    const runId = `run_${Date.now()}_${++this.sequence}`;
    const createdAt = nowIso();
    const commandPath = detectCnExecutable(process.cwd());
    const args = buildArgs({ configPath, prompt, agentPath });

    const run = {
      runId,
      projectPath,
      agentPath,
      configPath,
      prompt: String(prompt || ""),
      commandPath,
      args,
      command: `${commandPath} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`,
      pid: null,
      status: "preparing_to_launch",
      createdAt,
      startedAt: null,
      endedAt: null,
      exitCode: null,
      signal: null,
      lastActivityAt: createdAt,
      logs: []
    };

    this.runs.set(runId, run);

    const child = spawn(commandPath, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false
    });

    run.pid = child.pid || null;
    run.status = "launched";
    run.startedAt = nowIso();
    this.publish(runId, { type: "status", status: run.status, pid: run.pid, startedAt: run.startedAt });

    child.on("spawn", () => {
      run.status = "running";
      run.lastActivityAt = nowIso();
      this.publish(runId, { type: "status", status: run.status, pid: run.pid });
    });

    child.stdout?.on("data", (chunk) => {
      this.pushLog(runId, "stdout", chunk);
    });

    child.stderr?.on("data", (chunk) => {
      this.pushLog(runId, "stderr", chunk);
    });

    child.on("error", (error) => {
      run.status = "failed";
      run.endedAt = nowIso();
      run.lastActivityAt = run.endedAt;
      this.pushLog(runId, "stderr", `Failed to launch process: ${error.message}\n`);
      this.publish(runId, {
        type: "status",
        status: run.status,
        endedAt: run.endedAt,
        error: error.message
      });
    });

    child.on("close", (exitCode, signal) => {
      run.exitCode = Number.isInteger(exitCode) ? exitCode : null;
      run.signal = signal || null;
      run.endedAt = nowIso();
      run.lastActivityAt = run.endedAt;
      if (run.status !== "failed") {
        if (signal) {
          run.status = "killed";
        } else {
          run.status = "terminated";
        }
      }
      this.publish(runId, {
        type: "status",
        status: run.status,
        exitCode: run.exitCode,
        signal: run.signal,
        endedAt: run.endedAt
      });
    });

    run.child = child;
    return this.getRunSnapshot(runId);
  }

  getRunSnapshot(runId) {
    const run = this.runs.get(runId);
    if (!run) return null;
    return {
      runId: run.runId,
      pid: run.pid,
      status: normalizeStatus(run),
      projectPath: run.projectPath,
      agentPath: run.agentPath,
      configPath: run.configPath,
      prompt: run.prompt,
      commandPath: run.commandPath,
      args: run.args,
      command: run.command,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      lastActivityAt: run.lastActivityAt,
      exitCode: run.exitCode,
      signal: run.signal
    };
  }

  getRunLogs(runId, { since = 0 } = {}) {
    const run = this.runs.get(runId);
    if (!run) return null;
    const normalizedSince = Number.isFinite(Number(since)) ? Number(since) : 0;
    const entries = run.logs.filter((entry) => entry.seq > normalizedSince);
    return {
      runId,
      nextSince: run.logs.length ? run.logs[run.logs.length - 1].seq : normalizedSince,
      entries
    };
  }

  subscribe(runId, callback) {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, new Set());
    }
    this.subscribers.get(runId).add(callback);
    return () => {
      const group = this.subscribers.get(runId);
      if (!group) return;
      group.delete(callback);
      if (!group.size) this.subscribers.delete(runId);
    };
  }

  killRun(runId) {
    const run = this.runs.get(runId);
    if (!run || !run.child) return false;
    const killed = run.child.kill("SIGTERM");
    return Boolean(killed);
  }

  pushLog(runId, stream, chunk) {
    const run = this.runs.get(runId);
    if (!run) return;

    const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || "");
    if (!text) return;

    run.lastActivityAt = nowIso();
    const seq = run.logs.length ? run.logs[run.logs.length - 1].seq + 1 : 1;
    const entry = { seq, stream, text, timestamp: run.lastActivityAt };
    run.logs.push(entry);
    if (run.logs.length > MAX_LOG_ENTRIES) {
      run.logs.splice(0, run.logs.length - MAX_LOG_ENTRIES);
    }

    this.publish(runId, { type: "log", ...entry });
  }

  publish(runId, message) {
    const listeners = this.subscribers.get(runId);
    if (!listeners?.size) return;
    for (const listener of listeners) {
      listener(message);
    }
  }
}

export const agentRunManager = new AgentRunManager();

export function buildAgentRunArgs(input) {
  return buildArgs(input);
}
