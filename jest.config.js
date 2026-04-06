module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: [],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  verbose: true,
  testTimeout: 10000,
  bail: false,
  detectOpenHandles: true,
};
