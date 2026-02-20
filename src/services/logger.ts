import winston from "winston";
import path from "node:path";
import fs from "node:fs";

const logLevel = process.env.LOG_LEVEL ?? "info";
const configuredLogFilePath = process.env.LOG_FILE_PATH;
const defaultLogFilePath = path.resolve(process.cwd(), "backend.log");
const logFilePath = configuredLogFilePath
  ? path.isAbsolute(configuredLogFilePath)
    ? configuredLogFilePath
    : path.resolve(process.cwd(), configuredLogFilePath)
  : defaultLogFilePath;

const logDirectory = path.dirname(logFilePath);
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFilePath })
  ]
});
