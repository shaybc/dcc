import path from "path";
import fs from "fs";
import sqliteUV from "sqlite3";

const __dirname = import.meta.dirname;
const sqlite3 = sqliteUV.verbose();
const DB_PATH = process.env.DCC_DB_PATH || path.join(__dirname, "../../../data", "dcc.sqlite");
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  );
  db.run(
    "INSERT INTO settings (key, value) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = ?)",
    ["maxRecommendedDefinitions", "8", "maxRecommendedDefinitions"]
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS asset_repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      remoteUrl TEXT NOT NULL,
      localPath TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      name TEXT,
      description TEXT,
      tags TEXT,
      schema TEXT,
      version TEXT,
      content TEXT,
      type TEXT,
      filePath TEXT,
      source TEXT,
      repoId INTEGER,
      repoName TEXT,
      inTeam INTEGER DEFAULT 0,
      status TEXT,
      updatedAt TEXT
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS definition_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition_key TEXT NOT NULL,
      version TEXT NOT NULL,
      commit_hash TEXT,
      commit_message TEXT,
      commit_author TEXT,
      commit_date TEXT,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (definition_key) REFERENCES definitions(key),
      UNIQUE(definition_key, version)
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_def_versions_key ON definition_versions(definition_key)");
  db.run("CREATE INDEX IF NOT EXISTS idx_def_versions_commit ON definition_versions(commit_hash)");
  db.run(
    `CREATE TABLE IF NOT EXISTS dev_project_roots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS dev_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE,
      projectType TEXT,
      corePlatform TEXT,
      detectedSignals TEXT,
      projectTechnologies TEXT,
      lastScannedAt TEXT
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS project_definition_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectPath TEXT NOT NULL,
      definitionKey TEXT NOT NULL,
      copiedAt TEXT,
      UNIQUE(projectPath, definitionKey)
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS project_definition_destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectPath TEXT NOT NULL,
      definitionKey TEXT NOT NULL,
      destination TEXT NOT NULL,
      copiedAt TEXT,
      UNIQUE(projectPath, definitionKey, destination)
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_project_definition_destinations_project ON project_definition_destinations(projectPath)");
  db.run("CREATE INDEX IF NOT EXISTS idx_project_definition_destinations_definition ON project_definition_destinations(definitionKey)");
  db.run(
    `INSERT OR IGNORE INTO project_definition_destinations (projectPath, definitionKey, destination, copiedAt)
     SELECT projectPath, definitionKey, 'continue', copiedAt FROM project_definition_copies`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS validation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition_key TEXT NOT NULL,
      definition_version TEXT,
      status TEXT NOT NULL,
      duration_ms INTEGER,
      report_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (definition_key) REFERENCES definitions(key)
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_validation_results_def_key ON validation_results(definition_key)");
  db.run("CREATE INDEX IF NOT EXISTS idx_validation_results_created ON validation_results(created_at)");

  db.all("PRAGMA table_info(definitions)", (err, rows = []) => {
    if (err) {
      return;
    }
    const hasTagsColumn = rows.some((row) => row.name === "tags");
    if (!hasTagsColumn) {
      db.run("ALTER TABLE definitions ADD COLUMN tags TEXT", () => {});
    }
    const hasRepoIdColumn = rows.some((row) => row.name === "repoId");
    if (!hasRepoIdColumn) {
      db.run("ALTER TABLE definitions ADD COLUMN repoId INTEGER", () => {});
    }
    const hasRepoNameColumn = rows.some((row) => row.name === "repoName");
    if (!hasRepoNameColumn) {
      db.run("ALTER TABLE definitions ADD COLUMN repoName TEXT", () => {});
    }

    db.run("CREATE INDEX IF NOT EXISTS idx_definitions_repo_id ON definitions(repoId)", () => {});
    db.run("CREATE INDEX IF NOT EXISTS idx_definitions_repo_name ON definitions(repoName)", () => {});
    db.run("CREATE INDEX IF NOT EXISTS idx_definitions_source_repo ON definitions(source, repoId)", () => {});
  });

  db.all("PRAGMA table_info(dev_projects)", (err, rows = []) => {
    if (err) {
      return;
    }
    const hasProjectTypeColumn = rows.some((row) => row.name === "projectType");
    if (!hasProjectTypeColumn) {
      db.run("ALTER TABLE dev_projects ADD COLUMN projectType TEXT", () => {});
    }
    const hasDetectedSignalsColumn = rows.some((row) => row.name === "detectedSignals");
    if (!hasDetectedSignalsColumn) {
      db.run("ALTER TABLE dev_projects ADD COLUMN detectedSignals TEXT", () => {});
    }
    const hasCorePlatformColumn = rows.some((row) => row.name === "corePlatform");
    if (!hasCorePlatformColumn) {
      db.run("ALTER TABLE dev_projects ADD COLUMN corePlatform TEXT", () => {});
    }
    const hasProjectTechnologiesColumn = rows.some((row) => row.name === "projectTechnologies");
    if (!hasProjectTechnologiesColumn) {
      db.run("ALTER TABLE dev_projects ADD COLUMN projectTechnologies TEXT", () => {});
    }
    const hasLastScannedAtColumn = rows.some((row) => row.name === "lastScannedAt");
    if (!hasLastScannedAtColumn) {
      db.run("ALTER TABLE dev_projects ADD COLUMN lastScannedAt TEXT", () => {});
    }
  });

  db.run("DELETE FROM project_definition_destinations WHERE destination IS NULL OR trim(destination) = ''", () => {});
});

export default db;
