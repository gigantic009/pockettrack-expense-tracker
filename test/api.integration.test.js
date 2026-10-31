const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pockettrack-api-"));
process.env.JWT_SECRET = "integration-test-secret-that-is-at-least-32-characters";
process.env.POCKETTRACK_DB_PATH = path.join(tempDir, "integration.sqlite");

const { app, db } = require("../server");
const { todayInIndia } = require("../lib/validation");

let server;
let baseUrl;

async function request(route, options = {}) {
  const headers = { ...(options.headers || {}) };
  const method = String(options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !("origin" in headers)) {
    headers.origin = baseUrl;
  }
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  return fetch(baseUrl + route, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
}

function sessionCookie(response) {
  const header = response.headers.get("set-cookie") || "";
  const match = header.match(/pt_session=([^;]+)/);
  assert.ok(match, "login/register response should set the session cookie");
  return `pt_session=${match[1]}`;
}

test("PocketTrack API integration", async t => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const today = todayInIndia();
  const month = today.slice(0, 7);
  let userACookie;
  let userBCookie;
  let transactionId;

  await t.test("protected endpoints reject unauthenticated requests", async () => {
    const response = await request("/api/auth/me");
    assert.equal(response.status, 401);
  });

  await t.test("state-changing API requests reject missing and foreign origins", async () => {
    const missingOrigin = await request("/api/auth/register", {
      method: "POST",
      headers: { origin: "" },
      body: { name: "Blocked User", email: "blocked@example.com", password: "password123" }
    });
    assert.equal(missingOrigin.status, 403);

    const foreignOrigin = await request("/api/auth/register", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
      body: { name: "Blocked User", email: "blocked@example.com", password: "password123" }
    });
    assert.equal(foreignOrigin.status, 403);

    const safe = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test User A", email: "usera@example.com", password: "password123" }
    });
    assert.equal(safe.status, 201);
    const cookie = sessionCookie(safe);
    const blockedDelete = await request("/api/transactions/999", {
      method: "DELETE",
      cookie,
      headers: { origin: "https://attacker.example" }
    });
    assert.equal(blockedDelete.status, 403);
  });

  await t.test("registration creates an account, session, and default categories", async () => {
    const response = await request("/api/auth/login", {
      method: "POST",
      body: { email: "usera@example.com", password: "password123" }
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.user.email, "usera@example.com");
    assert.equal(data.user.name, "Test User A");
    assert.equal("password_hash" in data.user, false);
    assert.match(response.headers.get("set-cookie") || "", /HttpOnly/i);
    assert.match(response.headers.get("set-cookie") || "", /SameSite=Strict/i);
    userACookie = sessionCookie(response);

    const categoriesResponse = await request("/api/categories", { cookie: userACookie });
    const categoriesData = await categoriesResponse.json();
    assert.equal(categoriesResponse.status, 200);
    assert.equal(categoriesData.categories.length, 14);
    assert.ok(categoriesData.categories.some(item => item.name === "Food" && item.type === "expense"));
    assert.ok(categoriesData.categories.some(item => item.name === "Salary" && item.type === "income"));
  });

  await t.test("duplicate registration is rejected", async () => {
    const response = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Duplicate User", email: "USERA@example.com", password: "password123" }
    });
    assert.equal(response.status, 409);
  });

  await t.test("login rejects incorrect credentials and accepts correct credentials", async () => {
    const invalid = await request("/api/auth/login", {
      method: "POST",
      body: { email: "usera@example.com", password: "wrong-password" }
    });
    assert.equal(invalid.status, 401);

    const valid = await request("/api/auth/login", {
      method: "POST",
      body: { email: "USERA@example.com", password: "password123" }
    });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).user.email, "usera@example.com");
    userACookie = sessionCookie(valid);
  });

  await t.test("authenticated user can access their profile", async () => {
    const response = await request("/api/auth/me", { cookie: userACookie });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.user.email, "usera@example.com");
  });

  await t.test("transaction creation validates input and persists valid records", async () => {
    const invalid = await request("/api/transactions", {
      method: "POST",
      cookie: userACookie,
      body: { description: "", amount: 0, type: "expense", category: "Food", date: today }
    });
    assert.equal(invalid.status, 400);

    const response = await request("/api/transactions", {
      method: "POST",
      cookie: userACookie,
      body: { description: "Monthly allowance", amount: 1000, type: "income", category: "Salary", date: today }
    });
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.equal(data.transaction.description, "Monthly allowance");
    assert.equal(data.transaction.amount, 1000);
    transactionId = data.transaction.id;

    const expense = await request("/api/transactions", {
      method: "POST",
      cookie: userACookie,
      body: { description: "Groceries", amount: 200, type: "expense", category: "Food", date: today }
    });
    assert.equal(expense.status, 201);
  });

  await t.test("transaction listing, month filtering, and dashboard summary work", async () => {
    const allResponse = await request("/api/transactions", { cookie: userACookie });
    const allData = await allResponse.json();
    assert.equal(allResponse.status, 200);
    assert.equal(allData.transactions.length, 2);

    const monthResponse = await request(`/api/transactions?month=${month}`, { cookie: userACookie });
    assert.equal(monthResponse.status, 200);
    assert.equal((await monthResponse.json()).transactions.length, 2);

    const invalidMonth = await request("/api/transactions?month=2026-13", { cookie: userACookie });
    assert.equal(invalidMonth.status, 400);

    const summaryResponse = await request(`/api/summary?month=${month}`, { cookie: userACookie });
    const summary = await summaryResponse.json();
    assert.equal(summaryResponse.status, 200);
    assert.equal(summary.balance, 800);
    assert.equal(summary.income, 1000);
    assert.equal(summary.expense, 200);
    assert.equal(summary.savingsRate, 80);
    assert.equal(summary.byCategory[0].category, "Food");
  });

  await t.test("transaction can be edited and dashboard totals update", async () => {
    const response = await request(`/api/transactions/${transactionId}`, {
      method: "PUT",
      cookie: userACookie,
      body: { description: "Updated allowance", amount: 1200, type: "income", category: "Salary", date: today }
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);

    const summaryResponse = await request(`/api/summary?month=${month}`, { cookie: userACookie });
    const summary = await summaryResponse.json();
    assert.equal(summary.balance, 1000);
    assert.equal(summary.income, 1200);
  });

  await t.test("a second account cannot read or modify the first account's transactions", async () => {
    const registration = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test User B", email: "userb@example.com", password: "password123" }
    });
    assert.equal(registration.status, 201);
    userBCookie = sessionCookie(registration);

    const listResponse = await request("/api/transactions", { cookie: userBCookie });
    assert.equal((await listResponse.json()).transactions.length, 0);

    const editResponse = await request(`/api/transactions/${transactionId}`, {
      method: "PUT",
      cookie: userBCookie,
      body: { description: "Attempted edit", amount: 5, type: "income", category: "Salary", date: today }
    });
    assert.equal(editResponse.status, 404);

    const deleteResponse = await request(`/api/transactions/${transactionId}`, {
      method: "DELETE",
      cookie: userBCookie
    });
    assert.equal(deleteResponse.status, 404);
  });

  await t.test("transaction can be deleted by its owner", async () => {
    const response = await request("/api/transactions", { cookie: userACookie });
    const data = await response.json();
    const expense = data.transactions.find(item => item.description === "Groceries");
    assert.ok(expense);

    const deleted = await request(`/api/transactions/${expense.id}`, {
      method: "DELETE",
      cookie: userACookie
    });
    assert.equal(deleted.status, 200);

    const afterDelete = await request("/api/transactions", { cookie: userACookie });
    assert.equal((await afterDelete.json()).transactions.length, 1);
  });

  await t.test("logout clears the session and protected access is denied", async () => {
    const response = await request("/api/auth/logout", {
      method: "POST",
      cookie: userACookie
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.match(response.headers.get("set-cookie") || "", /pt_session=;/);

    const profile = await request("/api/auth/me");
    assert.equal(profile.status, 401);
  });
});
