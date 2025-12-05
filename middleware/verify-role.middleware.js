import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";

/**
 * Check permissions for a given user and return the permissions
 */
export const checkPermission = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      return apiResponse({
        res,
        message: "You are not authorized to perform this action.",
        statusCode: StatusCodes.UNAUTHORIZED,
      });
    }
  };
};
