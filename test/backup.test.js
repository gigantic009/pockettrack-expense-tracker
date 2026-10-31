const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const Database = require("better-sqlite3");

const script = path.join(__dirname, "..", "scripts", "backup-database.js");

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pockettrack-backup-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const database = path.join(root, "source.sqlite");
  const backupDir = path.join(root, "backups");
  const db = new Database(database);
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT); CREATE TABLE transactions (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL); INSERT INTO users(name,email) VALUES ('Test','test@example.com'); INSERT INTO transactions(user_id,amount) VALUES (1,125.5);");
  db.close();
  return { root, database, backupDir };
}

function run(database, backupDir) {
  return spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, POCKETTRACK_DB_PATH: database, POCKETTRACK_BACKUP_DIR: backupDir }
  });
}

test("creates a readable, verified backup with source records", t => {
  const { database, backupDir } = setup(t);
  const result = run(database, backupDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Integrity: ok/);
  assert.match(result.stdout, /Users: 1/);
  assert.match(result.stdout, /Transactions: 1/);
  const files = fs.readdirSync(backupDir).filter(name => name.endsWith(".sqlite"));
  assert.equal(files.length, 1);
  const copy = new Database(path.join(backupDir, files[0]), { readonly: true });
  assert.equal(copy.pragma("integrity_check", { simple: true }), "ok");
  assert.equal(copy.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  copy.close();
});

test("retains only the newest seven timestamped backups", t => {
  const { database, backupDir } = setup(t);
  fs.mkdirSync(backupDir);
  for (let day = 1; day <= 8; day++) {
    const stamp = "202001" + String(day).padStart(2, "0") + "T000000Z";
    fs.writeFileSync(path.join(backupDir, "pockettrack-" + stamp + ".sqlite"), "old");
  }
  const result = run(database, backupDir);
  assert.equal(result.status, 0, result.stderr);
  const files = fs.readdirSync(backupDir).filter(name => name.endsWith(".sqlite"));
  assert.equal(files.length, 7);
  assert.equal(files.some(name => name.includes("20200101T000000Z")), false);
  assert.equal(files.some(name => name.includes("20200102T000000Z")), false);
});

test("reports a missing source database without creating a backup directory", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pockettrack-backup-missing-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const backupDir = path.join(root, "backups");
  const result = run(path.join(root, "missing.sqlite"), backupDir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Database not found/);
  assert.equal(fs.existsSync(backupDir), false);
});

test("fails safely for a corrupt SQLite source", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pockettrack-backup-corrupt-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const database = path.join(root, "corrupt.sqlite");
  const backupDir = path.join(root, "backups");
  fs.writeFileSync(database, "not a SQLite database");
  const result = run(database, backupDir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Database backup failed/);
  assert.deepEqual(fs.readdirSync(backupDir), []);
});
