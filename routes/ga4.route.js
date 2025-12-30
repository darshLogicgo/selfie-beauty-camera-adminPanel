import express from "express";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import ga4Controller from "../controllers/ga4.controller.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/ga4/users/demographics
 * Get country-wise user distribution from GA4
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), propertyId, period (daily/weekly/monthly)
 * @access Private (Admin)
 */
route.get(
  "/users/demographics",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  ga4Controller.getUserDemographics
);

/**
 * GET /api/v1/ga4/users/app-versions
 * Get app version usage from GA4
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), propertyId, period (daily/weekly/monthly)
 * @access Private (Admin)
 */
route.get(
  "/users/app-versions",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  ga4Controller.getAppVersions
);

/**
 * GET /api/v1/ga4/funnel
 * Get user funnel data from GA4 (App Opens -> Photo Uploads -> Feature Used -> Paywall Shown -> Purchases)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), propertyId, period (daily/weekly/monthly)
 * @access Private (Admin)
 */
route.get(
  "/funnel",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  ga4Controller.getUserFunnel
);

/**
 * GET /api/v1/ga4/revenue/trend
 * Get revenue trend from GA4
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), propertyId, period (daily/weekly/monthly/yearly)
 * @access Private (Admin)
 */
route.get(
  "/revenue/trend",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  ga4Controller.getRevenueTrend
);

/**
 * GET /api/v1/ga4/engagement-time
 * Get average engagement time trend from GA4
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), propertyId, period (daily/weekly/monthly/yearly)
 * @access Private (Admin)
 */
route.get(
  "/engagement-time",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  ga4Controller.getAverageEngagementTime
);

export default route;

