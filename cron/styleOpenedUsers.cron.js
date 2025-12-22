import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to users who:
 * - style_opened >= 3 in last 14 days (from style_opened_entry array)
 * - Users who browse filters frequently
 * - Novelty seekers
 * - Great for daily style drops
 */
export const runStyleOpenedUsersCron = async () => {
  logger.info("CRON START >> Style Opened Users - Finding users to notify");

  try {
    // Calculate date range: last 14 days
    const now = moment();
    const fourteenDaysAgo = moment().subtract(14, "days").startOf("day");

    // Find all users with style_opened_entry array
    const mediaClicks = await MediaClickModel.find({
      "style_opened_entry.0": { $exists: true }, // Has at least one entry in style opened entry array
    })
      .populate("userId", "fcmToken isDeleted")
      .lean();

    logger.info(`Found ${mediaClicks.length} users with style opened data`);

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

        // Check style opens in style_opened_entry array (last 14 days)
        let styleOpensInLast14Days = 0;

        const styleOpenedEntry = mediaClick.style_opened_entry || [];

        if (Array.isArray(styleOpenedEntry) && styleOpenedEntry.length > 0) {
          styleOpenedEntry.forEach((entry) => {
            if (!entry.date || entry.count < 1) {
              return;
            }

            const entryDate = moment(entry.date).startOf("day");
            const daysSinceEntry = now.diff(entryDate, "days");

            // Count style opens in last 14 days
            if (daysSinceEntry <= 14) {
              styleOpensInLast14Days += entry.count || 0;
            }
          });
        }

        // Check criteria: >= 3 style opens in last 14 days
        if (styleOpensInLast14Days < 3) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Notification messages focused on daily style drops
        const notificationTitle = "New Styles Dropped! 🎨";
        const notificationDescription = `You love exploring styles! Check out today's new style drops and discover fresh filters.`;

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: notificationTitle,
          description: notificationDescription,
        });

        if (notificationResult.success) {
          successCount++;
          logger.info(
            `Notification sent successfully to style opened user ${user._id} (${styleOpensInLast14Days} style opens in last 14 days)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            styleOpensInLast14Days,
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
      `CRON COMPLETE >> Style Opened Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Style Opened Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.STYLE_OPENED_USERS, async () => {
  try {
    await runStyleOpenedUsersCron();
  } catch (error) {
    logger.error("Error executing Style Opened Users cron:", error);
  }
});

