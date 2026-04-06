// src/controllers/userController.js
const userService = require("../services/userService");
const response = require("../utils/response");

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, status, sortBy, sortOrder } = req.query;
    const { users, total } = await userService.getUsers({
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder,
    });
    const pagination = response.buildPagination(page || 1, limit || 20, total);
    return response.paginated(res, users, "Users retrieved", pagination);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return response.success(res, user);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const updated = await userService.updateUser(
      req.params.id,
      req.body,
      req.user.role,
    );
    return response.success(res, updated, "User updated successfully");
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user.id);
    return response.success(res, null, "User deleted successfully");
  } catch (err) {
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const updated = await userService.updateUserStatus(
      req.params.id,
      req.body.status,
      req.user.id,
    );
    return response.success(res, updated, "User status updated");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
};
