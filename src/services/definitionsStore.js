import crypto from "crypto";
import { getDb } from "../db/sqlite.js";

export function clearDefinitions() {
  const db = getDb();
  db.prepare("DELETE FROM definitions").run();
}

export function insertDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    return { inserted: 0 };
  }
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO definitions (id, type, name, source, content)
    VALUES (@id, @type, @name, @source, @content)
  `);
  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => {
      insert.run({
        id: row.id || crypto.randomUUID(),
        type: row.type,
        name: row.name,
        source: row.source,
        content: row.content
      });
    });
  });
  insertMany(definitions);
  return { inserted: definitions.length };
}

export function listDefinitions() {
  const db = getDb();
  return db.prepare(`
    SELECT name, source
    FROM definitions
    ORDER BY name
  `).all();
}
