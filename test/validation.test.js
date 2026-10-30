const test = require("node:test");
const assert = require("node:assert/strict");

const {
  todayInIndia,
  isValidTransactionDate,
  isValidAmount,
  isValidDescription,
  isValidTransactionType
} = require("../lib/validation");

const fixedNow = new Date("2026-10-30T06:00:00.000Z"); // 11:30 AM IST

test("todayInIndia returns the calendar date in Asia/Kolkata", () => {
  assert.equal(todayInIndia(fixedNow), "2026-10-30");
});

test("accepts valid past and current transaction dates", () => {
  assert.equal(isValidTransactionDate("2026-10-29", fixedNow), true);
  assert.equal(isValidTransactionDate("2026-10-30", fixedNow), true);
});

test("rejects future transaction dates", () => {
  assert.equal(isValidTransactionDate("2026-10-31", fixedNow), false);
});

test("rejects impossible calendar dates and malformed date strings", () => {
  for (const value of ["2026-02-29", "2026-04-31", "30-10-2026", "2026/10/30", "", null]) {
    assert.equal(isValidTransactionDate(value, fixedNow), false, String(value));
  }
});

test("accepts leap day only in a leap year", () => {
  assert.equal(isValidTransactionDate("2024-02-29", fixedNow), true);
  assert.equal(isValidTransactionDate("2025-02-29", fixedNow), false);
});

test("accepts finite positive amounts within the configured limit", () => {
  for (const value of [0.01, 1, 850, 1000000000, "25.50"]) {
    assert.equal(isValidAmount(value), true, String(value));
  }
});

test("rejects invalid, non-positive, and excessive amounts", () => {
  for (const value of [0, -1, "abc", NaN, Infinity, 1000000001, null, ""]) {
    assert.equal(isValidAmount(value), false, String(value));
  }
});

test("validates trimmed descriptions and the 100-character limit", () => {
  assert.equal(isValidDescription("  Groceries  "), true);
  assert.equal(isValidDescription("x".repeat(100)), true);
  assert.equal(isValidDescription(""), false);
  assert.equal(isValidDescription("   "), false);
  assert.equal(isValidDescription("x".repeat(101)), false);
});

test("allows only income and expense transaction types", () => {
  assert.equal(isValidTransactionType("income"), true);
  assert.equal(isValidTransactionType("expense"), true);
  assert.equal(isValidTransactionType("transfer"), false);
  assert.equal(isValidTransactionType(""), false);
});
