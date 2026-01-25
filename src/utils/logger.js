export function logInfo(msg, meta = undefined) {
  if (meta) console.log(`[INFO] ${msg}`, meta);
  else console.log(`[INFO] ${msg}`);
}

export function logWarn(msg, meta = undefined) {
  if (meta) console.warn(`[WARN] ${msg}`, meta);
  else console.warn(`[WARN] ${msg}`);
}

export function logError(msg, meta = undefined) {
  if (meta) console.error(`[ERROR] ${msg}`, meta);
  else console.error(`[ERROR] ${msg}`);
}
