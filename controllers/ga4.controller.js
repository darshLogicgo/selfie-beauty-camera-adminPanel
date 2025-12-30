import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import GA4Service from "../services/ga4.service.js";
import config from "../config/config.js";

/**
 * Get active users from GA4
 * @route GET /api/v1/ga4/users
 * @access Private (Admin)
 */
const getUsers = async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;

    // Use propertyId from query or config default
    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";

    // Validate propertyId
    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    // Fetch active users from GA4
    const result = await GA4Service.getActiveUsers(
      ga4PropertyId,
      startDate,
      endDate
    );

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch users from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Users fetched successfully from GA4",
      data: result.data,
      summary: result.summary,
    });
  } catch (error) {
    console.error("❌ Error in getUsers controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get user demographics from GA4
 * @route GET /api/v1/ga4/users/demographics
 * @access Private (Admin)
 */
const getUserDemographics = async (req, res) => {
  try {
    const { startDate, endDate, propertyId, period } = req.query;

    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";
    const periodType = period || "weekly"; // daily, weekly, monthly

    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    // Validate period
    if (!["daily", "weekly", "monthly"].includes(periodType)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Period must be one of: daily, weekly, monthly",
      });
    }

    const result = await GA4Service.getUserDemographics(
      ga4PropertyId,
      startDate,
      endDate,
      periodType
    );

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch user demographics from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User demographics fetched successfully from GA4",
      data: result.data,
      period: result.period,
      dateRange: result.dateRange,
    });
  } catch (error) {
    console.error("❌ Error in getUserDemographics controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get real-time active users from GA4
 * @route GET /api/v1/ga4/users/realtime
 * @access Private (Admin)
 */
const getRealtimeUsers = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";

    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    const result = await GA4Service.getRealtimeUsers(ga4PropertyId);

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch real-time users from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Real-time users fetched successfully from GA4",
      data: result.data,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("❌ Error in getRealtimeUsers controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get user funnel data from GA4
 * @route GET /api/v1/ga4/funnel
 * @access Private (Admin)
 */
const getUserFunnel = async (req, res) => {
  try {
    const { startDate, endDate, propertyId, period } = req.query;

    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";
    const periodType = period || "weekly"; // daily, weekly, monthly

    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    // Validate period
    if (!["daily", "weekly", "monthly"].includes(periodType)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Period must be one of: daily, weekly, monthly",
      });
    }

    const result = await GA4Service.getUserFunnel(
      ga4PropertyId,
      startDate,
      endDate,
      periodType
    );

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch user funnel from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User funnel fetched successfully from GA4",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error in getUserFunnel controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get app version usage from GA4
 * @route GET /api/v1/ga4/users/app-versions
 * @access Private (Admin)
 */
const getAppVersions = async (req, res) => {
  try {
    const { startDate, endDate, propertyId, period } = req.query;

    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";
    const periodType = period || "weekly"; // daily, weekly, monthly

    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    // Validate period
    if (!["daily", "weekly", "monthly"].includes(periodType)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Period must be one of: daily, weekly, monthly",
      });
    }

    const result = await GA4Service.getAppVersions(
      ga4PropertyId,
      startDate,
      endDate,
      periodType
    );

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch app versions from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "App versions fetched successfully from GA4",
      data: result.data,
      period: result.period,
      dateRange: result.dateRange,
    });
  } catch (error) {
    console.error("❌ Error in getAppVersions controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get revenue trend from GA4
 * @route GET /api/v1/ga4/revenue/trend
 * @access Private (Admin)
 */
const getRevenueTrend = async (req, res) => {
  try {
    const { startDate, endDate, propertyId, period } = req.query;

    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";
    const periodType = period || "weekly"; // daily, weekly, monthly

    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    // Validate period
    if (!["daily", "weekly", "monthly", "yearly"].includes(periodType)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Period must be one of: daily, weekly, monthly",
      });
    }

    const result = await GA4Service.getRevenueTrend(
      ga4PropertyId,
      startDate,
      endDate,
      periodType
    );

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch revenue trend from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Revenue trend fetched successfully from GA4",
      data: result.data,
      period: result.period,
      dateRange: result.dateRange,
    });
  } catch (error) {
    console.error("❌ Error in getRevenueTrend controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get average engagement time trend from GA4
 * @route GET /api/v1/ga4/engagement-time
 * @access Private (Admin)
 */
const getAverageEngagementTime = async (req, res) => {
  try {
    const { startDate, endDate, propertyId, period } = req.query;

    const ga4PropertyId = propertyId || config.ga4?.propertyId || "443553869";
    const periodType = period || "weekly"; // daily, weekly, monthly, yearly

    if (!ga4PropertyId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "GA4 Property ID is required",
      });
    }

    // Validate period
    if (!["daily", "weekly", "monthly", "yearly"].includes(periodType)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Period must be one of: daily, weekly, monthly, yearly",
      });
    }

    const result = await GA4Service.getAverageEngagementTime(
      ga4PropertyId,
      startDate,
      endDate,
      periodType
    );

    if (!result.success) {
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Failed to fetch average engagement time from GA4",
        error: result.error,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Average engagement time fetched successfully from GA4",
      data: result.data,
      period: result.period,
      dateRange: result.dateRange,
    });
  } catch (error) {
    console.error("❌ Error in getAverageEngagementTime controller:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default {
  getUsers,
  getUserDemographics,
  getRealtimeUsers,
  getUserFunnel,
  getAppVersions,
  getRevenueTrend,
  getAverageEngagementTime,
};

