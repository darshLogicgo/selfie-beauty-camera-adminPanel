import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Cron job to send notifications to almost-subscribers who:
 * - paywall_opened_entry in last 14 days
 * - isSubscribe = false (NO purchase made)
 * - Almost-subscribers. Warm audience. Perfect for trials, benefits, or social proof reminders
 */
export const runAlmostSubscribersCron = async () => {
  logger.info("CRON START >> Almost Subscribers - Finding users to notify");

  try {
    // Calculate last 14 days range
    const today = moment().startOf("day");
    const fourteenDaysAgo = moment().subtract(14, "days").startOf("day");

    // Find all users with paywall_opened_entry array
    const mediaClicks = await MediaClickModel.find({
      "paywall_opened_entry.0": { $exists: true }, // Has at least one entry in array
    })
      .populate("userId", "fcmToken isDeleted isSubscribe")
      .lean();

    logger.info(`Found ${mediaClicks.length} users with paywall opened entry data`);

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

        // Check if user has paywall opened in last 14 days
        const hasPaywallOpenedInLast14Days = mediaClick.paywall_opened_entry?.some((entry) => {
          if (!entry.date || entry.count < 1) {
            return false;
          }

          // Convert date to moment and check if it's within last 14 days
          const entryDate = moment(entry.date).startOf("day");
          return (
            entryDate.isSameOrAfter(fourteenDaysAgo) &&
            entryDate.isSameOrBefore(today) &&
            entry.count >= 1
          );
        });

        // If user doesn't have paywall opened in last 14 days, skip
        if (!hasPaywallOpenedInLast14Days) {
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

        // Find the most recent paywall opened date in last 14 days
        const recentPaywallOpens = mediaClick.paywall_opened_entry
          .filter((entry) => {
            if (!entry.date || entry.count < 1) return false;
            const entryDate = moment(entry.date).startOf("day");
            return (
              entryDate.isSameOrAfter(fourteenDaysAgo) &&
              entryDate.isSameOrBefore(today)
            );
          })
          .sort((a, b) => moment(b.date).diff(moment(a.date)));

        const lastPaywallOpenDate = recentPaywallOpens.length > 0 
          ? moment(recentPaywallOpens[0].date) 
          : null;
        const daysSinceLastPaywallOpen = lastPaywallOpenDate 
          ? moment().diff(lastPaywallOpenDate, "days") 
          : 0;

        // Random notification messages for paywall opened users (no purchase)
        // Goal: Warm conversion
        const notificationMessages = [
          {
            title: "🎉 50% Off Just for You",
            description: "Unlock all AI tools",
            image: null // No image for this one
          },
          {
            title: "✨ Pro Enhancer Mode",
            description: "Next-level quality",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "😎 Premium Face Swaps",
            description: "Go viral",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Face%20Swap.png"
          },
          {
            title: "💎 Pro Clean Tool",
            description: "One tap perfection",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Object%20Remover.png"
          },
          {
            title: "📸 Save in Ultra HD",
            description: "Upgrade now",
            image: null // No image for this one
          },
          {
            title: "💄 Pro Makeup Looks",
            description: "Unlimited styles",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Makeup.png"
          },
          {
            title: "⏰ Last Chance",
            description: "Offer ending soon",
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
            `Notification sent successfully to almost-subscriber ${user._id} (last paywall open: ${daysSinceLastPaywallOpen} days ago)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            daysSinceLastPaywallOpen,
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
      `CRON COMPLETE >> Almost Subscribers - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Almost Subscribers cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.ALMOST_SUBSCRIBERS, async () => {
  try {
    await runAlmostSubscribersCron();
  } catch (error) {
    logger.error("Error executing Almost Subscribers cron:", error);
  }
});

