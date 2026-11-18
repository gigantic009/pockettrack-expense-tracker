
require("dotenv").config?.();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("Set JWT_SECRET in .env to a random string of at least 32 characters.");
  process.exit(1);
}

// Database setup
const dataDir = path.join(__dirname, "data");
const databasePath = process.env.POCKETTRACK_DB_PATH || path.join(dataDir, "pockettrack.sqlite");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(
  fs.readFileSync(
    path.join(__dirname, "database", "schema.sql"),
    "utf8"
  )
);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'none'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "1100kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Reject cross-origin state-changing API requests to reduce cookie-based CSRF risk.
function sameOriginApiGuard(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");

  if (fetchSite === "cross-site" || !origin) {
    return res.status(403).json({
      error: "Cross-origin or origin-less requests are not allowed."
    });
  }

  try {
    const parsedOrigin = new URL(origin);
    const requestHost = req.get("host");

    if (
      parsedOrigin.origin === "null" ||
      parsedOrigin.host !== requestHost ||
      parsedOrigin.protocol !== (req.secure ? "https:" : "http:")
    ) {
      return res.status(403).json({
        error: "Request origin is not allowed."
      });
    }
  } catch {
    return res.status(403).json({
      error: "Invalid request origin."
    });
  }

  next();
}

app.use("/api", sameOriginApiGuard);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const publicUser = u => ({
  id: u.id,
  name: u.name,
  email: u.email
});

const {
  isValidTransactionDate,
  isValidAmount,
  isValidDescription,
  isValidTransactionType
} = require("./lib/validation");

// Authentication middleware
function auth(req, res, next) {
  const token = req.cookies.pt_session;

  if (!token) {
    return res.status(401).json({
      error: "Please log in."
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "pockettrack",
      audience: "pockettrack-web"
    });

    const session = db.prepare(`
      SELECT id FROM sessions
      WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?
    `).get(payload.sessionId, payload.userId, new Date().toISOString());
    if (!session) {
      return res.status(401).json({ error: "Session has been revoked or expired." });
    }

    const user = db
      .prepare("SELECT id, name, email FROM users WHERE id = ?")
      .get(payload.userId);

    if (!user) {
      return res.status(401).json({
        error: "Account not found."
      });
    }

    req.user = user;
    next();

  } catch {
    return res.status(401).json({
      error: "Session expired. Please log in again."
    });
  }
}

// Default categories
const defaults = {
  expense: [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Education",
    "Health",
    "Entertainment",
    "Other"
  ],

  income: [
    "Salary",
    "Allowance",
    "Freelance",
    "Scholarship",
    "Gift",
    "Other"
  ]
};

function seedCategories(userId) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO categories(user_id, name, type) VALUES (?, ?, ?)"
  );

  const seed = db.transaction(() => {
    for (const [type, names] of Object.entries(defaults)) {
      for (const name of names) {
        insert.run(userId, name, type);
      }
    }
  });

  seed();
}

// Create login session

// Calculate the user's available balance. An optional transaction ID is excluded
// when validating an edit, so the transaction's old value is not counted.
function getAvailableBalance(userId, excludedTransactionId = null) {
  const row = excludedTransactionId === null
    ? db.prepare(`
        SELECT COALESCE(SUM(
          CASE WHEN type = 'income' THEN amount ELSE -amount END
        ), 0) AS balance
        FROM transactions
        WHERE user_id = ?
      `).get(userId)
    : db.prepare(`
        SELECT COALESCE(SUM(
          CASE WHEN type = 'income' THEN amount ELSE -amount END
        ), 0) AS balance
        FROM transactions
        WHERE user_id = ? AND id != ?
      `).get(userId, excludedTransactionId);

  return row.balance;
}

function issueSession(user, res) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + cookieOptions.maxAge).toISOString();
  db.prepare("INSERT INTO sessions(id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(sessionId, user.id, new Date().toISOString(), expiresAt);
  const token = jwt.sign(
    { userId: user.id, sessionId },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "7d",
      issuer: "pockettrack",
      audience: "pockettrack-web"
    }
  );

  res.cookie("pt_session", token, cookieOptions);
}

// REGISTER
app.post("/api/auth/register", registrationLimiter, (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({
      error: "Name must be 2–60 characters."
    });
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return res.status(400).json({
      error: "Enter a valid email address."
    });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      error: "Password must be 8–72 characters."
    });
  }

  try {
    const hash = bcrypt.hashSync(password, 12);

    const result = db
      .prepare(
        "INSERT INTO users(name, email, password_hash) VALUES (?, ?, ?)"
      )
      .run(name, email, hash);

    const user = db
      .prepare("SELECT id, name, email FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    seedCategories(user.id);
    issueSession(user, res);

    res.status(201).json({
      user: publicUser(user)
    });

  } catch (e) {
    if (String(e.code).includes("SQLITE_CONSTRAINT_UNIQUE")) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    console.error(e);

    res.status(500).json({
      error: "Could not create account."
    });
  }
});

// LOGIN
app.post("/api/auth/login", loginLimiter, (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      error: "Incorrect email or password."
    });
  }

  issueSession(user, res);

  res.json({
    user: publicUser(user)
  });
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies.pt_session;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"], issuer: "pockettrack", audience: "pockettrack-web"
      });
      if (payload.sessionId) {
        db.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
          .run(payload.sessionId, payload.userId);
      }
    } catch { /* Clearing the browser cookie remains safe for expired tokens. */ }
  }
  res.clearCookie("pt_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });

  res.json({ ok: true });
});

// CURRENT USER
app.get("/api/auth/me", auth, (req, res) => {
  res.json({
    user: publicUser(req.user)
  });
});


app.get("/api/auth/sessions", auth, (req, res) => {
  const sessions = db.prepare(`
    SELECT id, created_at, expires_at FROM sessions
    WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC
  `).all(req.user.id, new Date().toISOString());
  res.json({ sessions });
});

app.delete("/api/auth/sessions/:id", auth, (req, res) => {
  const result = db.prepare(`
    UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND revoked_at IS NULL
  `).run(String(req.params.id), req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Active session not found." });
  res.json({ ok: true });
});

app.post("/api/auth/logout-all", auth, (req, res) => {
  db.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL")
    .run(req.user.id);
  res.clearCookie("pt_session", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/"
  });
  res.json({ ok: true });
});

// GET CATEGORIES
app.get("/api/categories", auth, (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, type FROM categories WHERE user_id = ? ORDER BY type, name"
    )
    .all(req.user.id);

  res.json({
    categories: rows
  });
});

// GET TRANSACTIONS
app.get("/api/transactions", auth, (req, res) => {
  const month = String(req.query.month || "");

  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({
      error: "Invalid month."
    });
  }

  const rows = month
    ? db.prepare(`
        SELECT id, description, amount, type, category,
               transaction_date AS date
        FROM transactions
        WHERE user_id = ?
          AND substr(transaction_date, 1, 7) = ?
        ORDER BY transaction_date DESC, id DESC
      `).all(req.user.id, month)

    : db.prepare(`
        SELECT id, description, amount, type, category,
               transaction_date AS date
        FROM transactions
        WHERE user_id = ?
        ORDER BY transaction_date DESC, id DESC
      `).all(req.user.id);

  res.json({
    transactions: rows
  });
});

// ADD TRANSACTION
app.post("/api/transactions", auth, (req, res) => {
  const {
    description,
    amount,
    type,
    category,
    date
  } = req.body;

  const cleanDescription = String(description || "").trim();
  const cleanCategory = String(category || "").trim();
  const value = Number(amount);

  if (!isValidDescription(cleanDescription)) {
    return res.status(400).json({
      error: "Description is required (maximum 100 characters)."
    });
  }

  if (!isValidAmount(value)) {
    return res.status(400).json({
      error: "Enter a valid positive amount."
    });
  }

  if (!isValidTransactionType(type)) {
    return res.status(400).json({
      error: "Invalid transaction type."
    });
  }

  if (!isValidTransactionDate(date)) {
    return res.status(400).json({
      error: "Enter a valid date. Future dates are not allowed."
    });
  }

  const allowed = db
    .prepare(
      "SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = ?"
    )
    .get(req.user.id, cleanCategory, type);

  if (!allowed) {
    return res.status(400).json({
      error: "Choose a category belonging to your account."
    });
  }

  if (type === "expense" && value > getAvailableBalance(req.user.id)) {
    return res.status(400).json({
      error: "Insufficient balance. You cannot spend more than your available balance."
    });
  }

  const result = db.prepare(`
    INSERT INTO transactions(
      user_id,
      description,
      amount,
      type,
      category,
      transaction_date
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    cleanDescription,
    value,
    type,
    cleanCategory,
    date
  );

  const transaction = db.prepare(`
    SELECT id, description, amount, type, category,
           transaction_date AS date
    FROM transactions
    WHERE id = ? AND user_id = ?
  `).get(result.lastInsertRowid, req.user.id);

  res.status(201).json({
    transaction
  });
});

// EDIT TRANSACTION
app.put("/api/transactions/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const {
    description,
    amount,
    type,
    category,
    date
  } = req.body;

  const cleanDescription = String(description || "").trim();
  const cleanCategory = String(category || "").trim();
  const value = Number(amount);

  if (
    !Number.isInteger(id) ||
    !isValidDescription(cleanDescription) ||
    !isValidAmount(value) ||
    !isValidTransactionType(type) ||
    !isValidTransactionDate(date)
  ) {
    return res.status(400).json({
      error: "Please check the transaction details. Future dates are not allowed."
    });
  }

  const allowed = db
    .prepare(
      "SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = ?"
    )
    .get(req.user.id, cleanCategory, type);

  if (!allowed) {
    return res.status(400).json({
      error: "Choose a category belonging to your account."
    });
  }

  if (type === "expense" && value > getAvailableBalance(req.user.id, id)) {
    return res.status(400).json({
      error: "Insufficient balance. You cannot spend more than your available balance."
    });
  }

  const result = db.prepare(`
    UPDATE transactions
    SET description = ?,
        amount = ?,
        type = ?,
        category = ?,
        transaction_date = ?
    WHERE id = ? AND user_id = ?
  `).run(
    cleanDescription,
    value,
    type,
    cleanCategory,
    date,
    id,
    req.user.id
  );

  if (!result.changes) {
    return res.status(404).json({
      error: "Transaction not found."
    });
  }

  res.json({
    ok: true
  });
});

// DELETE TRANSACTION
app.delete("/api/transactions/:id", auth, (req, res) => {
  const result = db
    .prepare(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?"
    )
    .run(Number(req.params.id), req.user.id);

  if (!result.changes) {
    return res.status(404).json({
      error: "Transaction not found."
    });
  }

  res.json({
    ok: true
  });
});

// DASHBOARD SUMMARY
app.get("/api/summary", auth, (req, res) => {
  const month = String(req.query.month || "");

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({
      error: "Invalid month."
    });
  }

  const all = db.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE user_id = ?
    GROUP BY type
  `).all(req.user.id);

  const current = db.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE user_id = ?
      AND substr(transaction_date, 1, 7) = ?
    GROUP BY type
  `).all(req.user.id, month);

  const byCategory = db.prepare(`
    SELECT category, SUM(amount) AS total
    FROM transactions
    WHERE user_id = ?
      AND substr(transaction_date, 1, 7) = ?
      AND type = 'expense'
    GROUP BY category
    ORDER BY total DESC
  `).all(req.user.id, month);

  const value = (rows, type) =>
    rows.find(x => x.type === type)?.total || 0;

  const totalIncome = value(all, "income");
  const totalExpense = value(all, "expense");

  const income = value(current, "income");
  const expense = value(current, "expense");

  res.json({
    balance: totalIncome - totalExpense,
    income,
    expense,
    savingsRate: income
      ? Math.round(((income - expense) / income) * 100)
      : 0,
    byCategory
  });
});


const { parseCsv, serializeTransactions } = require("./lib/csv");

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
}
function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
}
function advanceDate(value, frequency) {
  const date = new Date(value + "T00:00:00Z");
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const day = date.getUTCDate();
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function inspectImportRows(userId, csvText) {
  const rows = parseCsv(csvText);
  const valid = [];
  const errors = [];
  const duplicates = [];
  const seen = new Set();
  for (const row of rows) {
    const key = JSON.stringify([row.description, row.amount, row.type, row.category, row.date]);
    if (seen.has(key)) { duplicates.push({ row: row.rowNumber, reason: "Duplicate row in this file." }); continue; }
    seen.add(key);
    const category = db.prepare(
      "SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = ?"
    ).get(userId, row.category, row.type);
    const issues = [];
    if (!isValidDescription(row.description)) issues.push("Invalid description.");
    if (!isValidAmount(row.amount)) issues.push("Invalid positive amount.");
    if (!isValidTransactionType(row.type)) issues.push("Type must be income or expense.");
    if (!isValidTransactionDate(row.date)) issues.push("Date must be valid and not in the future.");
    if (!category) issues.push("Category does not belong to this account.");
    if (issues.length) errors.push({ row: row.rowNumber, issues });
    else {
      const exists = db.prepare(`
        SELECT 1 FROM transactions
        WHERE user_id = ? AND description = ? AND amount = ? AND type = ?
          AND category = ? AND transaction_date = ?
      `).get(userId, row.description, row.amount, row.type, row.category, row.date);
      if (exists) duplicates.push({ row: row.rowNumber, reason: "Already imported." });
      else valid.push(row);
    }
  }
  return { rows, valid, errors, duplicates };
}

// Export only the authenticated user's records. Spreadsheet formulas are neutralized.
app.get("/api/transactions/export.csv", auth, (req, res) => {
  const month = String(req.query.month || "");
  if (month && !validMonth(month)) return res.status(400).json({ error: "Invalid month." });
  const rows = month
    ? db.prepare(`SELECT description, amount, type, category, transaction_date AS date
        FROM transactions WHERE user_id = ? AND substr(transaction_date, 1, 7) = ?
        ORDER BY transaction_date, id`).all(req.user.id, month)
    : db.prepare(`SELECT description, amount, type, category, transaction_date AS date
        FROM transactions WHERE user_id = ? ORDER BY transaction_date, id`).all(req.user.id);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="pockettrack-transactions.csv"');
  res.send("\\uFEFF" + serializeTransactions(rows));
});

app.post("/api/transactions/import/preview", auth, (req, res) => {
  try {
    const result = inspectImportRows(req.user.id, req.body.csv);
    res.json({
      totalRows: result.rows.length,
      validRows: result.valid.length,
      duplicateRows: result.duplicates.length,
      invalidRows: result.errors.length,
      errors: result.errors,
      duplicates: result.duplicates,
      preview: result.valid.slice(0, 20)
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not parse CSV." });
  }
});

app.post("/api/transactions/import", auth, (req, res) => {
  try {
    const result = inspectImportRows(req.user.id, req.body.csv);
    if (result.errors.length) {
      return res.status(422).json({
        error: "Import rejected. Fix invalid rows and preview again.",
        imported: 0,
        errors: result.errors,
        duplicates: result.duplicates
      });
    }
    const insertRows = db.transaction(rows => {
      const insert = db.prepare(`
        INSERT INTO transactions(user_id, description, amount, type, category, transaction_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const row of rows) {
        insert.run(req.user.id, row.description, row.amount, row.type, row.category, row.date);
      }
    });
    insertRows(result.valid);
    res.status(201).json({
      imported: result.valid.length,
      skippedDuplicates: result.duplicates.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not import CSV." });
  }
});

// Monthly category budgets. All records are scoped to the authenticated account.
app.get("/api/budgets", auth, (req, res) => {
  const month = String(req.query.month || "");
  if (!validMonth(month)) return res.status(400).json({ error: "A valid month=YYYY-MM is required." });
  const budgets = db.prepare(`
    SELECT b.id, b.category, b.month, b.amount,
      COALESCE(SUM(t.amount), 0) AS spent
    FROM budgets b
    LEFT JOIN transactions t
      ON t.user_id = b.user_id AND t.category = b.category
      AND t.type = 'expense' AND substr(t.transaction_date, 1, 7) = b.month
    WHERE b.user_id = ? AND b.month = ?
    GROUP BY b.id
    ORDER BY b.category
  `).all(req.user.id, month).map(row => ({
    ...row,
    remaining: Math.round((row.amount - row.spent) * 100) / 100,
    percentUsed: Math.round((row.spent / row.amount) * 100)
  }));
  res.json({ budgets });
});

app.post("/api/budgets", auth, (req, res) => {
  const category = String(req.body.category || "").trim();
  const month = String(req.body.month || "");
  const amount = Number(req.body.amount);
  if (!validMonth(month) || !category || !Number.isFinite(amount) || amount <= 0 || amount > 100000000000) {
    return res.status(400).json({ error: "Provide a valid expense category, month, and positive budget amount." });
  }
  const owned = db.prepare("SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = 'expense'")
    .get(req.user.id, category);
  if (!owned) return res.status(400).json({ error: "Choose an expense category belonging to your account." });
  db.prepare(`
    INSERT INTO budgets(user_id, category, month, amount) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category, month)
    DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, category, month, amount);
  res.status(201).json({ ok: true });
});

app.delete("/api/budgets/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid budget ID." });
  const result = db.prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").run(id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Budget not found." });
  res.json({ ok: true });
});

// Recurring rules are user-triggered: running a rule creates due transactions once.
// No background job silently moves money or mutates a user's ledger.
app.get("/api/recurring-rules", auth, (req, res) => {
  const rules = db.prepare(`
    SELECT id, description, amount, type, category, frequency, start_date,
      next_run_date, end_date, active
    FROM recurring_rules WHERE user_id = ? ORDER BY next_run_date, id
  `).all(req.user.id);
  res.json({ rules });
});

app.post("/api/recurring-rules", auth, (req, res) => {
  const description = String(req.body.description || "").trim();
  const amount = Number(req.body.amount);
  const type = String(req.body.type || "");
  const category = String(req.body.category || "").trim();
  const frequency = String(req.body.frequency || "");
  const startDate = String(req.body.startDate || "");
  const endDate = req.body.endDate ? String(req.body.endDate) : null;
  if (!isValidDescription(description) || !isValidAmount(amount) ||
      !isValidTransactionType(type) || !["weekly", "monthly"].includes(frequency) ||
      !validIsoDate(startDate) || (endDate && (!validIsoDate(endDate) || endDate < startDate))) {
    return res.status(400).json({ error: "Invalid recurring transaction details." });
  }
  const owned = db.prepare("SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = ?")
    .get(req.user.id, category, type);
  if (!owned) return res.status(400).json({ error: "Choose a category belonging to your account." });
  const result = db.prepare(`
    INSERT INTO recurring_rules(user_id, description, amount, type, category, frequency,
      start_date, next_run_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, description, amount, type, category, frequency, startDate, startDate, endDate);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete("/api/recurring-rules/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid rule ID." });
  const result = db.prepare("DELETE FROM recurring_rules WHERE id = ? AND user_id = ?").run(id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Recurring rule not found." });
  res.json({ ok: true });
});

app.post("/api/recurring-rules/:id/run", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid rule ID." });
  const rule = db.prepare("SELECT * FROM recurring_rules WHERE id = ? AND user_id = ? AND active = 1")
    .get(id, req.user.id);
  if (!rule) return res.status(404).json({ error: "Active recurring rule not found." });
  const today = require("./lib/validation").todayInIndia();
  const createDue = db.transaction(() => {
    let next = rule.next_run_date;
    let created = 0;
    let iterations = 0;
    let blockedByBalance = false;
    while (next <= today && (!rule.end_date || next <= rule.end_date) && iterations < 120) {
      if (rule.type === "expense" && rule.amount > getAvailableBalance(req.user.id)) {
        blockedByBalance = true;
        break;
      }
      const existing = db.prepare("SELECT 1 FROM recurring_occurrences WHERE rule_id = ? AND scheduled_date = ?")
        .get(rule.id, next);
      if (!existing) {
        const tx = db.prepare(`
          INSERT INTO transactions(user_id, description, amount, type, category, transaction_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user.id, rule.description, rule.amount, rule.type, rule.category, next);
        db.prepare(`
          INSERT INTO recurring_occurrences(rule_id, user_id, scheduled_date, transaction_id)
          VALUES (?, ?, ?, ?)
        `).run(rule.id, req.user.id, next, tx.lastInsertRowid);
        created += 1;
      }
      next = advanceDate(next, rule.frequency);
      iterations += 1;
    }
    const stillActive = !rule.end_date || next <= rule.end_date;
    db.prepare("UPDATE recurring_rules SET next_run_date = ?, active = ? WHERE id = ? AND user_id = ?")
      .run(next, stillActive ? 1 : 0, rule.id, req.user.id);
    return { created, nextRunDate: next, active: stillActive, blockedByBalance };
  });
  res.json(createDue());
});

// FRONTEND
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// START SERVER when run directly. Exporting the app allows isolated API tests.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `PocketTrack running at http://localhost:${PORT}`
    );
  });
}

module.exports = { app, db };