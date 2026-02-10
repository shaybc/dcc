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
