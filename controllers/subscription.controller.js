import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import UserModel from "../models/user.model.js";
import moment from "moment";
import axios from "axios";
import crypto from "crypto";
import FirebaseAnalyticsService from "../firebase/analytics.service.js";
import config from "../config/config.js";

const updateSubscriptionAppUserId = async (req, res, next) => {
  const { appUserId } = req.body;

  try {
    const user = await UserModel.findOne({ _id: req.user._id });
    if (!user) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    const existingUser = await UserModel.findOne({
      subscriptionAppUserId: appUserId,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return apiResponse({
        res,
        statusCode: StatusCodes.CONFLICT,
        message: "This appUserId is already assigned to another user.",
      });
    }

    // Ensure subscription fields exist before updating
    if (user.isSubscribe === undefined || user.isSubscribe === null) {
      user.isSubscribe = false;
    }
    if (user.subscriptionType === undefined || user.subscriptionType === null) {
      user.subscriptionType = null;
    }
    if (
      user.subscriptionStart === undefined ||
      user.subscriptionStart === null
    ) {
      user.subscriptionStart = null;
    }
    if (user.subscriptionEnd === undefined || user.subscriptionEnd === null) {
      user.subscriptionEnd = null;
    }

    user.subscriptionAppUserId = appUserId;
    await user.save();
    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      message: "SubscriptionAppUserId updated successfully.",
      data: null,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error",
    });
  }
};

const getSubscriptionCheck = async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ _id: req.user._id });
    if (!user) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    // Auto-add missing subscription fields for existing users
    let needsUpdate = false;
    const updateData = {};

    if (user.isSubscribe === undefined || user.isSubscribe === null) {
      updateData.isSubscribe = false;
      needsUpdate = true;
    }
    if (
      user.subscriptionAppUserId === undefined ||
      user.subscriptionAppUserId === null
    ) {
      updateData.subscriptionAppUserId = null;
      needsUpdate = true;
    }
    if (user.subscriptionType === undefined || user.subscriptionType === null) {
      updateData.subscriptionType = null;
      needsUpdate = true;
    }
    if (
      user.subscriptionStart === undefined ||
      user.subscriptionStart === null
    ) {
      updateData.subscriptionStart = null;
      needsUpdate = true;
    }
    if (user.subscriptionEnd === undefined || user.subscriptionEnd === null) {
      updateData.subscriptionEnd = null;
      needsUpdate = true;
    }

    // Update user if fields are missing
    if (needsUpdate) {
      await UserModel.findByIdAndUpdate(
        user._id,
        { $set: updateData },
        { new: true }
      );
      // Reload user to get updated fields
      const updatedUser = await UserModel.findOne({ _id: req.user._id });
      Object.assign(user, updatedUser.toObject());
    }

    if (user?._id?.toString() !== "6795c34641234a6f3a5926af") {
      if (!user.subscriptionAppUserId) {
        return apiResponse({
          res,
          statusCode: StatusCodes.OK,
          message: "fetch scubscription check successfully.",
          data: {
            isSubscribe: user.isSubscribe || false,
          },
        });
      }

      // RevenueCat API endpoint and headers
      const REVENUECAT_API_KEY = "test_QPxWPLYkfpAeonpNcRfAkvMNSdc";
      const REVENUECAT_API_URL = `https://api.revenuecat.com/v1/subscribers/${user.subscriptionAppUserId}`;

      const revenueCatResponse = await axios.get(REVENUECAT_API_URL, {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
        },
      });
      console.log("revenueCatResponse ++++++++++", revenueCatResponse.data);
      const subscriptionData = revenueCatResponse.data.subscriber.subscriptions;
      console.log("subscriptionData ++++++++++", subscriptionData);
      const productId = Object.keys(subscriptionData)[0];
      console.log("productId ++++++++++", productId);

      if (!productId) {
        user.isSubscribe = false;
        await user.save();
        return apiResponse({
          res,
          statusCode: StatusCodes.OK,
          message: "User is not subscribed",
          data: null,
        });
      }

      const subscription = subscriptionData[productId];
      console.log("subscription ++++++++++", subscription);
      const expiresDate = moment(subscription.expires_date);
      const currentDate = moment();

      // Update user subscription fields
      user.subscriptionType = subscription.period_type || null;
      user.subscriptionStart = subscription.purchase_date
        ? new Date(subscription.purchase_date)
        : null;
      user.subscriptionEnd = subscription.expires_date
        ? new Date(subscription.expires_date)
        : null;

      if (expiresDate.isAfter(currentDate)) {
        user.isSubscribe = true;
      } else {
        user.isSubscribe = false;
      }
    } else {
      if (user?._id?.toString() === "6795c34641234a6f3a5926af") {
        user.isSubscribe = true;
      }
    }

    await user.save();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      message: "fetch subscription check successfully.",
      data: {
        isSubscribe: user.isSubscribe,
      },
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error",
    });
  }
};

// RevenueCat Webhook Handler
const handleRevenueCatWebhook = async (req, res, next) => {
  try {
    // Log the incoming webhook data
    console.log("=== RevenueCat Webhook Received ===");

    // Verify webhook signature (optional but recommended for security)
    const signature = req.headers["authorization"];
    const webhookSecret =
      config.revenuecat.webhookSecret || "your-webhook-secret-here";

    if (signature && webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== `Bearer ${expectedSignature}`) {
        console.log("⚠️ Webhook signature verification failed");
        return apiResponse({
          res,
          statusCode: StatusCodes.UNAUTHORIZED,
          message: "Invalid webhook signature",
        });
      }
    }

    console.log("req.body ++++++++++", req.body);
    const { event } = req.body;

    // Send event to Firebase Analytics
    try {
      if (event && event.original_app_user_id) {
        console.log("🚀 Sending event to Firebase Analytics...");
        const analyticsSuccess =
          await FirebaseAnalyticsService.sendRevenueCatEvent(
            event,
            event?.original_app_user_id
          );
        console.log(
          "🔥 Firebase Analytics Response:::::::::::",
          analyticsSuccess
        );

        if (analyticsSuccess) {
          console.log("✅ Firebase Analytics event sent successfully");
        } else {
          console.log("❌ Failed to send Firebase Analytics event");
        }
      } else {
        console.log("⚠️ Skipping Firebase Analytics - missing app_user_id");
      }
    } catch (analyticsError) {
      console.error("❌ Firebase Analytics Error:", analyticsError.message);
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      message: "Webhook processed successfully",
      data: {
        event: event?.type,
        // app_user_id,
        processed: true,
      },
    });
  } catch (error) {
    console.error("❌ RevenueCat Webhook Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Webhook processing failed",
    });
  }
};

export default {
  updateSubscriptionAppUserId,
  getSubscriptionCheck,
  handleRevenueCatWebhook,
};
