import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";

/**
 * Verify user role middleware
 * Checks if user's role is in the allowed roles list
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const verifyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return apiResponse({
          res,
          statusCode: StatusCodes.UNAUTHORIZED,
          status: false,
          message: "User not authenticated",
        });
      }

      const userRole = req.user.role;

      if (!allowedRoles || allowedRoles.length === 0) {
        return next();
      }

      if (allowedRoles.includes(userRole)) {
        return next();
      }

      return apiResponse({
        res,
        statusCode: StatusCodes.FORBIDDEN,
        status: false,
        message: "You are not authorized to perform this action.",
      });
    } catch (error) {
      console.error("Role Verification Error:", error);
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        status: false,
        message: "Error verifying user role",
      });
    }
  };
};

export default verifyRole;
export const checkPermission = verifyRole;
