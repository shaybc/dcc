import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve(process.cwd(), "log");
const MAX_BYTES = 50 * 1024 * 1024;
let currentStream = null;
let currentDate = null;
let currentSize = 0;

function formatDate(now) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function formatTime(now) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}.${mm}`;
}

function openStream(now) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const datePart = formatDate(now);
  const timePart = formatTime(now);
  const filename = `dcc_${datePart}_${timePart}.log`;
  const filepath = path.join(LOG_DIR, filename);
  currentStream = fs.createWriteStream(filepath, { flags: "a" });
  currentDate = datePart;
  currentSize = 0;
}

function rotateIfNeeded(entryBytes, now) {
  const datePart = formatDate(now);
  const needsDateRotate = currentDate && datePart !== currentDate;
  const needsSizeRotate = currentStream && currentSize + entryBytes > MAX_BYTES;
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
  rotateIfNeeded(Buffer.byteLength(entry), now);
  currentSize += Buffer.byteLength(entry);
  currentStream.write(entry);
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
