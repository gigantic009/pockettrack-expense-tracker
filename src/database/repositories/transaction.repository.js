/** SQL persistence boundary for transaction records. */
function createTransactionRepository(db) {
  return {
    list(userId, month = null) {
      const sql = month
        ? `SELECT id, description, amount, type, category, transaction_date AS date
           FROM transactions WHERE user_id = ? AND substr(transaction_date,1,7)=?
           ORDER BY transaction_date DESC,id DESC`
        : `SELECT id, description, amount, type, category, transaction_date AS date
           FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC,id DESC`;
      return month ? db.prepare(sql).all(userId, month) : db.prepare(sql).all(userId);
    },
    findOwned(id, userId) {
      return db.prepare("SELECT * FROM transactions WHERE id=? AND user_id=?").get(id,userId);
    },
    insert(data) {
      const result = db.prepare(`INSERT INTO transactions(user_id,description,amount,type,category,transaction_date) VALUES(?,?,?,?,?,?)`)
        .run(data.userId,data.description,data.amount,data.type,data.category,data.date);
      return result.lastInsertRowid;
    },
    update(id,userId,data) {
      return db.prepare(`UPDATE transactions SET description=?,amount=?,type=?,category=?,transaction_date=? WHERE id=? AND user_id=?`)
        .run(data.description,data.amount,data.type,data.category,data.date,id,userId).changes;
    },
    delete(id,userId) {
      return db.prepare("DELETE FROM transactions WHERE id=? AND user_id=?").run(id,userId).changes;
    },
    availableBalance(userId, excludedId = null) {
      const sql = excludedId == null
        ? "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) balance FROM transactions WHERE user_id=?"
        : "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) balance FROM transactions WHERE user_id=? AND id!=?";
      return (excludedId == null ? db.prepare(sql).get(userId) : db.prepare(sql).get(userId,excludedId)).balance;
    }
  };
}
module.exports = { createTransactionRepository };
