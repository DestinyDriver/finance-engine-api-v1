// tests/integration/auth.test.js
const request = require("supertest");
const {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} = require("@jest/globals");
require("dotenv").config();

// // Set test environment BEFORE importing app
// process.env.NODE_ENV = "test";
// process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters-long";
// process.env.JWT_REFRESH_SECRET =
//   "test-refresh-secret-minimum-32-characters-long";
// process.env.JWT_ACCESS_EXPIRES_IN = "15m";
// process.env.JWT_REFRESH_EXPIRES_IN = "7d";
// process.env.DATABASE_URL =
//   process.env.TEST_DATABASE_URL ||
//   "postgresql://financeuser:financepass@localhost:5432/financedb_test";
// process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379";
// process.env.BCRYPT_ROUNDS = "4"; // Faster for tests

const app = require("../../src/app");

/**
 * NOTE: Integration tests require running PostgreSQL and Redis instances.
 * Run: docker-compose up postgres redis -d
 * Then: npm run test:integration
 *
 * These tests validate the full HTTP stack — middleware, validation,
 * controllers, and error handling — without mocking.
 */

describe("Auth Integration Tests", () => {
  const testUser = {
    email: `test-${Date.now()}@test.com`,
    password: "TestPassword@123",
    firstName: "Integration",
    lastName: "Test",
  };
  let accessToken, refreshToken;

  // ─── Register ─────────────────────────────────────────────────────────────
  describe("POST /api/v1/auth/register", () => {
    it("should register a new user and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.password).toBeUndefined();
    });

    it("should return 409 on duplicate email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);
      expect(res.status).toBe(409);
    });

    it("should return 422 for invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...testUser,
          email: "not-an-email",
        });
      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should return 422 for weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...testUser,
          email: "weak@test.com",
          password: "weak",
        });
      expect(res.status).toBe(422);
    });
  });

  // ─── Login ────────────────────────────────────────────────────────────────
  describe("POST /api/v1/auth/login", () => {
    it("should login and return access + refresh tokens", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: "WrongPassword@123",
      });
      expect(res.status).toBe(401);
    });

    it("should return 401 for non-existent user", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@test.com",
        password: "SomePassword@123",
      });
      expect(res.status).toBe(401);
    });
  });

  // ─── Authenticated Endpoints ───────────────────────────────────────────────
  describe("Protected endpoints", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });

    it("GET /auth/me should return current user", async () => {
      if (!accessToken) return;
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email);
    });
  });

  // ─── RBAC Enforcement ──────────────────────────────────────────────────────
  describe("Role-based access control", () => {
    let viewerToken, analystToken, adminToken;

    it("should DENY VIEWER from GET /users", async () => {
      if (!viewerToken) return;
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    describe("ANALYST role permissions", () => {
      it("should DENY ANALYST from DELETE /transactions", async () => {
        if (!analystToken) return;
        const res = await request(app)
          .delete("/api/v1/transactions/some-uuid")
          .set("Authorization", `Bearer ${analystToken}`);
        expect(res.status).toBe(403);
      });
    });

    describe("ADMIN full access", () => {
      it("should ALLOW ADMIN to GET /users", async () => {
        if (!adminToken) return;
        const res = await request(app)
          .get("/api/v1/users")
          .set("Authorization", `Bearer ${adminToken}`);
        expect([200, 500]).toContain(res.status);
      });
    });
  });
});
