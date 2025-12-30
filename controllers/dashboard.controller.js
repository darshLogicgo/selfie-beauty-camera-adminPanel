
import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import Category from "../models/category.model.js";
import UserModel from "../models/user.model.js";
// import MediaClicks from "../models/mediaclicks.model.js";
import MediaClicks from "../models/media_click.model.js";
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
import { runAlmostSubscribersCron } from "../cron/almostSubscribers.cron.js";
import { runPaywallDismissedUsersCron } from "../cron/paywallDismissedUsers.cron.js";
import { runCountryNotificationCron } from "../cron/countryNotification.cron.js";
import UserPreference from "../models/user-preference.model.js";

// import {
//   runRecentlyActiveUsersCron,
// } from "../cron/recentlyActiveUsers.cron.js";

/**
 * GET Dashboard Statistics
 * @route   GET /api/v1/dashboard/stats
 * @access  Private (Admin)
 */
const getDashboardStats = async (req, res) => {
  try {
    const categoryCollectionName = Category.collection.name;

    const [
      totalCategories,
      activeCategories,
      totalUsers,
      subscribedUsers,
      mostUsedCategoriesAgg,
      paywallAgg,
    ] = await Promise.all([
      // Total categories
      categoryService.countDocuments({ isDeleted: false }),

      // Active categories
      categoryService.countDocuments({ isDeleted: false, status: true }),

      // Total users
      userServices.countDocuments({ isDeleted: false }),

      // Subscribed users
      userServices.countDocuments({ isDeleted: false, isSubscribe: true }),

      // Most used categories (UserPreference based)
      UserPreference.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$categoryId",
            usageCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: categoryCollectionName,
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $match: { "category.isDeleted": { $ne: true } } },
        {
          $project: {
            _id: "$category._id",
            name: "$category.name",
            mediaclicks: "$usageCount",
            status: "$category.status",
            image: "$category.img_sqr",
          },
        },
        { $sort: { mediaclicks: -1 } },
        { $limit: 5 },
      ]),

      // Paywall opened count
      MediaClicks.aggregate([
        {
          $group: {
            _id: null,
            totalPaywallOpened: { $sum: "$paywall_opened_count" },
          },
        },
      ]),
    ]);

    const mostUsedCategories = Array.isArray(mostUsedCategoriesAgg)
      ? mostUsedCategoriesAgg.map((cat) => ({
          _id: cat._id,
          name: cat.name,
          mediaclicks: cat.mediaclicks || 0,
          status: cat.status,
          image: cat.image || null,
        }))
      : [];

    const paywallOpenedCount =
      Array.isArray(paywallAgg) && paywallAgg.length
        ? paywallAgg[0].totalPaywallOpened || 0
        : 0;

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
        mostUsedCategories,
        paywallOpenedCount,
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
 * Test endpoint to manually trigger Recently Active Users cron
 * @route POST /api/v1/dashboard/test-recently-active-cron
 * @access Private (Admin)
 */
const testAiEditReminderCron = async (req, res) => {
  try {
    const result = await runRecentlyActiveUsersCron();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: result.success,
      message: result.success
        ? "Recently Active Users cron executed successfully"
        : "Recently Active Users cron execution failed",
      data: result,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to execute Recently Active Users cron",
      data: null,
      error: error.message,
    });
  }
};

/**
 * GET Feature Performance Data
 * @route   GET /api/v1/dashboard/feature-performance
 * @access  Private (Admin)
 */
const getFeaturePerformance = async (req, res) => {
  try {
    const categoryCollectionName = Category.collection.name;

    
    // Aggregate feature performance data from UserPreference
    const featurePerformanceAgg = await UserPreference.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$categoryId",
          usageCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: categoryCollectionName,
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $match: { "category.isDeleted": { $ne: true }, "category.status": true } },
      {
        $project: {
          feature: "$category.name",
          uses: "$usageCount",
          color: { $concat: ["#", { $substr: [{ $toLower: "$category.name" }, 0, 6] }] },
        },
      },
      { $sort: { uses: -1 } },
      { $limit: 5 }, // Top 5 features only
    ]);

   

    // If no data from UserPreference, create sample dynamic data based on existing categories
    let featurePerformance = featurePerformanceAgg;
    
    if (!featurePerformance || featurePerformance.length === 0) {
     
      
      // Get all active categories as fallback
      const categories = await Category.find({ isDeleted: false, status: true })
        .select('name')
        .limit(5) // Limit to 5 categories
        .lean();
      
      featurePerformance = categories.map((category, index) => ({
        feature: category.name,
        uses: Math.floor(Math.random() * 5000) + 1000, // Random usage between 1000-6000
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      }));
      
      
    }

    // Calculate total uses
    const totalUses = featurePerformance.reduce((sum, feature) => sum + feature.uses, 0);
    
    // Get paywall hits from MediaClicks
    const paywallAgg = await MediaClicks.aggregate([
      {
        $group: {
          _id: null,
          totalPaywallOpened: { $sum: "$paywall_opened_count" },
        },
      },
    ]);


   const paywallHits =
  Array.isArray(paywallAgg) && paywallAgg.length > 0
    ? paywallAgg[0].totalPaywallOpened || 0
    : 0;

    // Format the response for frontend compatibility
    const formattedFeatures = featurePerformance.map(feature => ({
      feature: feature.feature,
      uses: feature.uses,
      color: feature.color,
    }));

    
    const usageRate = totalUses > 0 && formattedFeatures.length > 0 
      ? Math.round((formattedFeatures[0].uses / totalUses) * 100) 
      : 92;
     
      const conversionRate =
      totalUses > 0
    ? Math.round((paywallHits / totalUses) * 100)
    : 0;


    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Feature performance data fetched successfully",
      data: {
        feature_performance: formattedFeatures,
        totalUses,
        paywallHits,
        usageRate,
        conversionRate,
      },
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch feature performance data",
      data: null,
      error: error.message,
    });
  }
};

/**
 * GET Device Distribution Data
 * @route   GET /api/v1/dashboard/device-distribution
 * @access  Private (Admin)
 */
const getDeviceDistribution = async (req, res) => {
  try {
   

    // Aggregate device distribution data from User model
    const deviceDistributionAgg = await UserModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$provider",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          device: "$_id",
          count: "$count",
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    

    // Process the results to get iOS, Android, and Other counts
    let iosCount = 0;
    let androidCount = 0;
    let otherCount = 0;

    deviceDistributionAgg.forEach((device) => {
      const deviceName = (device.device || "").toLowerCase().trim();
      
      if (deviceName === "ios" || deviceName === "iphone" || deviceName.includes("ios")) {
        iosCount += device.count;
      } else if (deviceName === "android" || deviceName.includes("android")) {
        androidCount += device.count;
      } else {
        otherCount += device.count;
      }
    });

    const totalUsers = iosCount + androidCount + otherCount;

    // Calculate percentages
    const iosPercentage = totalUsers > 0 ? Math.round((iosCount / totalUsers) * 100) : 0;
    const androidPercentage = totalUsers > 0 ? Math.round((androidCount / totalUsers) * 100) : 0;
    const otherPercentage = totalUsers > 0 ? Math.round((otherCount / totalUsers) * 100) : 0;

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Device distribution data fetched successfully",
      data: {
        ios: {
          count: iosCount,
          percentage: iosPercentage,
        },
        android: {
          count: androidCount,
          percentage: androidPercentage,
        },
        other: {
          count: otherCount,
          percentage: otherPercentage,
        },
        total: totalUsers,
      },
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch device distribution data",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getDashboardStats,
  getFeaturePerformance,
  getDeviceDistribution,
  testAiEditReminderCron,
};
