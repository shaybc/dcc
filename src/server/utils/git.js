import { exec } from "child_process";

export function runCommand(command, options = {}) {
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

export function extractCommandErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || fallbackMessage || "Operation failed.");
  const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines[lines.length - 1] || fallbackMessage || message;
}

export function classifyGitError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("conflict") || message.includes("merge conflict") || message.includes("not possible to fast-forward") || message.includes("could not apply")) {
    return "conflict";
  }
  if (message.includes("permission denied") || message.includes("access denied") || message.includes("403") || message.includes("authentication failed") || message.includes("could not read from remote repository") || message.includes("not authorized") || message.includes("insufficient permission") || message.includes("write access to repository not granted") || message.includes("remote: permission")) {
    return "permission";
  }
  return "other";
}

export async function rollbackGitTransaction({
  cwd,
  run = runCommand,
  resetTo = "HEAD",
  pullRebase = false,
}) {
  if (!cwd) {
    return;
  }

  await run(`git reset --hard ${resetTo}`, { cwd });
  await run("git clean -fd", { cwd });

  if (pullRebase) {
    await run("git pull --rebase", { cwd });
  }
}

export function getUserSafeGitErrorMessage(category, {
  permissionMessage,
  conflictMessage,
  fallbackMessage,
} = {}) {
  if (category === "permission") {
    return permissionMessage || "You do not have permission to push changes to this repository.";
  }

  if (category === "conflict") {
    return conflictMessage || "The operation was cancelled because the repository has merge conflicts.";
  }

  return fallbackMessage || "Git operation failed.";
}

export async function handleGitTransactionFailure({
  error,
  cwd,
  run = runCommand,
  resetTo = "HEAD",
  pullRebase = false,
  reloadDefinitions,
  permissionMessage,
  conflictMessage,
  fallbackMessage,
}) {
  const category = classifyGitError(error);

  try {
    await rollbackGitTransaction({ cwd, run, resetTo, pullRebase });
  } catch (_rollbackError) {
    // Best-effort rollback; continue returning the original error category/message.
  }

  if (typeof reloadDefinitions === "function") {
    try {
      await reloadDefinitions();
    } catch (_reloadError) {
      // Reload is also best-effort in error handling paths.
    }
  }

  return {
    category,
    message: getUserSafeGitErrorMessage(category, {
      permissionMessage,
      conflictMessage,
      fallbackMessage: extractCommandErrorMessage(error, fallbackMessage || "Git operation failed."),
    }),
  };
}
