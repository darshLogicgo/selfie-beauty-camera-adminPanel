import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

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
    // Get countries currently in notification window
    const activeCountries = getCountriesInNotificationWindow();

    if (activeCountries.length === 0) {
      logger.info("Recently Active Users: No countries in notification window, skipping");
      return {
        success: true,
        message: "No countries in notification window",
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
      };
    }

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
        //   logger.warn(
        //     `Skipping user ${mediaClick.userId?._id || "unknown"}: missing FCM token or deleted`
        //   );
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

        // Check if user has already been notified in this execution
        const { isUserAlreadyNotified, markUserAsNotified } = await import("./countryNotification.cron.js");
        if (isUserAlreadyNotified(user._id)) {
          skippedCount++;
          logger.debug(`Skipping user ${user._id}: already notified in this execution`);
          continue;
        }

        // Random notification messages for recently silent users (48h-7 days)
        // Goal: Soft re-entry
        const notificationMessages = [
          {
            title: "👀 We Miss Your Edits",
            description: "Trending filters await",
            image: null
          },
          {
            title: "✨ Your Last Edit Was Fire",
            description: "Ready for another glow-up?",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "😎 This Face Swap Is Fun",
            description: "Try it today",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Face%20Swap.png"
          },
          {
            title: "😲 Clean Up Photos Fast",
            description: "One tap fix",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Object%20Remover.png"
          },
          {
            title: "💇 New Hair Look Waiting",
            description: "Try it instantly",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Kiddo%20Snap-1.png"
          },
          {
            title: "📸 Vintage Polaroid Style",
            description: "Create something cozy",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Polaroid.png"
          },
          {
            title: "🌈 Bring Old Photos Alive",
            description: "Emotional & magical",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Colorize.png"
          }
        ];

        // Select a random notification message
        const randomMessage = notificationMessages[
          Math.floor(Math.random() * notificationMessages.length)
        ];

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

