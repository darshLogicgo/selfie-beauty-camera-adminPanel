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
//     "fousvDhKQJ634STPRRUFly:APA91bHTTKlQxmVYxnDVqKuvn3Mr0T5Z6a5ylMdOg1oLSCQ0CXpnk3pF0omX84QCebDVpSbCJl8bKralsOuMcakhChNTYtbT_b0P0cjCrhFomfsuRnE3PsI",
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
  // Example: await agenda.every("1 0 * * *", cronNameEnum.EXAMPLE_CRON); // Runs daily at 00:01
  // logger.info("Example cron scheduled");

  // AI Edit Reminder Cron - Runs daily at 00:01 to notify users with >= 1 edit in last 7 days
  // await agenda.every("1 0 * * *", cronNameEnum.AI_EDIT_REMINDER);
  // logger.info("AI Edit Reminder cron scheduled");

  // Core Active Users Cron - Runs daily at 00:01 to notify users with >= 3 edits in last 7 days
  // await agenda.every("1 0 * * *", cronNameEnum.CORE_ACTIVE_USERS);
  // logger.info("Core Active Users cron scheduled");

  // Recently Active Users Cron - Runs daily at 00:01 to notify users with last edit > 48h and ≤ 7 days
  // await agenda.every("1 0 * * *", cronNameEnum.RECENTLY_ACTIVE_USERS);
  // logger.info("Recently Active Users cron scheduled");

  // Inactive Users Cron - Runs daily at 00:01 to notify users with last edit > 7 days and ≤ 30 days
  // await agenda.every("1 0 * * *", cronNameEnum.INACTIVE_USERS);
  // logger.info("Inactive Users cron scheduled");

  // Churned Users Cron - Runs daily at 00:01 to notify users with no edits in last 30 days
  // await agenda.every("1 0 * * *", cronNameEnum.CHURNED_USERS);
  // logger.info("Churned Users cron scheduled");

  // Viral Users Cron - Runs daily at 00:01 to notify users with edit_shared >= 1 in last 90 days
  // await agenda.every("1 0 * * *", cronNameEnum.VIRAL_USERS);
  // logger.info("Viral Users cron scheduled");

  // Saved Edit Users Cron - Runs daily at 00:01 to notify users with edit_saved >= 2 in last 30 days
  // await agenda.every("1 0 * * *", cronNameEnum.SAVED_EDIT_USERS);
  // logger.info("Saved Edit Users cron scheduled");

  // Style Opened Users Cron - Runs daily at 00:01 to notify users with style_opened >= 3 in last 14 days
  // await agenda.every("1 0 * * *", cronNameEnum.STYLE_OPENED_USERS);
  // logger.info("Style Opened Users cron scheduled");

  // Streak Users Cron - Runs daily at 00:01 to notify users with streak >= 3 days when streak breaks
  // await agenda.every("1 0 * * *", cronNameEnum.STREAK_USERS);
  // logger.info("Streak Users cron scheduled");

  // Almost Subscribers Cron - Runs daily at 00:01 to notify users with paywall opened in last 14 days but no purchase
  // await agenda.every("1 0 * * *", cronNameEnum.ALMOST_SUBSCRIBERS);
  // logger.info("Almost Subscribers cron scheduled");

  // Paywall Dismissed Users Cron - Runs daily at 00:01 to notify users with paywall dismissed in last 7 days
  // await agenda.every("1 0 * * *", cronNameEnum.PAYWALL_DISMISSED_USERS);
  // logger.info("Paywall Dismissed Users cron scheduled");
});

// uncaught exceptions and unhandled rejections
process.on("uncaughtException", function (err) {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", function (err) {
  console.error("Unhandled Rejection:", err);
});
