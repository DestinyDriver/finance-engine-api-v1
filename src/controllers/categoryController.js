// src/controllers/categoryController.js
const { prisma } = require("../utils/database");
const response = require("../utils/response");

const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { transactions: { where: { deletedAt: null } } } },
      },
    });
    return response.success(res, categories, "Categories retrieved");
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const category = await prisma.category.create({
      data: { name, description, color },
    });
    return response.created(res, category, "Category created");
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return response.success(res, category, "Category updated");
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const count = await prisma.transaction.count({
      where: { categoryId: req.params.id, deletedAt: null },
    });
    if (count > 0) {
      return response.error(
        res,
        `Cannot delete category with ${count} active transactions`,
        400,
      );
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    return response.success(res, null, "Category deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
