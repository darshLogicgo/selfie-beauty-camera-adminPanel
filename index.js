import express from "express";
import cors from "cors";
import config from "./config/config.js";
import connectDB from "./config/db.config.js";
import morgan from "morgan";
import http from "http";
import errorHandler from "./middleware/error-handler.middleware.js";
import router from "./router.js";
import initializeSocket from "./socket/socket.io.js";

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");

// connect database
connectDB();

// middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(cors({ origin: "*" }));

// Users Routes
app.use("/api/v1/auth", router.authRoute);
app.use("/api/v1/user", router.userRoute);

// Subcategory Routes
app.use("/api/subcategory", router.subCategory);

// AI Photo Routes
app.use("/api/aiphoto", router.aiPhotoRoute);

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
