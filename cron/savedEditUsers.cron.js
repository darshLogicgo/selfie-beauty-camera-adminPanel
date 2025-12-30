import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Cron job to send notifications to users who:
 * - edit_saved >= 2 in last 30 days (from ai_edit_saved_entry array)
 * - Users who save high-quality outputs
 * - Ideal for Pro upsell & HD quality nudges
 */
export const runSavedEditUsersCron = async () => {
  logger.info("CRON START >> Saved Edit Users - Finding users to notify");

  try {
    // Calculate date range: last 30 days
    const now = moment();
    const thirtyDaysAgo = moment().subtract(30, "days").startOf("day");
    console.log("thirtyDaysAgo", thirtyDaysAgo);

    // Find all users with ai_edit_saved_entry array
    const mediaClicks = await MediaClickModel.find({
      "ai_edit_saved_entry.0": { $exists: true }, // Has at least one entry in saved entry array
    })
      .populate("userId", "fcmToken isDeleted")
      .lean();

    logger.info(`Found ${mediaClicks.length} users with saved edit data`);

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

        // Check saved edits in ai_edit_saved_entry array (last 30 days)
        let savedEditsInLast30Days = 0;

        const savedEntry = mediaClick.ai_edit_saved_entry || [];

        if (Array.isArray(savedEntry) && savedEntry.length > 0) {
          savedEntry.forEach((entry) => {
            if (!entry.date || entry.count < 1) {
              return;
            }

            const entryDate = moment(entry.date).startOf("day");
            const daysSinceEntry = now.diff(entryDate, "days");

            // Count saved edits in last 30 days
            if (daysSinceEntry <= 30) {
              savedEditsInLast30Days += entry.count || 0;
            }
          });
        }

        // Check criteria: >= 2 saved edits in last 30 days
        if (savedEditsInLast30Days < 2) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Check if user has already been notified in this execution
        const { isUserAlreadyNotified, markUserAsNotified } = await import("./countryNotification.cron.js");
        if (isUserAlreadyNotified(user._id)) {
          skippedCount++;
          logger.debug(`Skipping user ${user._id}: already notified in this execution`);
          continue;
        }

        // Notification messages focused on Pro upsell & HD quality
        const notificationTitle = "Unlock Pro Features! ✨";
        const notificationDescription = `You've saved ${savedEditsInLast30Days} amazing edits! Upgrade to Pro for HD quality exports and premium features.`;

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: notificationTitle,
          description: notificationDescription,
        });

        if (notificationResult.success) {
          // Mark user as notified
          markUserAsNotified(user._id);
          successCount++;
          logger.info(
            `Notification sent successfully to saved edit user ${user._id} (${savedEditsInLast30Days} saved edits in last 30 days)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            savedEditsInLast30Days,
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
      `CRON COMPLETE >> Saved Edit Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Saved Edit Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.SAVED_EDIT_USERS, async () => {
  try {
    await runSavedEditUsersCron();
  } catch (error) {
    logger.error("Error executing Saved Edit Users cron:", error);
  }
});

