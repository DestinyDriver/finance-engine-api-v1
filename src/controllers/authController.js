// src/controllers/authController.js
const authService = require("../services/authService");
const response = require("../utils/response");
const logger = require("../utils/logger");

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    return response.created(res, user, "User registered successfully");
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    logger.info("Login successful", { userId: result.user.id });
    return response.success(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    return response.success(res, tokens, "Tokens refreshed");
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.token, refreshToken, req.user.id);
    return response.success(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    return response.success(res, null, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    return response.success(res, req.user, "Profile retrieved");
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, changePassword, me };
