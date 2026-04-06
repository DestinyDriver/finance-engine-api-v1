const transactionService = require("../services/transactionService");
const response = require("../utils/response");

const getTransactions = async (req, res, next) => {
  try {
    const { transactions, total, page, limit } =
      await transactionService.getTransactions(
        req.query,
        req.user.id,
        req.user.role,
      );
    const pagination = response.buildPagination(page, limit, total);
    return response.paginated(
      res,
      transactions,
      "Transactions retrieved",
      pagination,
    );
  } catch (err) {
    next(err);
  }
};

const getTransactionById = async (req, res, next) => {
  try {
    const tx = await transactionService.getTransactionById(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return response.success(res, tx);
  } catch (err) {
    next(err);
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const tx = await transactionService.createTransaction(
      req.body,
      req.user.id,
    );
    return response.created(res, tx, "Transaction created successfully");
  } catch (err) {
    next(err);
  }
};

const updateTransaction = async (req, res, next) => {
  try {
    const tx = await transactionService.updateTransaction(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role,
    );
    return response.success(res, tx, "Transaction updated successfully");
  } catch (err) {
    next(err);
  }
};

const deleteTransaction = async (req, res, next) => {
  try {
    await transactionService.deleteTransaction(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return response.success(res, null, "Transaction deleted successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
