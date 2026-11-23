function createDashboardService(db) {
  return {
    getSummary(userId, month) {
      const all=db.prepare("SELECT type,COALESCE(SUM(amount),0) total FROM transactions WHERE user_id=? GROUP BY type").all(userId);
      const current=db.prepare("SELECT type,COALESCE(SUM(amount),0) total FROM transactions WHERE user_id=? AND substr(transaction_date,1,7)=? GROUP BY type").all(userId,month);
      const byCategory=db.prepare("SELECT category,SUM(amount) total FROM transactions WHERE user_id=? AND substr(transaction_date,1,7)=? AND type='expense' GROUP BY category ORDER BY total DESC").all(userId,month);
      const val=(rows,type)=>rows.find(x=>x.type===type)?.total||0;
      const income=val(current,"income"), expense=val(current,"expense");
      return {balance:val(all,"income")-val(all,"expense"),income,expense,savingsRate:income?Math.round(((income-expense)/income)*100):0,byCategory};
    }
  };
}
module.exports={createDashboardService};
