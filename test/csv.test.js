const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv, serializeTransactions, safeCsvCell } = require("../lib/csv");

test("parses quoted commas, escaped quotes, and embedded newlines", () => {
  const rows = parseCsv('description,amount,type,category,date\n"Tea, coffee",12,expense,Food,2026-11-18\n"Line 1\nLine 2",4,income,Gift,2026-11-18\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].description, "Tea, coffee");
  assert.equal(rows[1].description, "Line 1\nLine 2");
});

test("rejects malformed and missing-header CSV", () => {
  assert.throws(() => parseCsv('description,amount\n"open,1'), /unterminated/i);
  assert.throws(() => parseCsv("description,amount\nTea,1"), /missing required column/i);
});

test("CSV export quotes values and neutralizes spreadsheet formulas", () => {
  assert.equal(safeCsvCell("=HYPERLINK(\"https://bad\")"), '"\'=HYPERLINK(""https://bad"")"');
  const csv = serializeTransactions([{
    description: "Food, lunch", amount: 100, type: "expense",
    category: "Food", date: "2026-11-18"
  }]);
  assert.match(csv, /"Food, lunch"/);
  assert.match(csv, /^description,amount,type,category,date/m);
});
