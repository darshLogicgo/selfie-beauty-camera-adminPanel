import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import Feedback from "../models/Feedback.js";
import fileUploadService from "../services/file.upload.service.js";
import helper from "../helper/common.helper.js";
import mongoose from "mongoose";
import enums from "../config/enum.config.js";

/**
 * Create Feedback (Client Side)
 * POST /api/v1/feedback
 */
export const createFeedback = async (req, res) => {
  try {
    const { title, description, appVersion, platform } = req.body;

    // Validate required fields
    if (!title || !description) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Title and description are required.",
        data: null,
      });
    }

    // Process file uploads if present
    let attachments = [];
    if (
      req.files &&
      req.files.attachments &&
      Array.isArray(req.files.attachments)
    ) {
      const uploadPromises = req.files.attachments.map(async (file) => {
        const fileUrl = await fileUploadService.uploadFile({
          buffer: file.buffer,
          mimetype: file.mimetype,
          folder: "feedback/attachments",
        });
        return fileUrl;
      });
      attachments = await Promise.all(uploadPromises);
    }

    // Build feedback data
    const feedbackData = {
      userId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      status: enums.feedbackStatusEnum.PENDING, // Default status is pending
    };

    // Add optional fields if provided
    if (appVersion && appVersion.trim()) {
      feedbackData.appVersion = appVersion.trim();
    }
    if (platform && platform.trim()) {
      const platformUpper = platform.toUpperCase().trim();
      if (platformUpper === "ANDROID" || platformUpper === "IOS") {
        feedbackData.platform = platformUpper;
      }
    }
    if (attachments.length > 0) feedbackData.attachments = attachments;

    const feedback = await Feedback.create(feedbackData);

    return apiResponse({
      res,
      statusCode: StatusCodes.CREATED,
      status: true,
      message: "Feedback submitted successfully.",
      data: feedback,
    });
  } catch (error) {
    console.error("Create feedback error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: error.message || "Failed to submit feedback.",
      data: null,
    });
  }
};

/**
 * Get Feedback (Admin Side)
 * GET /api/v1/feedback
 */
export const getFeedback = async (req, res) => {
  try {
    const {
      id,
      userId,
      platform,
      status,
      startDate,
      endDate,
      page,
      limit,
      search,
    } = req.query;

    // If specific ID is requested
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return apiResponse({
          res,
          statusCode: StatusCodes.BAD_REQUEST,
          status: false,
          message: "Invalid feedback ID format.",
          data: null,
        });
      }

      const feedback = await Feedback.findById(id).populate(
        "userId",
        "username email"
      );

      if (!feedback) {
        return apiResponse({
          res,
          statusCode: StatusCodes.NOT_FOUND,
          status: false,
          message: "Feedback not found.",
          data: null,
        });
      }

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "Feedback fetched successfully.",
        data: feedback,
      });
    }

    // Build filter for list query
    const filter = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return apiResponse({
          res,
          statusCode: StatusCodes.BAD_REQUEST,
          status: false,
          message: "Invalid user ID format.",
          data: null,
        });
      }
      filter.userId = userId;
    }

    if (platform) {
      filter.platform = platform.toUpperCase();
    }

    if (status) {
      const statusLower = status.toLowerCase();
      if (
        statusLower === enums.feedbackStatusEnum.PENDING ||
        statusLower === enums.feedbackStatusEnum.RESOLVED
      ) {
        filter.status = statusLower;
      }
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Pagination
    const { skip, limit: pageLimit } = helper.paginationFun({ page, limit });

    // If search query is provided, use aggregation with $lookup for searching across User fields
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i"); // Case-insensitive regex

      // Build aggregation pipeline
      const pipeline = [
        // Match base filters
        { $match: filter },
        // Lookup User collection
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        // Unwind user array (should be single user)
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        // Match search criteria (username, email, or title)
        {
          $match: {
            $or: [
              { title: { $regex: searchRegex } },
              { "user.username": { $regex: searchRegex } },
              { "user.email": { $regex: searchRegex } },
            ],
          },
        },
        // Project user fields to match populate structure
        {
          $project: {
            _id: 1,
            userId: {
              _id: "$user._id",
              username: "$user.username",
              email: "$user.email",
            },
            title: 1,
            description: 1,
            appVersion: 1,
            platform: 1,
            attachments: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        // Sort by createdAt descending
        { $sort: { createdAt: -1 } },
      ];

      // Get total count for pagination (before sort and pagination stages)
      const countPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { title: { $regex: searchRegex } },
              { "user.username": { $regex: searchRegex } },
              { "user.email": { $regex: searchRegex } },
            ],
          },
        },
        { $count: "total" },
      ];
      const countResult = await Feedback.aggregate(countPipeline);
      const totalItems = countResult[0]?.total || 0;

      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: pageLimit });

      // Execute aggregation
      const feedbackList = await Feedback.aggregate(pipeline);

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "Feedback list fetched successfully.",
        data: feedbackList,
        pagination: helper.paginationDetails({
          page,
          totalItems,
          limit: pageLimit,
        }),
      });
    }

    // Regular query without search
    const totalItems = await Feedback.countDocuments(filter);

    // Fetch feedback list
    const feedbackList = await Feedback.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Feedback list fetched successfully.",
      data: feedbackList,
      pagination: helper.paginationDetails({
        page,
        totalItems,
        limit: pageLimit,
      }),
    });
  } catch (error) {
    console.error("Get feedback error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: error.message || "Failed to fetch feedback.",
      data: null,
    });
  }
};

/**
 * Delete Feedback (Admin Side)
 * DELETE /api/v1/feedback/:id
 */
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid feedback ID format.",
        data: null,
      });
    }

    // Find feedback to get attachments before deleting
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Feedback not found.",
        data: null,
      });
    }

    // Delete attachments from storage if they exist
    if (feedback.attachments && feedback.attachments.length > 0) {
      await fileUploadService
        .bulkDeleteFiles(feedback.attachments)
        .catch((err) => {
          console.warn(
            "Warning: Failed to delete some attachments:",
            err.message
          );
        });
    }

    // Delete feedback from database
    await Feedback.findByIdAndDelete(id);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Feedback deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: error.message || "Failed to delete feedback.",
      data: null,
    });
  }
};

/**
 * Update Feedback Status (Admin Side)
 * PATCH /api/v1/feedback/:id/status
 */
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid feedback ID format.",
        data: null,
      });
    }

    // Validate status value
    const statusLower = status?.toLowerCase();
    if (
      statusLower !== enums.feedbackStatusEnum.PENDING &&
      statusLower !== enums.feedbackStatusEnum.RESOLVED
    ) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Status must be either 'pending' or 'resolved'.",
        data: null,
      });
    }

    // Find and update feedback
    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status: statusLower },
      { new: true, runValidators: true }
    ).populate("userId", "username email");

    if (!feedback) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Feedback not found.",
        data: null,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Feedback status updated successfully.",
      data: feedback,
    });
  } catch (error) {
    console.error("Update feedback status error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: error.message || "Failed to update feedback status.",
      data: null,
    });
  }
};

export default {
  createFeedback,
  getFeedback,
  deleteFeedback,
  updateFeedbackStatus,
};
