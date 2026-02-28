import fs from "fs";
import path from "path";

export function detectCnExecutable(cwd) {
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

function quoteWindowsArg(value) {
  const text = String(value || "");
  if (!text) return '""';
  if (!(/[\s"&|<>^()]/u.test(text))) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function quotePosixArg(value) {
  const text = String(value || "");
  if (!text) return "''";
  if (!(/[\s"'`$&|;<>()[\]{}*?]/u.test(text))) return text;
  return `'${text.replace(/'/g, `"'"'`)}'`;
}

function formatLaunchedCommand(commandPath, args) {
  if (process.platform === "win32") {
    return `${commandPath} ${args.map((arg) => quoteWindowsArg(arg)).join(" ")}`.trim();
  }
  return `${commandPath} ${args.map((arg) => quotePosixArg(arg)).join(" ")}`.trim();
}

function formatLaunchWithCwd(commandLine, launchCwd) {
  const normalizedCwd = String(launchCwd || "").trim();
  if (!normalizedCwd) return commandLine;

  if (process.platform === "win32") {
    return `cd /d ${quoteWindowsArg(normalizedCwd)} && ${commandLine}`;
  }
  return `cd ${quotePosixArg(normalizedCwd)} && ${commandLine}`;
}

export function createSpawnSpec(commandPath, args, dccRootPath, launchCwd = "") {
  const isWindowsCmd = process.platform === "win32" && /\.cmd$/i.test(commandPath);
  if (isWindowsCmd) {
    const nodeEntrypointPath = path.join(dccRootPath, "node_modules", "@continuedev", "cli", "dist", "cn.js");
    if (fs.existsSync(nodeEntrypointPath)) {
      const commandLine = formatLaunchedCommand(process.execPath, [nodeEntrypointPath, ...args]);
      return {
        command: process.execPath,
        args: [nodeEntrypointPath, ...args],
        shell: false,
        launchMode: "windows_node_entrypoint",
        launchedCommand: formatLaunchWithCwd(commandLine, launchCwd)
      };
    }

    const cmdExe = process.env.comspec || "cmd.exe";
    const commandLine = `${quoteWindowsArg(commandPath)} ${args.map((arg) => quoteWindowsArg(arg)).join(" ")}`.trim();
    return {
      command: cmdExe,
      args: ["/d", "/s", "/c", commandLine],
      shell: false,
      launchMode: "windows_cmd_exe",
      launchedCommand: formatLaunchWithCwd(`${cmdExe} /d /s /c ${commandLine}`, launchCwd)
    };
  }

  const commandLine = formatLaunchedCommand(commandPath, args);

  return {
    command: commandPath,
    args,
    shell: false,
    launchMode: "direct_exec",
    launchedCommand: formatLaunchWithCwd(commandLine, launchCwd)
  };
}
