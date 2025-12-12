import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import Feedback from "../models/feedback.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

/**
 * Get feedback list with pagination and filters
 * @route GET /api/v1/feedback
 * @access Private (Admin)
 */
const getFeedback = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    
    // Decode URL-encoded search term (handles cases like admin%40test.com -> admin@test.com)
    let decodedSearch = search;
    if (search && typeof search === 'string') {
      try {
        decodedSearch = decodeURIComponent(search);
      } catch (e) {
        // If decoding fails, use original search term
        decodedSearch = search;
      }
    }
    
    console.log("Feedback search query:", { 
      original: search, 
      decoded: decodedSearch, 
      status,
      page, 
      limit 
    });
    
    const pageNum = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);
    const skip = (pageNum - 1) * pageLimit;

    let filter = {};
    let userIds = [];
    let statusFilter = null;
    let searchFilter = null;

    // Status filter
    if (status && (status === "pending" || status === "resolved")) {
      if (status === "pending") {
        // Include records with status "pending" OR null/undefined (default pending)
        statusFilter = {
          $or: [
            { status: "pending" },
            { status: { $exists: false } },
            { status: null },
          ],
        };
      } else {
        statusFilter = { status: status };
      }
    }

    // Search functionality
    if (decodedSearch && decodedSearch.trim()) {
      const searchTerm = decodedSearch.trim();
      
      // Escape special regex characters to prevent regex injection
      const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Search in User collection for matching username or email
      const matchingUsers = await User.find({
        $or: [
          { username: { $regex: escapedSearchTerm, $options: "i" } },
          { email: { $regex: escapedSearchTerm, $options: "i" } },
        ],
      }).select("_id");

      userIds = matchingUsers.map((user) => user._id);

      // Build search filter with feedback fields and user IDs
      searchFilter = {
        $or: [
          { title: { $regex: escapedSearchTerm, $options: "i" } },
          { description: { $regex: escapedSearchTerm, $options: "i" } },
        ],
      };

      // If matching users found, add userId filter
      if (userIds.length > 0) {
        searchFilter.$or.push({ userId: { $in: userIds } });
      }
      
      console.log("Feedback search - term:", searchTerm);
      console.log("Feedback search - escaped term:", escapedSearchTerm);
      console.log("Feedback search - matching users:", userIds.length);
    }
    
    // Combine filters using $and if both exist, otherwise use them directly
    if (statusFilter && searchFilter) {
      filter.$and = [statusFilter, searchFilter];
    } else if (statusFilter) {
      filter = { ...filter, ...statusFilter };
    } else if (searchFilter) {
      filter = { ...filter, ...searchFilter };
    }
    
    console.log("Feedback search - final filter:", JSON.stringify(filter, null, 2));

    // Get total count
    const totalItems = await Feedback.countDocuments(filter);

    // Get paginated list
    const list = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate("userId", "username email");

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Feedback list fetched successfully.",
      data: list,
      pagination: {
        page: pageNum,
        totalPages: Math.ceil(totalItems / pageLimit),
        totalItems,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.log("Get feedback error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch feedback list.",
      data: null,
    });
  }
};

/**
 * Update feedback status
 * @route PATCH /api/v1/feedback/:id/status
 * @access Private (Admin)
 */
const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid feedback ID format.",
        data: null,
      });
    }

    // Validate status
    if (!status || !["pending", "resolved"].includes(status)) {
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
      { status, updatedAt: new Date() },
      { new: true }
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
      message: `Feedback marked as ${status} successfully.`,
      data: feedback,
    });
  } catch (error) {
    console.log("Update feedback status error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to update feedback status.",
      data: null,
    });
  }
};

export default {
  getFeedback,
  updateFeedbackStatus,
};
