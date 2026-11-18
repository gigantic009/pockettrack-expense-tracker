"use strict";

const REQUIRED_HEADERS = ["description", "amount", "type", "category", "date"];
const MAX_CSV_BYTES = 1_000_000;
const MAX_CSV_ROWS = 5000;

function parseCsv(input) {
  if (typeof input !== "string" || Buffer.byteLength(input, "utf8") > MAX_CSV_BYTES) {
    throw new Error("CSV must be text and no larger than 1 MB.");
  }
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
      if (rows.length > MAX_CSV_ROWS + 1) throw new Error("CSV exceeds 5,000 data rows.");
    } else if (ch !== "\r") field += ch;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => r.some(v => String(v).trim() !== ""));
  if (nonEmpty.length < 2) throw new Error("CSV must contain a header and at least one data row.");
  const headers = nonEmpty[0].map(v => v.trim().toLowerCase().replace(/^\uFEFF/, ""));
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) throw new Error("CSV is missing required column: " + header);
  }
  const indexes = Object.fromEntries(REQUIRED_HEADERS.map(h => [h, headers.indexOf(h)]));
  return nonEmpty.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    description: String(cells[indexes.description] || "").trim(),
    amount: Number(String(cells[indexes.amount] || "").trim()),
    type: String(cells[indexes.type] || "").trim().toLowerCase(),
    category: String(cells[indexes.category] || "").trim(),
    date: String(cells[indexes.date] || "").trim()
  }));
}

function safeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function serializeTransactions(transactions) {
  const headers = REQUIRED_HEADERS.join(",");
  const lines = transactions.map(t => [
    t.description, t.amount, t.type, t.category, t.date
  ].map(safeCsvCell).join(","));
  return [headers, ...lines].join("\r\n") + "\r\n";
}

module.exports = { parseCsv, serializeTransactions, safeCsvCell, REQUIRED_HEADERS, MAX_CSV_ROWS };