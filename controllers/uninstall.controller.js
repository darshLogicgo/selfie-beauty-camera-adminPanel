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

const getUninstall = async (req, res) => {
  try {
    if (req.query.id) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
        return apiResponse({
          res,
          statusCode: StatusCodes.BAD_REQUEST,
          status: false,
          message: "Invalid ID format.",
          data: null,
        });
      }

      const record = await Uninstall.findById(req.query.id).populate("userId", "username email");
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

    const { startDate, endDate, uninstall_reason, platform, userId, page, limit } = req.query;
    const filter = {};

    if (uninstall_reason) filter.uninstall_reason = uninstall_reason;
    if (platform) filter.platform = platform;
    if (userId) filter.userId = userId;

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const { skip, limit: pageLimit } = helper.paginationFun({ page, limit });
    const totalItems = await Uninstall.countDocuments(filter);

    const list = await Uninstall.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Records fetched successfully.",
      data: list,
      pagination: helper.paginationDetails({
        page,
        totalItems,
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

export default {
  createUninstall,
  getUninstall,
  deleteUninstall,
};

