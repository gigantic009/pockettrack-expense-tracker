const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pockettrack-finance-"));
process.env.JWT_SECRET = "finance-test-secret-that-is-at-least-32-characters-long";
process.env.POCKETTRACK_DB_PATH = path.join(dir, "test.sqlite");
const { app, db } = require("../server");
const { todayInIndia } = require("../lib/validation");

test("finance workflows are authenticated, scoped, and idempotent", async t => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, options = {}) => {
    const method = String(options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) headers.origin = base;
    if (options.cookie) headers.cookie = options.cookie;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    return fetch(base + route, {
      ...options, headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  };
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const registered = await request("/api/auth/register", {
    method: "POST", body: { name: "Finance Test", email: "finance@example.com", password: "password123" }
  });
  assert.equal(registered.status, 201);
  const cookie = "pt_session=" + (registered.headers.get("set-cookie") || "").match(/pt_session=([^;]+)/)[1];
  const month = todayInIndia().slice(0, 7);
  const today = todayInIndia();

  const income = await request("/api/transactions", {
    method: "POST", cookie,
    body: { description: "Allowance", amount: 1000, type: "income", category: "Salary", date: today }
  });
  assert.equal(income.status, 201);

  const budget = await request("/api/budgets", {
    method: "POST", cookie, body: { category: "Food", month, amount: 500 }
  });
  assert.equal(budget.status, 201);
  const expense = await request("/api/transactions", {
    method: "POST", cookie,
    body: { description: "Lunch", amount: 200, type: "expense", category: "Food", date: today }
  });
  assert.equal(expense.status, 201);
  const budgetList = await (await request("/api/budgets?month=" + month, { cookie })).json();
  assert.equal(budgetList.budgets[0].spent, 200);
  assert.equal(budgetList.budgets[0].remaining, 300);

  const csv = "description,amount,type,category,date\nImported allowance,50,income,Salary," + today + "\n";
  const preview = await request("/api/transactions/import/preview", {
    method: "POST", cookie, body: { csv }
  });
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).validRows, 1);
  const imported = await request("/api/transactions/import", {
    method: "POST", cookie, body: { csv }
  });
  assert.equal(imported.status, 201);
  assert.equal((await imported.json()).imported, 1);

  const exportResponse = await request("/api/transactions/export.csv?month=" + month, { cookie });
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get("content-type"), /text\/csv/);
  assert.match(await exportResponse.text(), /Imported allowance/);

  const rule = await request("/api/recurring-rules", {
    method: "POST", cookie,
    body: { description: "Monthly rent", amount: 100, type: "expense", category: "Bills", frequency: "monthly", startDate: today }
  });
  assert.equal(rule.status, 201);
  const ruleId = (await rule.json()).id;
  const run1 = await request("/api/recurring-rules/" + ruleId + "/run", { method: "POST", cookie });
  assert.equal((await run1.json()).created, 1);
  const run2 = await request("/api/recurring-rules/" + ruleId + "/run", { method: "POST", cookie });
  assert.equal((await run2.json()).created, 0);

  const other = await request("/api/auth/register", {
    method: "POST", body: { name: "Other User", email: "other@example.com", password: "password123" }
  });
  const otherCookie = "pt_session=" + other.headers.get("set-cookie").match(/pt_session=([^;]+)/)[1];
  const otherBudgets = await request("/api/budgets?month=" + month, { cookie: otherCookie });
  assert.equal((await otherBudgets.json()).budgets.length, 0);
});
