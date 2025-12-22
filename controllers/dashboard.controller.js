import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import Category from "../models/category.model.js";
import UserModel from "../models/user.model.js";
import MediaClicks from "../models/mediaclicks.model.js";
import categoryService from "../services/category.service.js";
import userServices from "../services/user.service.js";
import { runAiEditReminderCron } from "../cron/aiEditReminder.cron.js";
import { runCoreActiveUsersCron } from "../cron/coreActiveUsers.cron.js";
import { runRecentlyActiveUsersCron } from "../cron/recentlyActiveUsers.cron.js";
import { runInactiveUsersCron } from "../cron/inactiveUsers.cron.js";
import { runChurnedUsersCron } from "../cron/churnedUsers.cron.js";
import { runViralUsersCron } from "../cron/viralUsers.cron.js";
import { runSavedEditUsersCron } from "../cron/savedEditUsers.cron.js";
import { runStyleOpenedUsersCron } from "../cron/styleOpenedUsers.cron.js";
import { runStreakUsersCron } from "../cron/streakUsers.cron.js";

/**
 * Get dashboard statistics
 * Returns: Total categories, Active categories, Total users, Total subscribed users, Most used categories
 * @route GET /api/v1/dashboard/stats
 * @access Private (Admin)
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get collection names
    const categoryCollectionName = Category.collection.name;
    const mediaClicksCollectionName = MediaClicks.collection.name;
    const userCollectionName = UserModel.collection.name;

    // Parallel queries for better performance
    const [
      totalCategories,
      activeCategories,
      totalUsers,
      subscribedUsers,
      mostUsedCategories,
    ] = await Promise.all([
      // Total categories (excluding deleted)
      categoryService.countDocuments({ isDeleted: false }),

      // Active categories (status: true, excluding deleted)
      categoryService.countDocuments({ isDeleted: false, status: true }),

      // Total users (excluding deleted)
      userServices.countDocuments({ isDeleted: false }),

      // Subscribed users (isSubscribed: true, excluding deleted)
      userServices.countDocuments({ isDeleted: false, isSubscribed: true }),

      // Most used categories - aggregate from mediaclicks model
      // Count unique users per category (only count users that exist and are not deleted)
      MediaClicks.aggregate([
        // First, join with users collection to filter out deleted users
        {
          $lookup: {
            from: userCollectionName, // Use actual collection name
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        // Filter out documents where user doesn't exist or is deleted
        {
          $match: {
            "user.isDeleted": { $ne: true },
            "user.0": { $exists: true }, // Ensure user exists
          },
        },
        // Unwind the categories array to get individual category entries
        { $unwind: "$categories" },
        // Filter out categories with null or undefined categoryId
        {
          $match: {
            "categories.categoryId": { $ne: null, $exists: true },
          },
        },
        // Group by categoryId and count distinct users
        {
          $group: {
            _id: "$categories.categoryId",
            totalUsers: { $addToSet: "$userId" }, // Get unique user IDs
          },
        },
        // Count the number of unique users
        {
          $project: {
            _id: 1,
            totalUsers: { $size: "$totalUsers" }, // Count unique users
          },
        },
        // Join with Category collection to get category details
        // Use the actual collection name from the model
        {
          $lookup: {
            from: categoryCollectionName, // Use actual collection name
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        // Unwind the category array (should be single item)
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: false } },
        // Filter out deleted categories
        { $match: { "category.isDeleted": { $ne: true } } },
        // Project only needed fields
        {
          $project: {
            _id: "$category._id",
            name: "$category.name",
            mediaclicks: "$totalUsers", // Renamed to mediaclicks for frontend compatibility, but it's actually user count
            status: "$category.status",
            image: "$category.img_sqr",
          },
        },
        // Sort by total users descending
        { $sort: { mediaclicks: -1 } },
        // Limit to top 5 most used categories
        { $limit: 5 },
      ]).catch((err) => {
        return []; // Return empty array on error
      }),
    ]);

    // Ensure mostUsedCategories is an array
    const formattedCategories = Array.isArray(mostUsedCategories)
      ? mostUsedCategories.map((cat) => ({
          _id: cat._id,
          name: cat.name,
          mediaclicks: cat.mediaclicks || 0,
          status: cat.status,
          image: cat.image || null,
        }))
      : [];

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalCategories,
        activeCategories,
        totalUsers,
        subscribedUsers,
        mostUsedCategories: formattedCategories,
      },
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch dashboard stats",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Test endpoint to manually trigger AI Edit Reminder cron job
 * @route POST /api/v1/dashboard/test-ai-edit-reminder-cron
 * @access Private (Admin)
 */
const testAiEditReminderCron = async (req, res) => {
  try {
    const result = await runStreakUsersCron();
    
    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: result.success,
      message: result.success 
        ? "Streak Users cron executed successfully" 
        : "Streak Users cron execution failed",
      data: result,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to execute AI Edit Reminder cron",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getDashboardStats,
  testAiEditReminderCron,
};
