import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const maxSize = "20m";
const maxFiles = "30d";

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${
        info.stack ? `\n${info.stack}` : ""
      }`
  )
);

const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple()
    ),
  }),

  // Rotating file transport for all logs
  new DailyRotateFile({
    filename: path.join(__dirname, "..", "logs", "application-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize,
    maxFiles,
    zippedArchive: false,
    format,
  }),

  // Separate transport for error logs
  new DailyRotateFile({
    filename: path.join(__dirname, "..", "logs", "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize,
    maxFiles,
    level: "error",
    zippedArchive: false,
    format,
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format,
  transports,
});

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    const userAgent = req.get("User-Agent") || "";
    const duration = Date.now() - start;

    logger.info(
      `${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ip} - User-Agent: ${userAgent}`
    );
  });

  next();
};

