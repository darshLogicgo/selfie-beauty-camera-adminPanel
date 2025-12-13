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

// test

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");

// connect database
connectDB();

// helper.sendFCMNotification({
//   fcmToken:
//     "cBTK6-ovSBCinUAyfDNmHq:APA91bEMqWb8mctKsWLNXRSWIiuOSKcRxGc-mj0Vb_5MsSL6pgX39DmZ6uH_XLD3v7JN7k86EEIBlFpm0Phh9uSAmTnzSC8zJR-NDMcr7tjv7NuvsbOtDlg",
//   title: "Test Notification",
//   description: "This is a test notification",
// });

// middleware
app.use(morgan("dev"));
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

// Initialize Socket.IO
initializeSocket(server);

// error handler
app.use(errorHandler);

// start server
server.listen(config.port, () => {
  console.log(`Server is running on port http://localhost:${config.port}`);
});

// uncaught exceptions and unhandled rejections
process.on("uncaughtException", function (err) {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", function (err) {
  console.error("Unhandled Rejection:", err);
});
