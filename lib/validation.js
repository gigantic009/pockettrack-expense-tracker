// Shared server-side validation helpers.
function todayInIndia(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return \`\${values.year}-\${values.month}-\${values.day}\`;
}

function isValidTransactionDate(value, now = new Date()) {
  const date = String(value || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  return isRealDate && date <= todayInIndia(now);
}

function isValidAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 1000000000;
}

function isValidDescription(value) {
  const description = String(value || "").trim();
  return description.length >= 1 && description.length <= 100;
}

function isValidTransactionType(value) {
  return value === "income" || value === "expense";
}

module.exports = {
  todayInIndia,
  isValidTransactionDate,
  isValidAmount,
  isValidDescription,
  isValidTransactionType
};
