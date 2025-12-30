import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Cron job to send notifications to users who:
 * - Have completed >= 1 AI edit in the last 7 days (checked from ai_edit_daily_count array)
 * - Should be notified daily to build routine
 */
export const runAiEditReminderCron = async () => {
  logger.info("CRON START >> AI Edit Reminder - Finding users to notify");

  try {
    // Get countries currently in notification window
    const activeCountries = getCountriesInNotificationWindow();

    if (activeCountries.length === 0) {
      logger.info("AI Edit Reminder: No countries in notification window, skipping");
      return {
        success: true,
        message: "No countries in notification window",
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
      };
    }

    // Calculate last 7 days range
    const today = moment().startOf("day");
    const sevenDaysAgo = moment().subtract(7, "days").startOf("day");

    // Find all users with ai_edit_daily_count array AND in active countries
    const mediaClicks = await MediaClickModel.find({
      "ai_edit_daily_count.0": { $exists: true }, // Has at least one entry in array
    })
      .populate("userId", "fcmToken isDeleted country createdAt")
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
          // logger.warn(
          //   `Skipping user ${mediaClick.userId?._id || "unknown"}: missing FCM token or deleted`
          // );
          continue;
        }

        // Check if user's country is in active notification window
        const userCountry = mediaClick.userId.country;
        if (!userCountry || !activeCountries.includes(userCountry)) {
          skippedCount++;
          logger.debug(
            `Skipping user ${mediaClick.userId._id}: country ${userCountry || "unknown"} not in active window`
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

        // Calculate total edits in last 7 days
        let totalEditsInLast7Days = 0;
        mediaClick.ai_edit_daily_count?.forEach((dailyEntry) => {
          if (!dailyEntry.date || dailyEntry.count < 1) {
            return;
          }

          const entryDate = moment(dailyEntry.date).startOf("day");
          const daysSinceEntry = today.diff(entryDate, "days");

          // Count edits in last 7 days
          if (daysSinceEntry >= 0 && daysSinceEntry <= 7) {
            totalEditsInLast7Days += dailyEntry.count || 0;
          }
        });

        // IMPORTANT: Skip users with >= 3 edits (they are power users, handled by coreActiveUsers cron)
        // Only send to users with 1-2 edits
        if (totalEditsInLast7Days >= 3) {
          skippedCount++;
          logger.debug(
            `Skipping user ${mediaClick.userId._id}: ${totalEditsInLast7Days} edits (power user, handled by coreActiveUsers cron)`
          );
          continue;
        }

        const user = mediaClick.userId;

        // IMPORTANT: Skip brand-new users (created <= 3 days ago)
        // They should be handled by brandNewUsers cron, not aiEditReminder
        if (user.createdAt) {
          const userCreatedAt = moment(user.createdAt);
          const daysSinceCreation = moment().diff(userCreatedAt, "days");
          if (daysSinceCreation <= 3) {
            skippedCount++;
            logger.debug(
              `Skipping user ${user._id}: brand-new user (created ${daysSinceCreation} days ago, handled by brandNewUsers cron)`
            );
            continue;
          }
        }

        // Check if user has already been notified in this execution
        const { isUserAlreadyNotified, markUserAsNotified } = await import("./countryNotification.cron.js");
        if (isUserAlreadyNotified(user._id)) {
          skippedCount++;
          logger.debug(`Skipping user ${user._id}: already notified in this execution`);
          continue;
        }

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

        // IMPORTANT: Skip users who haven't edited in more than 48 hours (2 days)
        // They should be handled by recentlyActiveUsers cron (48h-7 days)
        if (daysSinceLastEdit >= 2) {
          skippedCount++;
          logger.debug(
            `Skipping user ${user._id}: last edit ${daysSinceLastEdit} days ago (>48h, handled by recentlyActiveUsers cron)`
          );
          continue;
        }

        // Random notification messages for activated users (≥1 edit in 7 days, <48h inactive)
        // Goal: Reinforce value, show improvements
        const notificationMessages = [
          {
            title: "✨ AI Photo Enhancer Upgraded",
            description: "Re-enhance and spot the difference",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "🔥 Quality Just Got Better",
            description: "Sharper skin & lighting",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "😎 New Face Swap Models",
            description: "See yourself in a new style",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Face%20Swap.png"
          },
          {
            title: "😲 Messy Photo? Fixed",
            description: "Remove unwanted objects instantly",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Object%20Remover.png"
          },
          {
            title: "� Old Photos, New Life",
            description: "Colorize memories in one tap",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Colorize.png"
          },
          {
            title: "🎉 AI Upgrade Alert",
            description: "Better results, same photo",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "👀 Try What's Trending",
            description: "Everyone's using this look",
            image: null // No image for this one
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

