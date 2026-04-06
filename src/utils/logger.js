const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const { logDir, logLevel, nodeEnv } = require("../config");

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level}] ${message} ${extra}`.trim();
  }),
);

const transports = [
  new DailyRotateFile({
    dirname: path.resolve(logDir),
    filename: "combined-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: fileFormat,
  }),
  new DailyRotateFile({
    dirname: path.resolve(logDir),
    filename: "error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "30d",
    level: "error",
    format: fileFormat,
  }),
  new winston.transports.Console({ format: consoleFormat }),
];

const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: "finance-dashboard-api", environment: nodeEnv },
  transports,
  exitOnError: false,
});

logger.withRequest = (req) =>
  logger.child({
    requestId: req.id,
    userId: req.user?.id,
    path: req.originalUrl,
  });

module.exports = logger;
