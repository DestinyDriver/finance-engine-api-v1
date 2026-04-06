const dashboardService = require("../services/dashboardService");
const response = require("../utils/response");

const getOverview = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardOverview(
      req.user.id,
      req.user.role,
    );
    return response.success(res, data, "Dashboard overview retrieved");
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await dashboardService.getSummary(req.user.id, req.user.role, {
      dateFrom,
      dateTo,
    });
    return response.success(res, data, "Summary retrieved");
  } catch (err) {
    next(err);
  }
};

const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { type, dateFrom, dateTo } = req.query;
    const data = await dashboardService.getCategoryBreakdown(
      req.user.id,
      req.user.role,
      { type, dateFrom, dateTo },
    );
    return response.success(res, data, "Category breakdown retrieved");
  } catch (err) {
    next(err);
  }
};

const getMonthlyTrends = async (req, res, next) => {
  try {
    const { months } = req.query;
    const data = await dashboardService.getMonthlyTrends(
      req.user.id,
      req.user.role,
      { months },
    );
    return response.success(res, data, "Monthly trends retrieved");
  } catch (err) {
    next(err);
  }
};

const getWeeklyTrends = async (req, res, next) => {
  try {
    const { weeks } = req.query;
    const data = await dashboardService.getWeeklyTrends(
      req.user.id,
      req.user.role,
      { weeks },
    );
    return response.success(res, data, "Weekly trends retrieved");
  } catch (err) {
    next(err);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const data = await dashboardService.getRecentActivity(
      req.user.id,
      req.user.role,
      { limit },
    );
    return response.success(res, data, "Recent activity retrieved");
  } catch (err) {
    next(err);
  }
};

const getTopCategories = async (req, res, next) => {
  try {
    const { type, limit, dateFrom, dateTo } = req.query;
    const data = await dashboardService.getTopCategories(
      req.user.id,
      req.user.role,
      { type, limit, dateFrom, dateTo },
    );
    return response.success(res, data, "Top categories retrieved");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
