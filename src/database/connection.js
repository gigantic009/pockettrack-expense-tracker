const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const env = require("../config/env");

function createDatabase(databasePath = env.databasePath || path.join(process.cwd(), "data", "pockettrack.sqlite")) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const schemaPath = path.join(process.cwd(), "database", "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  return db;
}

module.exports = { createDatabase };
