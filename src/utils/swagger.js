const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Finance Dashboard API",
      version: "1.0.0",
      description:
        "A comprehensive finance management and analytics API with role-based access control",
      contact: {
        name: "Finance Dashboard Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/${process.env.API_VERSION || "v1"}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Access Token (15 minutes expiry)",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            role: { type: "string", enum: ["VIEWER", "ANALYST", "ADMIN"] },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
            amount: { type: "number", format: "double" },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            date: { type: "string", format: "date" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: { type: "object" },
            errors: { type: "array" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array" },
            message: { type: "string" },
            page: { type: "integer" },
            pageSize: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
            hasMore: { type: "boolean" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
              },
            },
            message: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Users", description: "User management (Admin only)" },
      { name: "Transactions", description: "Financial transaction management" },
      { name: "Dashboard", description: "Analytics and reporting (Analyst+)" },
      { name: "Categories", description: "Transaction categories" },
    ],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
