import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to core active users who:
 * - Have completed >= 3 AI edits in the last 7 days (checked from ai_edit_daily_count array)
 * - These are core active users with highest retention value
 * - Should be protected with streak + weekly summaries
 * - Notify after 7 days and 30 days of inactivity
 */
export const runCoreActiveUsersCron = async () => {
  logger.info("CRON START >> Core Active Users - Finding users to notify");

  try {
    // Calculate last 7 days range
    const today = moment().startOf("day");
    const sevenDaysAgo = moment().subtract(7, "days").startOf("day");
    console.log("sevenDaysAgo", sevenDaysAgo);

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
          logger.warn(
            `Skipping user ${mediaClick.userId?._id || "unknown"}: missing FCM token or deleted`
          );
          continue;
        }

        // Calculate total edits in last 7 days from ai_edit_daily_count
        let totalEditsInLast7Days = 0;
        const editsInLast7Days = [];

        if (mediaClick.ai_edit_daily_count && Array.isArray(mediaClick.ai_edit_daily_count)) {
          mediaClick.ai_edit_daily_count.forEach((dailyEntry) => {
            if (!dailyEntry.date || dailyEntry.count < 1) {
              return;
            }

            const entryDate = moment(dailyEntry.date).startOf("day");
            
            // Check if entry is within last 7 days
            if (
              entryDate.isSameOrAfter(sevenDaysAgo) &&
              entryDate.isSameOrBefore(today)
            ) {
              totalEditsInLast7Days += dailyEntry.count || 0;
              editsInLast7Days.push({
                date: entryDate,
                count: dailyEntry.count,
              });
            }
          });
        }

        // Check if user has >= 3 edits in last 7 days
        if (totalEditsInLast7Days < 3) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Find the most recent edit date in last 7 days
        const lastEditDate = editsInLast7Days.length > 0
          ? editsInLast7Days.sort((a, b) => b.date.diff(a.date))[0].date
          : null;

        const daysSinceLastEdit = lastEditDate
          ? moment().diff(lastEditDate, "days")
          : 0;

        // Determine notification message based on days since last edit
        let notificationTitle = "Keep Your Streak Going! 🔥";
        let notificationDescription = "";

        if (daysSinceLastEdit >= 7 && daysSinceLastEdit < 30) {
          // After 7 days of inactivity
          notificationDescription = `You're a core creator! You've made ${totalEditsInLast7Days} amazing edits. Don't break your streak - come back and create more!`;
        } else if (daysSinceLastEdit >= 30) {
          // After 30 days of inactivity
          notificationDescription = `We miss you! You were creating ${totalEditsInLast7Days} amazing edits. Your creative journey awaits - come back and continue your streak!`;
        } else {
          // Active user encouragement
          notificationDescription = `Amazing work! You've completed ${totalEditsInLast7Days} edits. Keep up the great streak! 🎨`;
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
            `Notification sent successfully to core active user ${user._id} (${totalEditsInLast7Days} edits in last 7 days, last edit: ${daysSinceLastEdit} days ago)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            totalEditsInLast7Days,
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
      `CRON COMPLETE >> Core Active Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Core Active Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.CORE_ACTIVE_USERS, async () => {
  try {
    await runCoreActiveUsersCron();
  } catch (error) {
    logger.error("Error executing Core Active Users cron:", error);
  }
});

