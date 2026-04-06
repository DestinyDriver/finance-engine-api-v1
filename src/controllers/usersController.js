const userService = require("../services/userService");

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const updated = await userService.updateStatus(
      Number(req.params.id),
      req.body,
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
