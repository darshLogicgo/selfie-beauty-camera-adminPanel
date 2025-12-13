import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import Uninstall from "../models/uninstall.model.js";
import helper from "../helper/common.helper.js";
import mongoose from "mongoose";

const createUninstall = async (req, res) => {
  try {
    // Ensure req.body exists
    if (!req.body || !req.body.uninstall_reason) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: req.body ? "uninstall_reason is required." : "Request body is missing.",
        data: null,
      });
    }

    const data = {
      userId: req.user._id,
      uninstall_reason: req.body.uninstall_reason,
    };

    // Only add optional fields if they are provided
    if (req.body.package_name) data.package_name = req.body.package_name;
    if (req.body.android_version) data.android_version = req.body.android_version;
    if (req.body.app_version) data.app_version = req.body.app_version;
    if (req.body.platform) data.platform = req.body.platform;
    if (req.body.device_model) data.device_model = req.body.device_model;
    if (req.body.other_reason_text) data.other_reason_text = req.body.other_reason_text;

    const record = await Uninstall.create(data);

    return apiResponse({
      res,
      statusCode: StatusCodes.CREATED,
      status: true,
      message: "Your feedback has been saved successfully.",
      data: record,
    });
  } catch (error) {
    console.log("Uninstall creation error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: error.message || "Failed to save uninstall feedback.",
      data: null,
    });
  }
};

// const getUninstall = async (req, res) => {
//   try {
//     if (req.query.id) {
//       // Validate ObjectId format
//       if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
//         return apiResponse({
//           res,
//           statusCode: StatusCodes.BAD_REQUEST,
//           status: false,
//           message: "Invalid ID format.",
//           data: null,
//         });
//       }

//       const record = await Uninstall.findById(req.query.id).populate("userId", "username email");
//       if (!record) {
//         return apiResponse({
//           res,
//           statusCode: StatusCodes.NOT_FOUND,
//           status: false,
//           message: "No record found with the given ID.",
//           data: null,
//         });
//       }

//       return apiResponse({
//         res,
//         statusCode: StatusCodes.OK,
//         status: true,
//         message: "Record fetched successfully.",
//         data: record,
//       });
//     }

//     const { startDate, endDate, uninstall_reason, platform, app_version, userId, page, limit } = req.query;
//     const filter = {};

//     console.log("=== Uninstall Query Params (BEFORE PROCESSING) ===");
//     console.log("Full req.query:", JSON.stringify(req.query, null, 2));
//     console.log("Extracted app_version:", app_version);
//     console.log("app_version type:", typeof app_version);
//     console.log("app_version value:", app_version);
//     console.log("app_version truthy check:", !!app_version);
//     console.log("app_version trim check:", app_version ? String(app_version).trim() : "N/A");

//     // Uninstall reason filter - exact match
//     if (uninstall_reason && uninstall_reason.trim() !== "") {
//       filter.uninstall_reason = uninstall_reason.trim();
//     }
    
//     // Platform filter - exact match (case-sensitive, should be lowercase: android, ios, web)
//     if (platform && platform.trim() !== "") {
//       filter.platform = platform.trim().toLowerCase();
//     }
//     // App version filter - exact match (case-insensitive)
//     // CRITICAL: Handle null values - some records have app_version: null
//     console.log("=== App Version Filter - START DEBUG ===");
//     console.log("Raw app_version from req.query:", app_version);
//     console.log("app_version type:", typeof app_version);
//     console.log("app_version === undefined:", app_version === undefined);
//     console.log("app_version === null:", app_version === null);
//     console.log("app_version truthy:", !!app_version);
    
//     if (app_version !== undefined && app_version !== null && String(app_version).trim() !== "") {
//       const versionStr = String(app_version).trim();
//       // Escape special regex characters (including dots)
//       const escapedVersion = versionStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
//       console.log("=== App Version Filter - APPLYING ===");
//       console.log("Trimmed version:", versionStr);
//       console.log("Escaped pattern:", escapedVersion);
//       console.log("Final regex pattern:", `^${escapedVersion}$`);
      
//       // Use $and to combine conditions for the same field
//       // This ensures we exclude null values and match exactly
//       if (!filter.$and) {
//         filter.$and = [];
//       }
      
//       // Add app_version conditions to $and
//       filter.$and.push(
//         { app_version: { $exists: true } },
//         { app_version: { $ne: null } },
//         { app_version: { $regex: `^${escapedVersion}$`, $options: "i" } }
//       );
      
//       console.log("Added 3 conditions to $and");
//       console.log("Total $and conditions now:", filter.$and.length);
      
//       // Test the regex pattern locally
//       const testRegex = new RegExp(`^${escapedVersion}$`, 'i');
//       console.log("Local regex test results:");
//       console.log("  '1.0.2' matches:", testRegex.test('1.0.2'));
//       console.log("  '2.1.0' matches:", testRegex.test('2.1.0'));
//       console.log("  '1.0.0' matches:", testRegex.test('1.0.0'));
//       console.log("  '1.0.3' matches:", testRegex.test('1.0.3'));
//       console.log("  '1.0.20' matches:", testRegex.test('1.0.20'));
//     } else {
//       console.log("=== App Version Filter - NOT APPLIED ===");
//       console.log("Reason: app_version is", app_version === undefined ? "undefined" : app_version === null ? "null" : "empty string");
//     }
//     if (userId) filter.userId = userId;

//     // Date filtering logic
//     // MongoDB stores createdAt as Date object (from timestamps: true)
//     // Frontend sends ISO strings like 2025-12-11T00:00:00.000Z
//     // We parse these and create Date objects for MongoDB $gte/$lte queries
    
//     const hasStartDate = startDate && typeof startDate === 'string' && startDate.trim() !== '';
//     const hasEndDate = endDate && typeof endDate === 'string' && endDate.trim() !== '';
    
//     if (hasStartDate || hasEndDate) {
//       const dateFilter = {};
      
//       // START DATE: Filter records where createdAt >= startDate (beginning of day)
//       if (hasStartDate) {
//         try {
//           const start = new Date(startDate);
//           if (!isNaN(start.getTime())) {
//             dateFilter.$gte = start;
//           }
//         } catch (error) {
//           console.log('Error parsing start date:', error.message);
//         }
//       }
      
//       // END DATE: Filter records where createdAt <= endDate (end of day)
//       if (hasEndDate) {
//         try {
//           const end = new Date(endDate);
//           if (!isNaN(end.getTime())) {
//             dateFilter.$lte = end;
//           }
//         } catch (error) {
//           console.log('Error parsing end date:', error.message);
//         }
//       }
      
//       // Apply date filter to MongoDB query if we have at least one valid date
//       if (Object.keys(dateFilter).length > 0) {
//         filter.createdAt = dateFilter;
//       }
//     }

//     const { skip, limit: pageLimit } = helper.paginationFun({ page, limit });
    
//     console.log("=== Final Filter Object ===");
//     console.log(JSON.stringify(filter, null, 2));
//     console.log("Filter keys:", Object.keys(filter));
//     if (filter.$and) {
//       console.log("$and array length:", filter.$and.length);
//       console.log("$and contents:", JSON.stringify(filter.$and, null, 2));
//     }
    
//     // Test query with just app_version to verify it works
//     if (filter.$and && filter.$and.some(cond => cond.app_version)) {
//       const appVersionOnlyFilter = {
//         $and: filter.$and.filter(cond => cond.app_version)
//       };
//       const testCount = await Uninstall.countDocuments(appVersionOnlyFilter);
//       console.log("=== TEST: App Version Only Filter ===");
//       console.log("Filter:", JSON.stringify(appVersionOnlyFilter, null, 2));
//       console.log("Count with app_version filter only:", testCount);
//     }
    
//     const totalItems = await Uninstall.countDocuments(filter);
    
//     console.log("=== Query Results ===");
//     console.log("Total items matching all filters:", totalItems);
    
//     const list = await Uninstall.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(pageLimit)
//       .populate('userId', 'username email');

//     return apiResponse({
//       res,
//       statusCode: StatusCodes.OK,
//       status: true,
//       message: "Records fetched successfully.",
//       data: list,
//       pagination: helper.paginationDetails({
//         page,
//         totalItems,
//         limit: pageLimit,
//       }),
//     });
//   } catch (error) {
//     console.log(error);
//     return apiResponse({
//       res,
//       statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
//       status: false,
//       message: "Failed to fetch uninstall records.",
//       data: null,
//     });
//   }
// };
const getUninstall = async (req, res) => {
  try {
    // If ID is provided, return that specific record
    if (req.query.id) {
      if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
        return apiResponse({
          res,
          statusCode: StatusCodes.BAD_REQUEST,
          status: false,
          message: "Invalid ID format.",
          data: null,
        });
      }

      const record = await Uninstall.findById(req.query.id)
        .populate("userId", "username email");

      if (!record) {
        return apiResponse({
          res,
          statusCode: StatusCodes.NOT_FOUND,
          status: false,
          message: "No record found with the given ID.",
          data: null,
        });
      }

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "Record fetched successfully.",
        data: record,
      });
    }

    // Extract filters
    const { startDate, endDate, uninstall_reason, platform, app_version, userId, page, limit } = req.query;

    // Build MongoDB filter object
    const filter = {};

    // Uninstall Reason Filter (Exact)
    if (uninstall_reason) {
      filter.uninstall_reason = uninstall_reason.trim();
    }

    // Platform Filter
    if (platform) {
      filter.platform = platform.trim().toLowerCase();
    }

    // ⭐ APP VERSION FILTER
    if (app_version && String(app_version).trim() !== "") {
      const versionStr = String(app_version).trim();
      if (versionStr === "none") {
        // Filter for records where app_version is null, undefined, or empty
        // Use $or to match any of these conditions
        filter.$or = [
          { app_version: { $exists: false } },
          { app_version: null },
          { app_version: "" },
        ];
      } else {
        filter.app_version = versionStr;
      }
    }

    // User filter
    if (userId) {
      filter.userId = userId;
    }

    // Date Filtering
    const hasStart = startDate && startDate.trim() !== "";
    const hasEnd = endDate && endDate.trim() !== "";

    if (hasStart || hasEnd) {
      filter.createdAt = {};
      if (hasStart) filter.createdAt.$gte = new Date(startDate);
      if (hasEnd) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const { skip, limit: pageLimit } = helper.paginationFun({ page, limit });

    // Count
    const total = await Uninstall.countDocuments(filter);

    // List
    const list = await Uninstall.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate("userId", "username email");

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Records fetched successfully.",
      data: list,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: pageLimit,
      }),
    });

  } catch (error) {
    console.log(error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch uninstall records.",
      data: null,
    });
  }
};

const deleteUninstall = async (req, res) => {
  try {
    const deleted = await Uninstall.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "No record found with the given ID.",
        data: null,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Record deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    console.log(error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to delete uninstall record.",
      data: null,
    });
  }
};

const getAppVersions = async (req, res) => {
  try {
    // Get all distinct app_version values from database (excluding null/undefined)
    const appVersions = await Uninstall.distinct('app_version', {
      app_version: { $ne: null, $exists: true }
    });
    
    // Sort versions (handle semantic versioning if needed)
    const sortedVersions = appVersions
      .filter(v => v && String(v).trim() !== '')
      .map(v => String(v).trim())
      .sort((a, b) => {
        // Simple string sort, can be enhanced for semantic versioning
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "App versions fetched successfully.",
      data: sortedVersions,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch app versions.",
      data: null,
    });
  }
};

export default {
  createUninstall,
  getUninstall,
  deleteUninstall,
  getAppVersions,
};

