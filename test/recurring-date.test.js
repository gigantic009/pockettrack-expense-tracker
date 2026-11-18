const test = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_SECRET = "finance-feature-test-secret-that-is-at-least-32-characters";
process.env.POCKETTRACK_DB_PATH = ":memory:";
const { advanceDate } = require("../server");

test("monthly recurring rules preserve their original calendar day", () => {
  assert.equal(advanceDate("2026-01-31", "monthly", 31), "2026-02-28");
  assert.equal(advanceDate("2026-02-28", "monthly", 31), "2026-03-31");
  assert.equal(advanceDate("2028-01-31", "monthly", 31), "2028-02-29");
});

test("weekly recurring rules advance by exactly seven days", () => {
  assert.equal(advanceDate("2026-11-18", "weekly", 18), "2026-11-25");
});
