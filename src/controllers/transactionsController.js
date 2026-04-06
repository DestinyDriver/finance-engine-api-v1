const transactionService = require("../services/transactionService");

exports.getTransactions = async (req, res, next) => {
  try {
    const filters = req.query;
    const transactions = await transactionService.getTransactions(filters);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.createTransaction({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(
      Number(req.params.id),
    );
    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.updateTransaction(
      Number(req.params.id),
      req.body,
    );
    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    await transactionService.deleteTransaction(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
