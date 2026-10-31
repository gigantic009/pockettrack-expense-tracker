const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Database = require("better-sqlite3");

const projectDir = path.join(__dirname, "..");
const databasePath = process.env.POCKETTRACK_DB_PATH
  ? path.resolve(process.env.POCKETTRACK_DB_PATH)
  : path.join(projectDir, "data", "pockettrack.sqlite");
const backupDir = path.join(projectDir, "backups");
const RETENTION_COUNT = 7;

async function main() {
  if (!fs.existsSync(databasePath)) {
    throw new Error(
      `Database not found at ${databasePath}. Start PocketTrack once or set POCKETTRACK_DB_PATH.`
    );
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const backupPath = path.join(
    backupDir,
    `pockettrack-${timestamp}.sqlite`
  );

  const source = new Database(databasePath, { readonly: true });
  let backupCreated = false;

  try {
    await source.backup(backupPath);
    backupCreated = true;

    const verification = new Database(backupPath, { readonly: true });
    let integrity;
    let userCount;
    let transactionCount;

    try {
      integrity = verification.pragma("integrity_check", { simple: true });
      userCount = verification.prepare("SELECT COUNT(*) AS count FROM users").get().count;
      transactionCount = verification
        .prepare("SELECT COUNT(*) AS count FROM transactions")
        .get().count;
    } finally {
      verification.close();
    }

    if (integrity !== "ok") {
      throw new Error(`Backup integrity check failed: ${integrity}`);
    }

    const backups = fs.readdirSync(backupDir)
      .filter(name => /^pockettrack-\d{8}T\d{6}Z\.sqlite$/.test(name))
      .sort()
      .reverse();

    for (const oldBackup of backups.slice(RETENTION_COUNT)) {
      fs.unlinkSync(path.join(backupDir, oldBackup));
      console.log(`Removed old backup: ${oldBackup}`);
    }

    console.log("Backup created and verified successfully.");
    console.log(`File: ${backupPath}`);
    console.log(`Integrity: ${integrity}`);
    console.log(`Users: ${userCount}`);
    console.log(`Transactions: ${transactionCount}`);
    console.log(`Retention: latest ${RETENTION_COUNT} timestamped backups`);
  } catch (error) {
    if (backupCreated && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    throw error;
  } finally {
    source.close();
  }
}

main().catch(error => {
  console.error("Database backup failed:", error.message);
  process.exitCode = 1;
});
