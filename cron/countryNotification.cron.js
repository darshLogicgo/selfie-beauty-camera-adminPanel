import moment from "moment-timezone";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import UserModel from "../models/user.model.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Consolidated Country-Specific Notification Cron
 * Runs all notification types together based on country timezone
 * Executes every 30 minutes between 8 PM - 9:30 PM
 * Ensures each user receives only ONE notification per execution
 */

// Import all cron functions
import { runBrandNewUsersCron } from "./brandNewUsers.cron.js";
import { runAiEditReminderCron } from "./aiEditReminder.cron.js";
import { runCoreActiveUsersCron } from "./coreActiveUsers.cron.js";
import { runRecentlyActiveUsersCron } from "./recentlyActiveUsers.cron.js";
import { runInactiveUsersCron } from "./inactiveUsers.cron.js";
import { runChurnedUsersCron } from "./churnedUsers.cron.js";
import { runViralUsersCron } from "./viralUsers.cron.js";
import { runSavedEditUsersCron } from "./savedEditUsers.cron.js";
import { runStyleOpenedUsersCron } from "./styleOpenedUsers.cron.js";
import { runStreakUsersCron } from "./streakUsers.cron.js";
import { runAlmostSubscribersCron } from "./almostSubscribers.cron.js";
import { runPaywallDismissedUsersCron } from "./paywallDismissedUsers.cron.js";

// Global set to track users who have already been notified in this execution
let notifiedUsers = new Set();

/**
 * Reset notified users tracker
 */
const resetNotifiedUsers = () => {
  notifiedUsers.clear();
  logger.info("Notified users tracker reset");
};

/**
 * Check if user has already been notified
 */
export const isUserAlreadyNotified = (userId) => {
  return notifiedUsers.has(userId.toString());
};

/**
 * Mark user as notified
 */
export const markUserAsNotified = (userId) => {
  notifiedUsers.add(userId.toString());
};

/**
 * Get count of notified users
 */
export const getNotifiedUsersCount = () => {
  return notifiedUsers.size;
};

// Main consolidated cron job function
export const runCountryNotificationCron = async () => {
  logger.info("CRON START >> Consolidated Country-Specific Notification Cron");

  // Reset notified users tracker at the start of each execution
  resetNotifiedUsers();

  try {
    // Get countries currently in notification window
    const activeCountries = getCountriesInNotificationWindow();

    if (activeCountries.length === 0) {
      logger.info("No countries in notification window, skipping all cron executions");
      return {
        success: true,
        message: "No countries in notification window",
        data: { activeCountries: [], totalNotifications: 0, uniqueUsersNotified: 0 },
      };
    }

    logger.info(`Active countries: ${activeCountries.join(", ")}`);

    // Execute all cron jobs sequentially
    const results = {
      activeCountries,
      cronResults: {},
      totalNotifications: 0,
      startTime: new Date(),
    };

    // 0. Brand New Users (priority - new users need activation)
    try {
      logger.info("Executing Brand New Users cron...");
      const brandNewResult = await runBrandNewUsersCron();
      results.cronResults.brandNewUsers = brandNewResult;
      results.totalNotifications += brandNewResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Brand New Users cron:", error);
      results.cronResults.brandNewUsers = { success: false, error: error.message };
    }

    // 1. AI Edit Reminder
    try {
      logger.info("Executing AI Edit Reminder cron...");
      const aiEditResult = await runAiEditReminderCron();
      results.cronResults.aiEditReminder = aiEditResult;
      results.totalNotifications += aiEditResult.successCount || 0;
    } catch (error) {
      logger.error("Error in AI Edit Reminder cron:", error);
      results.cronResults.aiEditReminder = { success: false, error: error.message };
    }

    // 2. Core Active Users
    try {
      logger.info("Executing Core Active Users cron...");
      const coreActiveResult = await runCoreActiveUsersCron();
      results.cronResults.coreActiveUsers = coreActiveResult;
      results.totalNotifications += coreActiveResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Core Active Users cron:", error);
      results.cronResults.coreActiveUsers = { success: false, error: error.message };
    }

    // 3. Recently Active Users
    try {
      logger.info("Executing Recently Active Users cron...");
      const recentlyActiveResult = await runRecentlyActiveUsersCron();
      results.cronResults.recentlyActiveUsers = recentlyActiveResult;
      results.totalNotifications += recentlyActiveResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Recently Active Users cron:", error);
      results.cronResults.recentlyActiveUsers = { success: false, error: error.message };
    }

    // 4. Inactive Users
    try {
      logger.info("Executing Inactive Users cron...");
      const inactiveResult = await runInactiveUsersCron();
      results.cronResults.inactiveUsers = inactiveResult;
      results.totalNotifications += inactiveResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Inactive Users cron:", error);
      results.cronResults.inactiveUsers = { success: false, error: error.message };
    }

    // 5. Churned Users
    try {
      logger.info("Executing Churned Users cron...");
      const churnedResult = await runChurnedUsersCron();
      results.cronResults.churnedUsers = churnedResult;
      results.totalNotifications += churnedResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Churned Users cron:", error);
      results.cronResults.churnedUsers = { success: false, error: error.message };
    }

    // 6. Viral Users
    try {
      logger.info("Executing Viral Users cron...");
      const viralResult = await runViralUsersCron();
      results.cronResults.viralUsers = viralResult;
      results.totalNotifications += viralResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Viral Users cron:", error);
      results.cronResults.viralUsers = { success: false, error: error.message };
    }

    // 7. Saved Edit Users
    try {
      logger.info("Executing Saved Edit Users cron...");
      const savedEditResult = await runSavedEditUsersCron();
      results.cronResults.savedEditUsers = savedEditResult;
      results.totalNotifications += savedEditResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Saved Edit Users cron:", error);
      results.cronResults.savedEditUsers = { success: false, error: error.message };
    }

    // 8. Style Opened Users
    try {
      logger.info("Executing Style Opened Users cron...");
      const styleOpenedResult = await runStyleOpenedUsersCron();
      results.cronResults.styleOpenedUsers = styleOpenedResult;
      results.totalNotifications += styleOpenedResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Style Opened Users cron:", error);
      results.cronResults.styleOpenedUsers = { success: false, error: error.message };
    }

    // 9. Streak Users
    try {
      logger.info("Executing Streak Users cron...");
      const streakResult = await runStreakUsersCron();
      results.cronResults.streakUsers = streakResult;
      results.totalNotifications += streakResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Streak Users cron:", error);
      results.cronResults.streakUsers = { success: false, error: error.message };
    }

    // 10. Almost Subscribers
    try {
      logger.info("Executing Almost Subscribers cron...");
      const almostSubsResult = await runAlmostSubscribersCron();
      results.cronResults.almostSubscribers = almostSubsResult;
      results.totalNotifications += almostSubsResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Almost Subscribers cron:", error);
      results.cronResults.almostSubscribers = { success: false, error: error.message };
    }

    // 11. Paywall Dismissed Users
    try {
      logger.info("Executing Paywall Dismissed Users cron...");
      const paywallResult = await runPaywallDismissedUsersCron();
      results.cronResults.paywallDismissedUsers = paywallResult;
      results.totalNotifications += paywallResult.successCount || 0;
    } catch (error) {
      logger.error("Error in Paywall Dismissed Users cron:", error);
      results.cronResults.paywallDismissedUsers = { success: false, error: error.message };
    }

    results.endTime = new Date();
    results.executionTime = results.endTime - results.startTime;
    results.uniqueUsersNotified = getNotifiedUsersCount();

    logger.info(
      `CRON COMPLETE >> Consolidated Country Notification | Total Notifications: ${results.totalNotifications} | Unique Users: ${results.uniqueUsersNotified} | Execution Time: ${results.executionTime}ms`
    );

    return {
      success: true,
      message: "Consolidated country notification cron completed",
      data: results,
    };
  } catch (error) {
    logger.error("Error in consolidated country notification cron job:", error);
    return { success: false, error: error.message };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.COUNTRY_NOTIFICATION, async () => {
  try {
    await runCountryNotificationCron();
  } catch (error) {
    logger.error("Error executing consolidated country notification cron:", error);
  }
});

