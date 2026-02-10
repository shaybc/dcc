import { getDb, runDb } from "../db/helpers.js";

export async function getSetting(key) {
  const row = await getDb("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  await runDb(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}
