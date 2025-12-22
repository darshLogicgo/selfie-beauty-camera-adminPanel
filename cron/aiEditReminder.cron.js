import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to users who:
 * - Have completed >= 1 AI edit in the last 7 days (checked from ai_edit_daily_count array)
 * - Should be notified daily to build routine
 */
export const runAiEditReminderCron = async () => {
  logger.info("CRON START >> AI Edit Reminder - Finding users to notify");

  try {
    // Calculate last 7 days range
    const today = moment().startOf("day");
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
          logger.warn(
            `Skipping user ${mediaClick.userId?._id || "unknown"}: missing FCM token or deleted`
          );
          continue;
        }

        // Check if user has any edit with count >= 1 in last 7 days
        const hasEditInLast7Days = mediaClick.ai_edit_daily_count?.some((dailyEntry) => {
          if (!dailyEntry.date || dailyEntry.count < 1) {
            return false;
          }

          // Convert date to moment and check if it's within last 7 days
          const entryDate = moment(dailyEntry.date).startOf("day");
          return (
            entryDate.isSameOrAfter(sevenDaysAgo) &&
            entryDate.isSameOrBefore(today) &&
            dailyEntry.count >= 1
          );
        });

        // If user doesn't have edit in last 7 days, skip
        if (!hasEditInLast7Days) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Find the most recent edit date in last 7 days
        const recentEdits = mediaClick.ai_edit_daily_count
          .filter((entry) => {
            if (!entry.date || entry.count < 1) return false;
            const entryDate = moment(entry.date).startOf("day");
            return (
              entryDate.isSameOrAfter(sevenDaysAgo) &&
              entryDate.isSameOrBefore(today)
            );
          })
          .sort((a, b) => moment(b.date).diff(moment(a.date)));

        const lastEditDate = recentEdits.length > 0 
          ? moment(recentEdits[0].date) 
          : null;
        const daysSinceLastEdit = lastEditDate 
          ? moment().diff(lastEditDate, "days") 
          : 0;

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: "Continue Your Creative Journey! 🎨",
          description: `You've been creating amazing edits! Keep up the great work and explore more features!`,
        });

        if (notificationResult.success) {
          successCount++;
          logger.info(
            `Notification sent successfully to user ${user._id} (last edit: ${daysSinceLastEdit} days ago)`
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
      `CRON COMPLETE >> AI Edit Reminder - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in AI Edit Reminder cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.AI_EDIT_REMINDER, async () => {
  try {
    await runAiEditReminderCron();
  } catch (error) {
    logger.error("Error executing AI Edit Reminder cron:", error);
  }
});

