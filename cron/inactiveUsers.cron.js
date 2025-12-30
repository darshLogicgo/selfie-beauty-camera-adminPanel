import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Cron job to send notifications to inactive users who:
 * - Last edit > 7 days AND ≤ 30 days ago (from ai_edit_daily_count array)
 * - Count >= 1
 * - Users inactive for a week, need novelty or strong new AI feature to return
 * - Should be notified after 30 days
 */
export const runInactiveUsersCron = async () => {
  logger.info("CRON START >> Inactive Users - Finding users to notify");

  try {
    // Get countries currently in notification window
    const activeCountries = getCountriesInNotificationWindow();

    if (activeCountries.length === 0) {
      logger.info("Inactive Users: No countries in notification window, skipping");
      return { success: true, message: "No countries in notification window", totalProcessed: 0, successCount: 0, failureCount: 0, skippedCount: 0 };
    }

    // Calculate date range: > 7 days ago AND ≤ 30 days ago
    const now = moment();
    const sevenDaysAgo = moment().subtract(7, "days").startOf("day");
    console.log("sevenDaysAgo", sevenDaysAgo);

    const thirtyDaysAgo = moment().subtract(30, "days").startOf("day");
    console.log("thirtyDaysAgo", thirtyDaysAgo);

    // Find all users with ai_edit_daily_count array
    const mediaClicks = await MediaClickModel.find({
      "ai_edit_daily_count.0": { $exists: true }, // Has at least one entry in array
    })
      .populate("userId", "fcmToken isDeleted country")
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

        // Check if user's country is in active notification window
        const userCountry = mediaClick.userId.country;
        if (!userCountry || !activeCountries.includes(userCountry)) {
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
        console.log("lastEditEntry", lastEditEntry);

        // If no last edit found, skip this user
        if (!lastEditEntry || !lastEditEntry.date) {
          skippedCount++;
          continue;
        }

        const lastEditDate = moment(lastEditEntry.date);
        const daysSinceLastEdit = now.diff(lastEditDate, "days");

        // Check if last edit is > 7 days ago AND ≤ 30 days ago AND count >= 1
        // Users outside this window are skipped here and handled by other crons
        // (e.g. Recently Active, Churned Users)
        if (
          daysSinceLastEdit <= 7 || // Skip if edited within last 7 days
          daysSinceLastEdit > 30 || // Skip if more than 30 days ago
          lastEditEntry.count < 1 // Skip if count < 1
        ) {
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

        // 6️⃣ Dormant Users (7–30 Days)
        // Goal: Novelty + shock
        const notificationMessages = [
          {
            feature: "3D Model",
            title: "😲 You, But in 3D!",
            description: "Trending #1 AI model",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/3D%20Model.png",
          },
          {
            feature: "Face Swap",
            title: "😱 This Looks Too Real",
            description: "Internet-breaking swap",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Face%20Swap.png",
          },
          {
            feature: "Object Removal",
            title: "✨ Background Gone",
            description: "Clean photos instantly",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Object%20Remover.png",
          },
          {
            feature: "AI Enhancer",
            title: "🔥 Big AI Upgrade Live",
            description: "Same photo, insane results",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png",
          },
          {
            feature: "Colorize",
            title: "😭 Grandpa in Color",
            description: "Emotional AI magic",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Colorize.png",
          },
          {
            feature: "Descratch",
            title: "😎 Say Goodbye to Scratches",
            description: "Restore old photos",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Descratch.png",
          },
          {
            feature: "Filters",
            title: "🌟 New Creative Styles",
            description: "Come see what’s new",
            image: null,
          },
        ];

        // Pick a random creative for dormant users
        const randomMessage =
          notificationMessages[Math.floor(Math.random() * notificationMessages.length)];

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: randomMessage.title,
          description: randomMessage.description,
          image: randomMessage.image,
        });

        if (notificationResult.success) {
          // Mark user as notified
          markUserAsNotified(user._id);
          successCount++;
          logger.info(
            `Notification sent successfully to inactive user ${user._id} (last edit: ${daysSinceLastEdit} days ago)`
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
      `CRON COMPLETE >> Inactive Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Inactive Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.INACTIVE_USERS, async () => {
  try {
    await runInactiveUsersCron();
  } catch (error) {
    logger.error("Error executing Inactive Users cron:", error);
  }
});

