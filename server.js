require("dotenv").config?.();
const express = require("express");
const path = require("path");
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

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "pockettrack.sqlite"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(path.join(__dirname, "database", "schema.sql"), "utf8"));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
};
const publicUser = u => ({ id: u.id, name: u.name, email: u.email });

function auth(req, res, next) {
  const token = req.cookies.pt_session;
  if (!token) return res.status(401).json({ error: "Please log in." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(payload.userId);
    if (!user) return res.status(401).json({ error: "Account not found." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

const defaults = {
  expense: ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Entertainment", "Other"],
  income: ["Salary", "Allowance", "Freelance", "Scholarship", "Gift", "Other"]
};
function seedCategories(userId) {
  const insert = db.prepare("INSERT OR IGNORE INTO categories(user_id, name, type) VALUES (?, ?, ?)");
  const seed = db.transaction(() => {
    for (const [type, names] of Object.entries(defaults))
      for (const name of names) insert.run(userId, name, type);
  });
  seed();
}
function issueSession(user, res) {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("pt_session", token, cookieOptions);
}

app.post("/api/auth/register", authLimiter, (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 60) return res.status(400).json({ error: "Name must be 2–60 characters." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "Password must be 8–72 characters." });
  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare("INSERT INTO users(name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hash);
    const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(result.lastInsertRowid);
    seedCategories(user.id);
    issueSession(user, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    if (String(e.code).includes("SQLITE_CONSTRAINT_UNIQUE")) return res.status(409).json({ error: "An account with this email already exists." });
    console.error(e); res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", authLimiter, (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: "Incorrect email or password." });
  issueSession(user, res);
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("pt_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
  res.json({ ok: true });
});
app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get("/api/categories", auth, (req, res) => {
  const rows = db.prepare("SELECT id, name, type FROM categories WHERE user_id = ? ORDER BY type, name").all(req.user.id);
  res.json({ categories: rows });
});

app.get("/api/transactions", auth, (req, res) => {
  const month = String(req.query.month || "");
  if (month && !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month." });
  const rows = month
    ? db.prepare("SELECT id, description, amount, type, category, transaction_date AS date FROM transactions WHERE user_id = ? AND substr(transaction_date,1,7) = ? ORDER BY transaction_date DESC, id DESC").all(req.user.id, month)
    : db.prepare("SELECT id, description, amount, type, category, transaction_date AS date FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, id DESC").all(req.user.id);
  res.json({ transactions: rows });
});

app.post("/api/transactions", auth, (req, res) => {
  const { description, amount, type, category, date } = req.body;
  const cleanDescription = String(description || "").trim();
  const cleanCategory = String(category || "").trim();
  const value = Number(amount);
  if (!cleanDescription || cleanDescription.length > 100) return res.status(400).json({ error: "Description is required (maximum 100 characters)." });
  if (!Number.isFinite(value) || value <= 0 || value > 1000000000) return res.status(400).json({ error: "Enter a valid positive amount." });
  if (!["income", "expense"].includes(type)) return res.status(400).json({ error: "Invalid transaction type." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || Number.isNaN(Date.parse(date))) return res.status(400).json({ error: "Enter a valid date." });
  const allowed = db.prepare("SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = ?").get(req.user.id, cleanCategory, type);
  if (!allowed) return res.status(400).json({ error: "Choose a category belonging to your account." });
  const result = db.prepare("INSERT INTO transactions(user_id, description, amount, type, category, transaction_date) VALUES (?, ?, ?, ?, ?, ?)")
    .run(req.user.id, cleanDescription, value, type, cleanCategory, date);
  const transaction = db.prepare("SELECT id, description, amount, type, category, transaction_date AS date FROM transactions WHERE id = ? AND user_id = ?").get(result.lastInsertRowid, req.user.id);
  res.status(201).json({ transaction });
});

app.put("/api/transactions/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const { description, amount, type, category, date } = req.body;
  const cleanDescription = String(description || "").trim(), cleanCategory = String(category || "").trim(), value = Number(amount);
  if (!Number.isInteger(id) || !cleanDescription || cleanDescription.length > 100 || !Number.isFinite(value) || value <= 0 ||
      !["income", "expense"].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")))
    return res.status(400).json({ error: "Please check the transaction details." });
  const allowed = db.prepare("SELECT 1 FROM categories WHERE user_id = ? AND name = ? AND type = ?").get(req.user.id, cleanCategory, type);
  if (!allowed) return res.status(400).json({ error: "Choose a category belonging to your account." });
  const result = db.prepare("UPDATE transactions SET description=?, amount=?, type=?, category=?, transaction_date=? WHERE id=? AND user_id=?")
    .run(cleanDescription, value, type, cleanCategory, date, id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Transaction not found." });
  res.json({ ok: true });
});

app.delete("/api/transactions/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(Number(req.params.id), req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Transaction not found." });
  res.json({ ok: true });
});

app.get("/api/summary", auth, (req, res) => {
  const month = String(req.query.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month." });
  const all = db.prepare("SELECT type, COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? GROUP BY type").all(req.user.id);
  const current = db.prepare("SELECT type, COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = ? AND substr(transaction_date,1,7)=? GROUP BY type").all(req.user.id, month);
  const byCategory = db.prepare("SELECT category, SUM(amount) AS total FROM transactions WHERE user_id=? AND substr(transaction_date,1,7)=? AND type='expense' GROUP BY category ORDER BY total DESC").all(req.user.id, month);
  const value = (rows, type) => rows.find(x => x.type === type)?.total || 0;
  const totalIncome = value(all, "income"), totalExpense = value(all, "expense");
  const income = value(current, "income"), expense = value(current, "expense");
  res.json({ balance: totalIncome-totalExpense, income, expense, savingsRate: income ? Math.round((income-expense)/income*100) : 0, byCategory });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`PocketTrack running at http://localhost:${PORT}`));
