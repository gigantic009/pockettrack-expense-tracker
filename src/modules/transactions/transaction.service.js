const AppError = require("../../utils/AppError");
const validation = require("../../../lib/validation");

/** Transaction domain rules independent of HTTP and SQL. */
function createTransactionService({ transactionRepository, categoryRepository }) {
  function validate(data) {
    if (!validation.isValidDescription(data.description)) throw new AppError("Description is required (maximum 100 characters).",400,"INVALID_DESCRIPTION");
    if (!validation.isValidAmount(data.amount)) throw new AppError("Enter a valid positive amount.",400,"INVALID_AMOUNT");
    if (!validation.isValidTransactionType(data.type)) throw new AppError("Invalid transaction type.",400,"INVALID_TYPE");
    if (!validation.isValidTransactionDate(data.date)) throw new AppError("Enter a valid date. Future dates are not allowed.",400,"INVALID_DATE");
    if (!categoryRepository.exists(data.userId,data.category,data.type)) throw new AppError("Choose a category belonging to your account.",400,"INVALID_CATEGORY");
  }
  function ensureBalance(data, excludedId=null) {
    if (data.type === "expense" && data.amount > transactionRepository.availableBalance(data.userId,excludedId))
      throw new AppError("Insufficient balance. You cannot spend more than your available balance.",400,"INSUFFICIENT_BALANCE");
  }
  return {
    list(userId,month=null) { return transactionRepository.list(userId,month); },
    create(data) { validate(data); ensureBalance(data); return transactionRepository.insert(data); },
    update(id,data) {
      validate(data); ensureBalance(data,id);
      if (!transactionRepository.update(id,data.userId,data)) throw new AppError("Transaction not found.",404,"NOT_FOUND");
    },
    delete(id,userId) {
      if (!transactionRepository.delete(id,userId)) throw new AppError("Transaction not found.",404,"NOT_FOUND");
    }
  };
}
module.exports = { createTransactionService };
