import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";

/**
 * Cron job to send notifications to paywall dismissed users who:
 * - paywall_dismissed_entry in last 7 days
 * - Users who looked at premium but skipped
 * - Gentle nudges only
 */
export const runPaywallDismissedUsersCron = async () => {
  logger.info("CRON START >> Paywall Dismissed Users - Finding users to notify");

  try {
    // Calculate last 7 days range
    const today = moment().startOf("day");
    const sevenDaysAgo = moment().subtract(7, "days").startOf("day");

    // Find all users with paywall_dismissed_entry array
    const mediaClicks = await MediaClickModel.find({
      "paywall_dismissed_entry.0": { $exists: true }, // Has at least one entry in array
    })
      .populate("userId", "fcmToken isDeleted isSubscribe")
      .lean();

    logger.info(`Found ${mediaClicks.length} users with paywall dismissed entry data`);

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

        // Check if user is already subscribed - skip if subscribed
        if (mediaClick.userId.isSubscribe === true) {
          skippedCount++;
          logger.info(
            `Skipping user ${mediaClick.userId._id}: already subscribed`
          );
          continue;
        }

        // Check if user has paywall dismissed in last 7 days
        const hasPaywallDismissedInLast7Days = mediaClick.paywall_dismissed_entry?.some((entry) => {
          if (!entry.date || entry.count < 1) {
            return false;
          }

          // Convert date to moment and check if it's within last 7 days
          const entryDate = moment(entry.date).startOf("day");
          return (
            entryDate.isSameOrAfter(sevenDaysAgo) &&
            entryDate.isSameOrBefore(today) &&
            entry.count >= 1
          );
        });

        // If user doesn't have paywall dismissed in last 7 days, skip
        if (!hasPaywallDismissedInLast7Days) {
          skippedCount++;
          continue;
        }

        const user = mediaClick.userId;

        // Find the most recent paywall dismissed date in last 7 days
        const recentPaywallDismissed = mediaClick.paywall_dismissed_entry
          .filter((entry) => {
            if (!entry.date || entry.count < 1) return false;
            const entryDate = moment(entry.date).startOf("day");
            return (
              entryDate.isSameOrAfter(sevenDaysAgo) &&
              entryDate.isSameOrBefore(today)
            );
          })
          .sort((a, b) => moment(b.date).diff(moment(a.date)));

        const lastPaywallDismissedDate = recentPaywallDismissed.length > 0 
          ? moment(recentPaywallDismissed[0].date) 
          : null;
        const daysSinceLastPaywallDismissed = lastPaywallDismissedDate 
          ? moment().diff(lastPaywallDismissedDate, "days") 
          : 0;

        // Gentle notification messages for users who dismissed paywall
        const notificationMessages = [
          {
            title: "Still Thinking About Premium? 💭",
            description: "We noticed you checked out our premium features. Take your time, but remember - unlimited creativity is just a tap away!",
          },
          {
            title: "Premium Features Await You! ✨",
            description: "You explored premium features recently. When you're ready, we're here to help you unlock your full creative potential!",
          },
          {
            title: "No Pressure, Just Possibilities! 🎨",
            description: "Premium features are always available when you need them. Explore at your own pace and create something amazing!",
          },
        ];

        // Select a random message for variety
        const randomMessage = notificationMessages[
          Math.floor(Math.random() * notificationMessages.length)
        ];

        // Send notification
        const notificationResult = await helper.sendFCMNotification({
          fcmToken: user.fcmToken,
          title: randomMessage.title,
          description: randomMessage.description,
        });

        if (notificationResult.success) {
          successCount++;
          logger.info(
            `Notification sent successfully to paywall dismissed user ${user._id} (last dismissed: ${daysSinceLastPaywallDismissed} days ago)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            daysSinceLastPaywallDismissed,
            messageId: notificationResult.messageId,
            notificationTitle: randomMessage.title,
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
      `CRON COMPLETE >> Paywall Dismissed Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Paywall Dismissed Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.PAYWALL_DISMISSED_USERS, async () => {
  try {
    await runPaywallDismissedUsersCron();
  } catch (error) {
    logger.error("Error executing Paywall Dismissed Users cron:", error);
  }
});

