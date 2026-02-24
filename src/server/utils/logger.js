import fs from "fs";
import path from "path";
import { getSetting, setSetting } from "./settings.js";

const LOG_DIR = path.resolve(process.cwd(), "log");
const DEFAULT_MAX_SIZE_MB = 100;
const DEFAULT_MAX_FILES = 30;

const logFileConfig = {
  maxSizeMb: DEFAULT_MAX_SIZE_MB,
  maxFiles: DEFAULT_MAX_FILES,
};

let currentStream = null;
let currentDate = null;
let currentSize = 0;
let currentFilepath = "";

function normalizeMaxSizeMb(value, fallback = DEFAULT_MAX_SIZE_MB) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(10, Math.min(1024, Math.round(numericValue)));
}

function normalizeMaxFiles(value, fallback = DEFAULT_MAX_FILES) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(1, Math.min(365, Math.round(numericValue)));
}

function getMaxBytes() {
  return logFileConfig.maxSizeMb * 1024 * 1024;
}

function formatDate(now) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function formatTimestamp(now) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}.${mm}.${ss}`;
}

function listLogFiles() {
  if (!fs.existsSync(LOG_DIR)) return [];
  const entries = fs.readdirSync(LOG_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^dcc_\d{4}\.\d{2}\.\d{2}_\d{2}\.\d{2}(?:\.\d{2})?(?:_\d+)?\.log$/.test(entry.name))
    .map((entry) => {
      const filepath = path.join(LOG_DIR, entry.name);
      const stats = fs.statSync(filepath);
      return { name: entry.name, filepath, size: stats.size, mtimeMs: stats.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
}

function pruneLogFiles() {
  const files = listLogFiles();
  const removableFiles = files.filter((file) => file.filepath !== currentFilepath);
  const excessCount = files.length - logFileConfig.maxFiles;
  if (excessCount <= 0) return;

  for (const file of removableFiles.slice(0, excessCount)) {
    fs.unlinkSync(file.filepath);
  }
}

function findReusableFile(datePart) {
  const maxBytes = getMaxBytes();
  const files = listLogFiles();
  const sameDay = files.filter((file) => file.name.startsWith(`dcc_${datePart}_`) && file.size < maxBytes);
  if (!sameDay.length) return null;
  return sameDay[sameDay.length - 1];
}

function createNewLogFile(now) {
  const datePart = formatDate(now);
  const timestamp = formatTimestamp(now);
  let filename = `dcc_${datePart}_${timestamp}.log`;
  let filepath = path.join(LOG_DIR, filename);
  let counter = 1;

  while (fs.existsSync(filepath)) {
    filename = `dcc_${datePart}_${timestamp}_${counter}.log`;
    filepath = path.join(LOG_DIR, filename);
    counter += 1;
  }

  currentStream = fs.createWriteStream(filepath, { flags: "a" });
  currentDate = datePart;
  currentSize = 0;
  currentFilepath = filepath;
}

function openStream(now) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const datePart = formatDate(now);
  const reusable = findReusableFile(datePart);

  if (reusable) {
    currentStream = fs.createWriteStream(reusable.filepath, { flags: "a" });
    currentDate = datePart;
    currentSize = reusable.size;
    currentFilepath = reusable.filepath;
    return;
  }

  createNewLogFile(now);
  pruneLogFiles();
}

function rotateIfNeeded(entryBytes, now) {
  const datePart = formatDate(now);
  const needsDateRotate = currentDate && datePart !== currentDate;
  const needsSizeRotate = currentStream && currentSize + entryBytes > getMaxBytes();

  if (!currentStream || needsDateRotate || needsSizeRotate) {
    if (currentStream) {
      currentStream.end();
    }
    openStream(now);
  }
}

function formatEntry(level, msg, meta) {
  const metaSuffix = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${level}] ${msg}${metaSuffix}\n\n`;
}

function writeLog(level, msg, meta) {
  const now = new Date();
  const entry = formatEntry(level, msg, meta);
  const entryBytes = Buffer.byteLength(entry);
  rotateIfNeeded(entryBytes, now);
  currentSize += entryBytes;
  currentStream.write(entry);
}

export function getLoggerFileConfigSync() {
  return { ...logFileConfig };
}

export function updateLoggerFileConfig({ maxSizeMb, maxFiles } = {}) {
  if (maxSizeMb !== undefined) {
    logFileConfig.maxSizeMb = normalizeMaxSizeMb(maxSizeMb, logFileConfig.maxSizeMb);
  }
  if (maxFiles !== undefined) {
    logFileConfig.maxFiles = normalizeMaxFiles(maxFiles, logFileConfig.maxFiles);
  }
  pruneLogFiles();
  return getLoggerFileConfigSync();
}

export async function loadLoggerFileConfigFromSettings() {
  const [maxSizeMbRaw, maxFilesRaw] = await Promise.all([
    getSetting("logFileMaxSizeMb"),
    getSetting("logFileMaxFiles"),
  ]);

  updateLoggerFileConfig({
    maxSizeMb: normalizeMaxSizeMb(maxSizeMbRaw, DEFAULT_MAX_SIZE_MB),
    maxFiles: normalizeMaxFiles(maxFilesRaw, DEFAULT_MAX_FILES),
  });

  await Promise.all([
    setSetting("logFileMaxSizeMb", String(logFileConfig.maxSizeMb)),
    setSetting("logFileMaxFiles", String(logFileConfig.maxFiles)),
  ]);

  return getLoggerFileConfigSync();
}

export async function saveLoggerFileConfigToSettings({ maxSizeMb, maxFiles }) {
  const nextConfig = updateLoggerFileConfig({ maxSizeMb, maxFiles });

  await Promise.all([
    setSetting("logFileMaxSizeMb", String(nextConfig.maxSizeMb)),
    setSetting("logFileMaxFiles", String(nextConfig.maxFiles)),
  ]);

  return nextConfig;
}

export function logInfo(msg, meta = undefined) {
  writeLog("INFO", msg, meta);
}

export function logWarn(msg, meta = undefined) {
  writeLog("WARN", msg, meta);
}

export function logError(msg, meta = undefined) {
  writeLog("ERROR", msg, meta);
}
