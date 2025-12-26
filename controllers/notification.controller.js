import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import userServices from "../services/user.service.js";
import helper from "../helper/common.helper.js";

// ---- Send Notification to User -----
const sendNotification = async (req, res) => {
  try {
    const { userID, image, title, description, screenName, imageUrl, generatedImageTitle } = req.body;

    // Validate required fields
    if (!userID || !title || !description) {
      return apiResponse({
        res,
        status: false,
        message: "userID, title, and description are required",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    // Find user by ID
    const user = await userServices.findById(userID);

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
        data: null,
      });
    }

    // Check if user has FCM token
    if (!user.fcmToken) {
      return apiResponse({
        res,
        status: false,
        message: "User does not have an FCM token registered",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    // Send notification
    const notificationResult = await helper.sendFCMNotification({
      fcmToken: user.fcmToken,
      title: title,
      description: description,
      image: image || null, // Notification icon image
      screenName: screenName || null, // Screen name for navigation
      imageUrl: imageUrl || null, // Generated image URL to display
      generatedImageTitle: generatedImageTitle || null, // Generated image title
    });

    if (notificationResult.success) {
      return apiResponse({
        res,
        status: true,
        message: "Notification sent successfully",
        statusCode: StatusCodes.OK,
        data: {
          messageId: notificationResult.messageId,
          userId: userID,
          screenName: screenName || null,
          imageUrl: imageUrl || null,
          generatedImageTitle: generatedImageTitle || null,
        },
      });
    } else {
      return apiResponse({
        res,
        status: false,
        message: notificationResult.error || "Failed to send notification",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        data: null,
      });
    }
  } catch (error) {
    console.error("Error in sendNotification:", error);
    return apiResponse({
      res,
      status: false,
      message: "Internal server error",
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};

export default {
  sendNotification,
};

