import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { allDb, runDb } from "../db/helpers.js";
import { logError, logInfo, logWarn } from "../utils/logger.js";

const MAX_LOG_ENTRIES = 2000;
const STUCK_TIMEOUT_MS = 120000;

function nowIso() {
  return new Date().toISOString();
}

function normalizeRunOptions(runOptions = {}) {
  return {
    verbose: Boolean(runOptions.verbose),
    readonly: Boolean(runOptions.readonly),
    allowWrite: Boolean(runOptions.allowWrite),
    allowEdit: Boolean(runOptions.allowEdit),
    allowMultiEdit: Boolean(runOptions.allowMultiEdit),
    allowOnly: Array.isArray(runOptions.allowOnly)
      ? runOptions.allowOnly.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [],
    denyTerminalCommands: Array.isArray(runOptions.denyTerminalCommands)
      ? runOptions.denyTerminalCommands.map((entry) => String(entry || "").trim()).filter(Boolean)
      : []
  };
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

function buildArgs({ configPath, prompt, agentPath, runOptions = {} }) {
  const args = ["--config", configPath];
  const normalizedPrompt = String(prompt || "").trim();
  if (normalizedPrompt) {
    args.push("-p", normalizedPrompt);
  }
  args.push("--agent", agentPath);

  if (runOptions.verbose) args.push("--verbose");
  if (runOptions.readonly) args.push("--readonly");
  if (runOptions.allowWrite) args.push("--allow", "Write");
  if (runOptions.allowEdit) args.push("--allow", "Edit");
  if (runOptions.allowMultiEdit) args.push("--allow", "MultiEdit");

  for (const allowPattern of Array.isArray(runOptions.allowOnly) ? runOptions.allowOnly : []) {
    const normalizedPattern = String(allowPattern || "").trim();
    if (!normalizedPattern) continue;
    args.push("--allow", `Write(**/${normalizedPattern})`);
  }

  const deniedCommands = Array.isArray(runOptions.denyTerminalCommands) ? runOptions.denyTerminalCommands : [];
  if (deniedCommands.length) {
    args.push("--allow", "Bash");
    for (const command of deniedCommands) {
      const normalizedCommand = String(command || "").trim();
      if (!normalizedCommand) continue;
      args.push("--exclude", `Bash(${normalizedCommand}*)`);
    }
  }

  return args;
}

function quoteWindowsArg(value) {
  const text = String(value || "");
  if (!text) return '""';
  if (!/[\s"&|<>^()]/u.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function quotePosixArg(value) {
  const text = String(value || "");
  if (!text) return "''";
  if (!/[\s"'`$&|;<>()[\]{}*?]/u.test(text)) return text;
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

function formatLaunchedCommand(commandPath, args) {
  if (process.platform === "win32") {
    return `${commandPath} ${args.map((arg) => quoteWindowsArg(arg)).join(" ")}`.trim();
  }
  return `${commandPath} ${args.map((arg) => quotePosixArg(arg)).join(" ")}`.trim();
}

function createSpawnSpec(commandPath, args, dccRootPath) {
  const isWindowsCmd = process.platform === "win32" && /\.cmd$/i.test(commandPath);
  if (isWindowsCmd) {
    const nodeEntrypointPath = path.join(dccRootPath, "node_modules", "@continuedev", "cli", "dist", "cn.js");
    if (fs.existsSync(nodeEntrypointPath)) {
      return {
        command: process.execPath,
        args: [nodeEntrypointPath, ...args],
        shell: false,
        launchMode: "windows_node_entrypoint",
        launchedCommand: formatLaunchedCommand(process.execPath, [nodeEntrypointPath, ...args])
      };
    }

    const cmdExe = process.env.comspec || "cmd.exe";
    const commandLine = `${quoteWindowsArg(commandPath)} ${args.map((arg) => quoteWindowsArg(arg)).join(" ")}`.trim();
    return {
      command: cmdExe,
      args: ["/d", "/s", "/c", commandLine],
      shell: false,
      launchMode: "windows_cmd_exe",
      launchedCommand: `${cmdExe} /d /s /c ${commandLine}`
    };
  }

  return {
    command: commandPath,
    args,
    shell: false,
    launchMode: "direct_exec",
    launchedCommand: formatLaunchedCommand(commandPath, args)
  };
}

class AgentRunManager {
  constructor() {
    this.runs = new Map();
    this.subscribers = new Map();
    this.sequence = 0;
    this.persistenceQueue = Promise.resolve();
    this.supportsRunOptionsJson = true;
    this.restorePersistedRuns();
  }

  queuePersistence(work) {
    this.persistenceQueue = this.persistenceQueue
      .then(() => work())
      .catch((error) => {
        logError("Failed to persist agent run state", { error: error.message });
      });
    return this.persistenceQueue;
  }

  async restorePersistedRuns() {
    try {
      let rows = [];
      try {
        rows = await allDb(
          `SELECT runId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
                  createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes,
                  runOptionsJson
           FROM agent_runs
           ORDER BY createdAt ASC`
        );
      } catch (error) {
        if (!String(error?.message || "").includes("runOptionsJson")) {
          throw error;
        }
        rows = await allDb(
          `SELECT runId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
                  createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes
           FROM agent_runs
           ORDER BY createdAt ASC`
        );
      }

      for (const row of rows) {
        let parsedArgs = [];
        try {
          parsedArgs = JSON.parse(row.argsJson || "[]");
          if (!Array.isArray(parsedArgs)) {
            parsedArgs = [];
          }
        } catch {
          parsedArgs = [];
        }

        let parsedRunOptions = {};
        try {
          parsedRunOptions = JSON.parse(row.runOptionsJson || "{}");
        } catch {
          parsedRunOptions = {};
        }

        const run = {
          runId: row.runId,
          projectPath: row.projectPath,
          agentPath: row.agentPath,
          configPath: row.configPath,
          prompt: String(row.prompt || ""),
          commandPath: row.commandPath,
          args: parsedArgs,
          command: row.command,
          commandLine: row.commandLine || row.command,
          pid: Number.isInteger(row.pid) ? row.pid : null,
          status: row.status,
          createdAt: row.createdAt,
          startedAt: row.startedAt,
          endedAt: row.endedAt,
          exitCode: Number.isInteger(row.exitCode) ? row.exitCode : null,
          signal: row.signal,
          lastActivityAt: row.lastActivityAt,
          emittedStdoutBytes: Number(row.emittedStdoutBytes || 0),
          emittedStderrBytes: Number(row.emittedStderrBytes || 0),
          runOptions: normalizeRunOptions(parsedRunOptions),
          logs: []
        };

        if (["running", "launched", "preparing_to_launch"].includes(run.status)) {
          run.status = "terminated";
          run.endedAt = run.endedAt || nowIso();
          run.lastActivityAt = run.endedAt;
          run.signal = run.signal || "server_restart";
          run.exitCode = Number.isInteger(run.exitCode) ? run.exitCode : null;
        }

        const logs = await allDb(
          `SELECT seq, stream, text, timestamp
           FROM agent_run_logs
           WHERE runId = ?
           ORDER BY seq ASC`,
          [run.runId]
        );
        run.logs = logs;
        this.runs.set(run.runId, run);
      }

      if (this.runs.size) {
        logInfo("Restored persisted agent runs", { count: this.runs.size });
      }

      for (const run of this.runs.values()) {
        if (run.signal === "server_restart") {
          this.persistRun(run);
        }
      }
    } catch (error) {
      logError("Unable to restore persisted agent runs", { error: error.message });
    }
  }

  persistRun(run) {
    if (!run?.runId) return;
    const persistWithRunOptionsColumn = () => runDb(
      `INSERT INTO agent_runs (
        runId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
        createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes,
        runOptionsJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(runId) DO UPDATE SET
        projectPath = excluded.projectPath,
        agentPath = excluded.agentPath,
        configPath = excluded.configPath,
        prompt = excluded.prompt,
        commandPath = excluded.commandPath,
        argsJson = excluded.argsJson,
        command = excluded.command,
        commandLine = excluded.commandLine,
        pid = excluded.pid,
        status = excluded.status,
        createdAt = excluded.createdAt,
        startedAt = excluded.startedAt,
        endedAt = excluded.endedAt,
        lastActivityAt = excluded.lastActivityAt,
        exitCode = excluded.exitCode,
        signal = excluded.signal,
        emittedStdoutBytes = excluded.emittedStdoutBytes,
        emittedStderrBytes = excluded.emittedStderrBytes,
        runOptionsJson = excluded.runOptionsJson`,
      [
        run.runId,
        run.projectPath,
        run.agentPath,
        run.configPath,
        String(run.prompt || ""),
        run.commandPath || null,
        JSON.stringify(Array.isArray(run.args) ? run.args : []),
        run.command || null,
        run.commandLine || run.command || null,
        Number.isInteger(run.pid) ? run.pid : null,
        run.status,
        run.createdAt,
        run.startedAt || null,
        run.endedAt || null,
        run.lastActivityAt || null,
        Number.isInteger(run.exitCode) ? run.exitCode : null,
        run.signal || null,
        Number(run.emittedStdoutBytes || 0),
        Number(run.emittedStderrBytes || 0),
        JSON.stringify(normalizeRunOptions(run.runOptions || {}))
      ]
    );

    const persistWithoutRunOptionsColumn = () => runDb(
      `INSERT INTO agent_runs (
        runId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
        createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(runId) DO UPDATE SET
        projectPath = excluded.projectPath,
        agentPath = excluded.agentPath,
        configPath = excluded.configPath,
        prompt = excluded.prompt,
        commandPath = excluded.commandPath,
        argsJson = excluded.argsJson,
        command = excluded.command,
        commandLine = excluded.commandLine,
        pid = excluded.pid,
        status = excluded.status,
        createdAt = excluded.createdAt,
        startedAt = excluded.startedAt,
        endedAt = excluded.endedAt,
        lastActivityAt = excluded.lastActivityAt,
        exitCode = excluded.exitCode,
        signal = excluded.signal,
        emittedStdoutBytes = excluded.emittedStdoutBytes,
        emittedStderrBytes = excluded.emittedStderrBytes`,
      [
        run.runId,
        run.projectPath,
        run.agentPath,
        run.configPath,
        String(run.prompt || ""),
        run.commandPath || null,
        JSON.stringify(Array.isArray(run.args) ? run.args : []),
        run.command || null,
        run.commandLine || run.command || null,
        Number.isInteger(run.pid) ? run.pid : null,
        run.status,
        run.createdAt,
        run.startedAt || null,
        run.endedAt || null,
        run.lastActivityAt || null,
        Number.isInteger(run.exitCode) ? run.exitCode : null,
        run.signal || null,
        Number(run.emittedStdoutBytes || 0),
        Number(run.emittedStderrBytes || 0)
      ]
    );

    this.queuePersistence(async () => {
      if (!this.supportsRunOptionsJson) {
        await persistWithoutRunOptionsColumn();
        return;
      }

      try {
        await persistWithRunOptionsColumn();
      } catch (error) {
        if (!String(error?.message || "").includes("runOptionsJson")) {
          throw error;
        }
        this.supportsRunOptionsJson = false;
        await persistWithoutRunOptionsColumn();
      }
    });
  }

  persistLog(runId, entry) {
    if (!runId || !entry) return;
    this.queuePersistence(() => runDb(
      `INSERT OR REPLACE INTO agent_run_logs (runId, seq, stream, text, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [runId, entry.seq, entry.stream, entry.text, entry.timestamp]
    ));
  }

  startRun({ projectPath, agentPath, configPath, prompt, runOptions = {} }) {
    const runId = `run_${Date.now()}_${++this.sequence}`;
    const createdAt = nowIso();
    const commandPath = detectCnExecutable(process.cwd());
    const normalizedRunOptions = normalizeRunOptions(runOptions);
    const args = buildArgs({ configPath, prompt, agentPath, runOptions: normalizedRunOptions });
    const spawnSpec = createSpawnSpec(commandPath, args, process.cwd());

    const run = {
      runId,
      projectPath,
      agentPath,
      configPath,
      prompt: String(prompt || ""),
      runOptions: normalizedRunOptions,
      commandPath,
      args,
      command: spawnSpec.launchedCommand,
      commandLine: spawnSpec.launchedCommand,
      pid: null,
      status: "preparing_to_launch",
      createdAt,
      startedAt: null,
      endedAt: null,
      exitCode: null,
      signal: null,
      lastActivityAt: createdAt,
      emittedStdoutBytes: 0,
      emittedStderrBytes: 0,
      logs: []
    };

    this.runs.set(runId, run);
    this.persistRun(run);

    logInfo("Preparing agent launch", {
      runId,
      projectPath,
      agentPath,
      configPath,
      command: run.command,
      args
    });

    logInfo("Agent launch environment", {
      runId,
      commandPathExists: fs.existsSync(commandPath),
      projectPathExists: fs.existsSync(projectPath),
      launchMode: spawnSpec.launchMode,
      shell: spawnSpec.shell,
      cwd: projectPath
    });

    let child;
    try {
      child = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: projectPath,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        shell: spawnSpec.shell
      });
    } catch (error) {
      run.status = "failed";
      run.endedAt = nowIso();
      run.lastActivityAt = run.endedAt;
      this.pushLog(runId, "stderr", `Failed to launch process: ${error.message}\n`);
      this.persistRun(run);
      logError("Agent process error event", { runId, pid: run.pid, error: error.message, command: run.command });
      logError("Agent launch threw before spawn", { runId, error: error.message, command: run.command });
      return this.getRunSnapshot(runId);
    }

    run.pid = child.pid || null;
    run.status = "launched";
    run.startedAt = nowIso();
    this.persistRun(run);
    this.publish(runId, { type: "status", status: run.status, pid: run.pid, startedAt: run.startedAt });
    logInfo("Agent process launched", { runId, pid: run.pid, command: run.command });

    child.on("spawn", () => {
      run.status = "running";
      run.lastActivityAt = nowIso();
      this.persistRun(run);
      this.publish(runId, { type: "status", status: run.status, pid: run.pid });
      logInfo("Agent process running", { runId, pid: run.pid });
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
      this.persistRun(run);
      logError("Agent process error event", { runId, pid: run.pid, error: error.message, command: run.command });
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
      if (run.exitCode !== 0 || run.signal) {
        const hadNoOutput = run.emittedStdoutBytes === 0 && run.emittedStderrBytes === 0;
        this.pushLog(runId, "stderr", `Process ended with status=${run.status} exitCode=${run.exitCode} signal=${run.signal || "none"}.\n`);
        if (hadNoOutput) {
          this.pushLog(runId, "stderr", "Process produced no stdout/stderr before exit. Verify command arguments and project/config/agent file paths.\n");
        }
      }
      this.persistRun(run);
      logInfo("Agent process closed", {
        runId,
        pid: run.pid,
        status: run.status,
        exitCode: run.exitCode,
        signal: run.signal,
        emittedStdoutBytes: run.emittedStdoutBytes,
        emittedStderrBytes: run.emittedStderrBytes
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
      runOptions: normalizeRunOptions(run.runOptions || {}),
      commandPath: run.commandPath,
      args: run.args,
      command: run.command,
      commandLine: run.commandLine || run.command,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      lastActivityAt: run.lastActivityAt,
      exitCode: run.exitCode,
      signal: run.signal,
      emittedStdoutBytes: run.emittedStdoutBytes,
      emittedStderrBytes: run.emittedStderrBytes
    };
  }

  listRunSnapshots({ limit = 200 } = {}) {
    const max = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 200;
    return Array
      .from(this.runs.values())
      .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
      .slice(0, max)
      .map((run) => this.getRunSnapshot(run.runId));
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

    const bytes = Buffer.byteLength(text, "utf8");
    if (stream === "stderr") {
      run.emittedStderrBytes += bytes;
    } else {
      run.emittedStdoutBytes += bytes;
    }

    run.lastActivityAt = nowIso();
    const seq = run.logs.length ? run.logs[run.logs.length - 1].seq + 1 : 1;
    const entry = { seq, stream, text, timestamp: run.lastActivityAt };
    run.logs.push(entry);
    if (run.logs.length > MAX_LOG_ENTRIES) {
      run.logs.splice(0, run.logs.length - MAX_LOG_ENTRIES);
    }

    this.persistLog(runId, entry);
    this.persistRun(run);

    this.publish(runId, { type: "log", ...entry });

    const logFn = stream === "stderr" ? logWarn : logInfo;
    logFn("Agent process output", { runId, stream, pid: run.pid, text: text.slice(0, 4000) });
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
