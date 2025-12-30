import express from "express";
import cors from "cors";
import config from "./config/config.js";
import connectDB from "./config/db.config.js";
import morgan from "morgan";
import http from "http";
import errorHandler from "./middleware/error-handler.middleware.js";
import router from "./router.js";
import initializeSocket from "./socket/socket.io.js";
import helper from "./helper/common.helper.js";
import { agenda } from "./config/agenda.js";
import { cronNameEnum } from "./config/enum.config.js";
import moment from "moment";
import { logger, requestLogger } from "./config/logger.config.js";

// Import cron jobs
import "./cron/example.cron.js";
import "./cron/aiEditReminder.cron.js";
import "./cron/coreActiveUsers.cron.js";
import "./cron/recentlyActiveUsers.cron.js";
import "./cron/inactiveUsers.cron.js";
import "./cron/churnedUsers.cron.js";
import "./cron/viralUsers.cron.js";
import "./cron/savedEditUsers.cron.js";
import "./cron/styleOpenedUsers.cron.js";
import "./cron/streakUsers.cron.js";
import "./cron/almostSubscribers.cron.js";
import "./cron/paywallDismissedUsers.cron.js";
import "./cron/countryNotification.cron.js";

// test

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");

// Trust proxy - enables Express to get real client IP from X-Forwarded-For header
// This is essential when app is behind a reverse proxy, load balancer, or CDN
app.set("trust proxy", true);

// connect database
connectDB();

// helper.sendFCMNotification({
//   fcmToken:
//     "eK_RoxPxRyiPXfVv16Xrur:APA91bF2poZHFFP3SC05uYNt0oZeh7xRw2R0Q5IVPb5AYEf5GbisvSZScJ63tIptM-c-k83m523njaeN8M22BdIkkNEpquSnx8aJpJPf7rpxzwMOvEkst2k",
//   title: "Test Notification",
//   description: "This is a test notification",
// });

// middleware
app.use(morgan("dev"));
app.use(requestLogger);
app.use(cors({ origin: "*" }));

// JSON parsing with error handling wrapper
app.use((req, res, next) => {
  express.json({ limit: "10mb" })(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        message: "Invalid JSON format in request body",
        data: null,
      });
    }
    next();
  });
});
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/v1/auth", router.authRoute);
app.use("/api/v1/user", router.userRoute);
app.use("/api/v1/categories", router.categoryRoute);
app.use("/api/v1/trending", router.trendingRoute);
app.use("/api/v1/ai-world", router.aiWorldRoute);
app.use("/api/v1/user-preference", router.userPreferenceRoute);

// Subcategory Routes
app.use("/api/v1/subcategory", router.subCategory);

// AI Photo Routes
app.use("/api/v1/aiphoto", router.aiPhotoRoute);

// Home Routes
app.use("/api/v1/home", router.homeRoute);

// Uninstall Routes
app.use("/api/v1/uninstall", router.uninstallRoute);

// Feedback Routes
app.use("/api/v1/feedback", router.feedbackRoute);

// Share Routes (Deep Linking)
app.use("/api/v1/share", router.shareRoute);

// Dashboard Routes
app.use("/api/v1/dashboard", router.dashboardRoute);

// Subscription Routes
app.use("/api/v1/subscription", router.subscriptionRoute);

// Notification Routes
app.use("/api/v1/notification", router.notificationRoute);

// GA4 Routes
app.use("/api/v1/ga4", router.ga4Route);

// Initialize Socket.IO
initializeSocket(server);

// error handler
app.use(errorHandler);

// start server
server.listen(config.port, async () => {
  logger.info(`Server is running on port http://localhost:${config.port}`);

  // Start agenda
  await agenda.start();
  logger.info("Agenda started");

  // Cancel old jobs
  const oldJobs = await agenda.jobs({ nextRunAt: { $lt: moment().toDate() } });
  for (const job of oldJobs) {
    logger.info(`Cancelling job: ${job.attrs._id}`);
    await agenda.cancel({ _id: job.attrs._id });
  }

  // Schedule cron jobs here
  // NOTE: All cron logic is now consolidated into COUNTRY_NOTIFICATION cron
  // This single cron runs every 30 minutes (8-9:30 PM) and executes all notification types together
  
  // Consolidated Country-Specific Notification Cron - Runs ALL notification types together
  await agenda.every("*/30 20-21 * * *", cronNameEnum.COUNTRY_NOTIFICATION);
  logger.info("✅ Consolidated country notification cron scheduled (every 30 min, 8-9:30 PM)");
  logger.info("   This cron executes all 11 notification types based on country timezone");

  // Individual crons are now disabled - all logic runs through COUNTRY_NOTIFICATION
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.AI_EDIT_REMINDER);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.CORE_ACTIVE_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.RECENTLY_ACTIVE_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.INACTIVE_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.CHURNED_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.VIRAL_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.SAVED_EDIT_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.STYLE_OPENED_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.STREAK_USERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.ALMOST_SUBSCRIBERS);
  // await agenda.every("*/30 20-21 * * *", cronNameEnum.PAYWALL_DISMISSED_USERS);
});

// uncaught exceptions and unhandled rejections
process.on("uncaughtException", function (err) {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", function (err) {
  console.error("Unhandled Rejection:", err);
});
