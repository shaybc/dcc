import { RUN_OPTION_FLAG_MAP } from "./constants.js";

export function normalizeRunOptions(runOptions = {}) {
  return {
    verbose: Boolean(runOptions.verbose),
    readonly: Boolean(runOptions.readonly),
    denyRead: Boolean(runOptions.denyRead),
    denyList: Boolean(runOptions.denyList),
    denySearch: Boolean(runOptions.denySearch),
    denyFetch: Boolean(runOptions.denyFetch),
    denyDiff: Boolean(runOptions.denyDiff),
    allowWrite: Boolean(runOptions.allowWrite),
    allowEdit: Boolean(runOptions.allowEdit),
    allowMultiEdit: Boolean(runOptions.allowMultiEdit),
    allowTerminal: Boolean(runOptions.allowTerminal),
    allowOnly: Array.isArray(runOptions.allowOnly)
      ? runOptions.allowOnly.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [],
    denyTerminalCommands: Array.isArray(runOptions.denyTerminalCommands)
      ? runOptions.denyTerminalCommands.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [],
    promptInput: String(runOptions.promptInput || ""),
    promptWasAutofilled: Boolean(runOptions.promptWasAutofilled)
  };
}

export function buildArgs({ configPath, prompt, agentPath, runOptions = {} }) {
  const args = ["--config", configPath];
  const normalizedPrompt = String(prompt || "").trim();
  if (normalizedPrompt) {
    args.push("-p", normalizedPrompt);
  }
  args.push("--agent", agentPath);

  if (runOptions.verbose) args.push("--verbose");
  if (runOptions.readonly) args.push("--readonly");
  for (const [optionKey, flag, value] of RUN_OPTION_FLAG_MAP) {
    if (runOptions[optionKey]) {
      args.push(flag, value);
    }
  }

  for (const allowPattern of Array.isArray(runOptions.allowOnly) ? runOptions.allowOnly : []) {
    const normalizedPattern = String(allowPattern || "").trim();
    if (!normalizedPattern) continue;
    args.push("--allow", `Write(**/${normalizedPattern})`);
  }

  const deniedCommands = Array.isArray(runOptions.denyTerminalCommands) ? runOptions.denyTerminalCommands : [];
  if (deniedCommands.length) {
    if (!runOptions.allowTerminal) args.push("--allow", "Bash(*)");
    for (const command of deniedCommands) {
      const normalizedCommand = String(command || "").trim();
      if (!normalizedCommand) continue;
      args.push("--exclude", `Bash(${normalizedCommand}*)`);
    }
  }

  return args;
}
