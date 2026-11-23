function createCategoryRepository(db) {
  return {
    list(userId) {
      return db.prepare("SELECT id,name,type FROM categories WHERE user_id=? ORDER BY type,name").all(userId);
    },
    exists(userId,name,type) {
      return Boolean(db.prepare("SELECT 1 FROM categories WHERE user_id=? AND name=? AND type=?").get(userId,name,type));
    }
  };
}
module.exports = { createCategoryRepository };
