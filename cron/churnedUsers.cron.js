import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to fully churned users who:
 * - No edits in last 30 days (last edit > 30 days ago from ai_edit_daily_count array)
 * - Count >= 1 (at least had one edit before)
 * - Fully churned users, need big AI engine upgrades or trending effects to bring them back
 * - Should be notified after 90 days
 */
export const runChurnedUsersCron = async () => {
  logger.info("CRON START >> Churned Users - Finding users to notify");

  try {
    // Calculate date range: > 30 days ago
    const now = moment();
    console.log("now", now);
    const thirtyDaysAgo = moment().subtract(30, "days").startOf("day");
    console.log("thirtyDaysAgo", thirtyDaysAgo);

    // Find all users with ai_edit_daily_count array
    const mediaClicks = await MediaClickModel.find({
      "ai_edit_daily_count.0": { $exists: true }, // Has at least one entry in array
    })
      .populate("userId", "fcmToken isDeleted")
      .lean();

    logger.info(`Found ${mediaClicks.length} users with AI edit daily count data`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const mediaClick of mediaClicks) {
      try {
        // Check if user exists, is not deleted, and has FCM token
        if (
          !mediaClick.userId ||
          mediaClick.userId.isDeleted ||
          !mediaClick.userId.fcmToken
        ) {
          skippedCount++;
          continue;
        }

        // Find the last edit (most recent entry) from ai_edit_daily_count array
        let lastEditEntry = null;

        if (mediaClick.ai_edit_daily_count && Array.isArray(mediaClick.ai_edit_daily_count)) {
          // Filter entries with valid date and count >= 1
          const validEntries = mediaClick.ai_edit_daily_count.filter(
            (entry) => entry.date && entry.count >= 1
          );

          if (validEntries.length === 0) {
            skippedCount++;
            continue;
          }

          // Find the most recent entry (last edit)
          lastEditEntry = validEntries.reduce((latest, current) => {
            const currentDate = moment(current.date);
            const latestDate = moment(latest.date);
            return currentDate.isAfter(latestDate) ? current : latest;
          });
        }

        // If no last edit found, skip this user
        if (!lastEditEntry || !lastEditEntry.date) {
          skippedCount++;
          continue;
        }

        const lastEditDate = moment(lastEditEntry.date);
        const daysSinceLastEdit = now.diff(lastEditDate, "days");

        // Check if last edit is > 30 days ago AND count >= 1
        // (No upper limit - these are fully churned users)
        if (
          daysSinceLastEdit <= 30 || // Skip if edited within last 30 days
          lastEditEntry.count < 1 // Skip if count < 1
        ) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Notification messages focused on big AI engine upgrades and trending effects
        let notificationTitle = "Major AI Upgrade! 🚀";
        let notificationDescription = "";

        if (daysSinceLastEdit >= 31 && daysSinceLastEdit < 60) {
          notificationDescription = "We've completely upgraded our AI engine! Experience revolutionary new editing capabilities and trending effects.";
        } else if (daysSinceLastEdit >= 60 && daysSinceLastEdit < 90) {
          notificationDescription = "Big news! Our AI engine has been completely rebuilt with cutting-edge technology. See what's new!";
        } else {
          // 90+ days
          notificationDescription = "We've transformed the app with a powerful new AI engine and trending effects! Come back and see the difference.";
        }

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: notificationTitle,
          description: notificationDescription,
        });

        if (notificationResult.success) {
          successCount++;
          logger.info(
            `Notification sent successfully to churned user ${user._id} (last edit: ${daysSinceLastEdit} days ago)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            daysSinceLastEdit,
            messageId: notificationResult.messageId,
          });
        } else {
          failureCount++;
          logger.error(
            `Failed to send notification to user ${user._id}: ${notificationResult.error}`
          );
          results.push({
            userId: user._id,
            status: "failed",
            error: notificationResult.error,
          });
        }
      } catch (error) {
        failureCount++;
        logger.error(
          `Error processing user ${mediaClick.userId?._id || "unknown"}:`,
          error
        );
        results.push({
          userId: mediaClick.userId?._id || null,
          status: "error",
          error: error.message,
        });
      }
    }

    logger.info(
      `CRON COMPLETE >> Churned Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
    );

    return {
      success: true,
      totalProcessed: mediaClicks.length,
      successCount,
      failureCount,
      skippedCount,
      results,
    };
  } catch (error) {
    logger.error("Error in Churned Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.CHURNED_USERS, async () => {
  try {
    await runChurnedUsersCron();
  } catch (error) {
    logger.error("Error executing Churned Users cron:", error);
  }
});

