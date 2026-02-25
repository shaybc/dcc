import fs from "fs";
import { spawn } from "child_process";
import { allDb, runDb } from "../../db/helpers.js";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { MAX_LOG_ENTRIES, RUN_STATUS_LAUNCHING } from "./constants.js";
import { detectCnExecutable, createSpawnSpec } from "./commandLaunch.js";
import { buildArgs, normalizeRunOptions } from "./runOptions.js";
import { nowIso, normalizeStatus, parseJson, parseJsonArray } from "./utils.js";

export class AgentRunManager {
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
          `SELECT runId, agentId, configId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
                  createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes,
                  runOptionsJson
           FROM agent_runs
           ORDER BY createdAt ASC`
        );
      } catch (error) {
        const message = String(error?.message || "");
        if (!message.includes("runOptionsJson") && !message.includes("agentId") && !message.includes("configId")) {
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
        const parsedArgs = parseJsonArray(row.argsJson);
        const parsedRunOptions = parseJson(row.runOptionsJson || "{}", {});

        const run = {
          runId: row.runId,
          agentId: Number.isFinite(Number(row.agentId)) ? Number(row.agentId) : null,
          configId: Number.isFinite(Number(row.configId)) ? Number(row.configId) : null,
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

        if (RUN_STATUS_LAUNCHING.has(run.status)) {
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
    const runValues = this.buildRunPersistValues(run);
    const persistWithRunOptionsColumn = () => runDb(
      `INSERT INTO agent_runs (
        runId, agentId, configId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
        createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes,
        runOptionsJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(runId) DO UPDATE SET
        agentId = excluded.agentId,
        configId = excluded.configId,
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
      [...runValues, JSON.stringify(normalizeRunOptions(run.runOptions || {}))]
    );

    const persistWithoutRunOptionsColumn = () => runDb(
      `INSERT INTO agent_runs (
        runId, agentId, configId, projectPath, agentPath, configPath, prompt, commandPath, argsJson, command, commandLine, pid, status,
        createdAt, startedAt, endedAt, lastActivityAt, exitCode, signal, emittedStdoutBytes, emittedStderrBytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(runId) DO UPDATE SET
        agentId = excluded.agentId,
        configId = excluded.configId,
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
      runValues
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

  buildRunPersistValues(run) {
    return [
      run.runId,
      Number.isFinite(Number(run.agentId)) ? Number(run.agentId) : null,
      Number.isFinite(Number(run.configId)) ? Number(run.configId) : null,
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
    ];
  }

  markRunFailed(run, message) {
    run.status = "failed";
    run.endedAt = nowIso();
    run.lastActivityAt = run.endedAt;
    this.pushLog(run.runId, "stderr", `Failed to launch process: ${message}\n`);
    this.persistRun(run);
  }

  persistLog(runId, entry) {
    if (!runId || !entry) return;
    this.queuePersistence(() => runDb(
      `INSERT OR REPLACE INTO agent_run_logs (runId, seq, stream, text, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [runId, entry.seq, entry.stream, entry.text, entry.timestamp]
    ));
  }

  startRun({ agentId = null, configId = null, projectPath, agentPath, configPath, prompt, runOptions = {} }) {
    const runId = `run_${Date.now()}_${++this.sequence}`;
    const createdAt = nowIso();
    const commandPath = detectCnExecutable(process.cwd());
    const normalizedRunOptions = normalizeRunOptions(runOptions);
    const args = buildArgs({ configPath, prompt, agentPath, runOptions: normalizedRunOptions });
    const spawnSpec = createSpawnSpec(commandPath, args, process.cwd());

    const run = {
      runId,
      agentId: Number.isFinite(Number(agentId)) ? Number(agentId) : null,
      configId: Number.isFinite(Number(configId)) ? Number(configId) : null,
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
      this.markRunFailed(run, error.message);
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
      this.markRunFailed(run, error.message);
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
      agentId: Number.isFinite(Number(run.agentId)) ? Number(run.agentId) : null,
      configId: Number.isFinite(Number(run.configId)) ? Number(run.configId) : null,
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
