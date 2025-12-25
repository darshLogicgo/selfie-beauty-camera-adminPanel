import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to streak users who:
 * - streak_days >= 3 (consecutive days with edits)
 * - Users who edited for 3+ days straight
 * - Very high habit potential
 * - Notification sent when streak breaks (yesterday has no entry, not today)
 * - We check yesterday (not today) because today's day is not complete yet
 * - User can still edit today, so notification is sent only if yesterday was missed
 */
export const runStreakUsersCron = async () => {
  logger.info("CRON START >> Streak Users - Finding users to notify");

  try {
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "days").startOf("day");

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

        // Get valid entries with count >= 1 and create a map for quick lookup
        const validEntries = (mediaClick.ai_edit_daily_count || [])
          .filter((entry) => entry.date && entry.count >= 1)
          .map((entry) => moment(entry.date).startOf("day"));

        if (validEntries.length === 0) {
          skippedCount++;
          continue;
        }

        // Create a Set for O(1) lookup
        const entryDatesSet = new Set(
          validEntries.map((date) => date.format("YYYY-MM-DD"))
        );

        // Check if yesterday has an entry
        // We check yesterday (not today) because today's day is not complete yet
        // User can still edit today, so we should only notify if yesterday was missed
        const yesterdayKey = yesterday.format("YYYY-MM-DD");
        if (entryDatesSet.has(yesterdayKey)) {
          // If yesterday has an entry, skip (they're still maintaining streak)
          skippedCount++;
          continue;
        }

        // Calculate consecutive streak going backwards from day-before-yesterday
        // Since yesterday has no entry, we check streak from 2 days ago backwards
        let streakDays = 0;
        let checkDate = moment().subtract(2, "days").startOf("day");

        // Check consecutive days backwards from 2 days ago
        while (true) {
          const checkDateKey = checkDate.format("YYYY-MM-DD");
          
          if (entryDatesSet.has(checkDateKey)) {
            streakDays++;
            checkDate.subtract(1, "day"); // Move to previous day
          } else {
            // Found a gap, streak is broken
            break;
          }
        }

        // Check if streak >= 3 days
        if (streakDays < 3) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Notification messages focused on maintaining streak
        const notificationTitle = "Don't Break Your Streak! 🔥";
        const notificationDescription = `You've edited for ${streakDays} days straight! Keep your streak alive - create something amazing today!`;

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: notificationTitle,
          description: notificationDescription,
        });

        if (notificationResult.success) {
          successCount++;
          logger.info(
            `Notification sent successfully to streak user ${user._id} (${streakDays} day streak broken - yesterday missed)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            streakDays,
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
      `CRON COMPLETE >> Streak Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Streak Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.STREAK_USERS, async () => {
  try {
    await runStreakUsersCron();
  } catch (error) {
    logger.error("Error executing Streak Users cron:", error);
  }
});

