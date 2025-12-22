import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to recently active users who:
 * - Have entries in ai_edit_daily_count with date > 48 hours AND ≤ 7 days ago
 * - And count >= 1
 * - Recently active but now silent for 2+ days
 * - Need simple "re-enter" nudges
 */
export const runRecentlyActiveUsersCron = async () => {
  logger.info("CRON START >> Recently Active Users - Finding users to notify");

  try {
    // Calculate date range: > 48 hours ago AND ≤ 7 days ago
    const now = moment();
    console.log("now", now);
    const fortyEightHoursAgo = moment().subtract(48, "hours");
    console.log("fortyEightHoursAgo", fortyEightHoursAgo);
    const sevenDaysAgo = moment().subtract(7, "days").startOf("day");

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
        //   logger.warn(
        //     `Skipping user ${mediaClick.userId?._id || "unknown"}: missing FCM token or deleted`
        //   );
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
        const hoursSinceLastEdit = now.diff(lastEditDate, "hours");
        const daysSinceLastEdit = now.diff(lastEditDate, "days");

        // Check if last edit is > 48 hours ago AND <= 7 days ago AND count >= 1
        if (
          hoursSinceLastEdit <= 48 || // Skip if edited in last 48 hours
          daysSinceLastEdit > 7 || // Skip if more than 7 days ago
          lastEditEntry.count < 1 // Skip if count < 1
        ) {
          skippedCount++;
          if (hoursSinceLastEdit <= 48) {
            logger.info(
              `Skipping user ${mediaClick.userId?._id || "unknown"}: last edit was ${hoursSinceLastEdit} hours ago (within 48 hours)`
            );
          }
          continue;
        }

        const user = mediaClick.userId;

        // Simple "re-enter" nudge messages
        let notificationTitle = "We Miss You! 🎨";
        let notificationDescription = "";

        if (daysSinceLastEdit >= 2 && daysSinceLastEdit < 4) {
          notificationDescription = "It's been a couple of days! Come back and create something new.";
        } else if (daysSinceLastEdit >= 4 && daysSinceLastEdit < 6) {
          notificationDescription = "Your creative journey is waiting! Open the app and continue editing.";
        } else {
          // 6-7 days
          notificationDescription = "Don't let your creativity fade! Come back and explore new features.";
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
            `Notification sent successfully to recently active user ${user._id} (last edit: ${daysSinceLastEdit} days ago, ${hoursSinceLastEdit} hours ago)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            daysSinceLastEdit,
            hoursSinceLastEdit,
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
      `CRON COMPLETE >> Recently Active Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Recently Active Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.RECENTLY_ACTIVE_USERS, async () => {
  try {
    await runRecentlyActiveUsersCron();
  } catch (error) {
    logger.error("Error executing Recently Active Users cron:", error);
  }
});

