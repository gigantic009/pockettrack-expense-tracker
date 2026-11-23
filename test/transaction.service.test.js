const test = require("node:test");
const assert = require("node:assert/strict");
const { createTransactionService } = require("../src/modules/transactions/transaction.service");

function setup(balance = 1000) {
  const rows = new Map();
  let nextId = 1;
  const repo = {
    list: () => [...rows.values()],
    availableBalance: (_userId, excludedId = null) => {
      let value = balance;
      if (excludedId != null && rows.has(excludedId)) {
        const old = rows.get(excludedId);
        value += old.type === "income" ? -old.amount : old.amount;
      }
      return value;
    },
    insert: data => { const id = nextId++; rows.set(id, { ...data, id }); return id; },
    update: (id, userId, data) => { if (!rows.has(id) || rows.get(id).userId !== userId) return 0; rows.set(id, { ...data, id }); return 1; },
    delete: (id, userId) => { if (!rows.has(id) || rows.get(id).userId !== userId) return 0; rows.delete(id); return 1; }
  };
  const categoryRepo = { exists: (_uid, name, type) => name.length > 0 && ["income","expense"].includes(type) };
  return { service: createTransactionService({ transactionRepository: repo, categoryRepository: categoryRepo }), rows };
}

const valid = (overrides = {}) => ({
  userId: 1, description: "Coffee", amount: 50, type: "expense",
  category: "Food", date: new Date().toISOString().slice(0,10), ...overrides
});

test("creates valid transactions and enforces available balance", () => {
  const { service, rows } = setup(100);
  assert.equal(service.create(valid({ amount: 90 })), 1);
  assert.equal(rows.size, 1);
  assert.throws(() => service.create(valid({ amount: 11 })), /Insufficient balance/);
});

test("rejects malformed transaction data and invalid categories", () => {
  const { service } = setup(100);
  assert.throws(() => service.create(valid({ description: " " })), /Description/);
  assert.throws(() => service.create(valid({ amount: -1 })), /amount/);
  assert.throws(() => service.create(valid({ type: "transfer" })), /type/);
  assert.throws(() => service.create(valid({ date: "not-a-date" })), /date/);
  assert.throws(() => service.create(valid({ category: "" })), /category/);
});

test("update and delete require ownership and update balance excludes old transaction", () => {
  const { service, rows } = setup(100);
  const id = service.create(valid({ amount: 80 }));
  assert.throws(() => service.update(id, valid({ userId: 2, amount: 10 })), /not found/i);
  assert.throws(() => service.update(id, valid({ amount: 101 })), /Insufficient balance/);
  service.update(id, valid({ amount: 50 }));
  assert.equal(rows.get(id).amount, 50);
  assert.throws(() => service.delete(id, 2), /not found/i);
  service.delete(id, 1);
  assert.equal(rows.size, 0);
});
