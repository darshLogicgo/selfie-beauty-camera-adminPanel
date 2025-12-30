import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Cron job to send notifications to viral users who:
 * - edit_shared >= 1 in last 90 days OR >= 3 in last 90 days
 * - These are viral users who share edits, high LTV
 * - Perfect for creator features & early access drops
 * - Notification based on count: >= 1 or >= 3
 */
export const runViralUsersCron = async () => {
  logger.info("CRON START >> Viral Users - Finding users to notify");

  try {
    // Calculate date range: last 90 days
    const now = moment();
    const ninetyDaysAgo = moment().subtract(90, "days").startOf("day");

    // Find all users with ai_edit_shared_entry array
    const mediaClicks = await MediaClickModel.find({
      "ai_edit_shared_entry.0": { $exists: true }, // Has at least one entry in shared entry array
    })
      .populate("userId", "fcmToken isDeleted")
      .lean();
      

    logger.info(`Found ${mediaClicks.length} users with shared edit data`);

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

        // Check shared edits in ai_edit_shared_entry array (only last 90 days)
        let sharedEditsInLast90Days = 0;

        const sharedEntry = mediaClick.ai_edit_shared_entry || [];

        if (Array.isArray(sharedEntry) && sharedEntry.length > 0) {   
          sharedEntry.forEach((entry) => {
            if (!entry.date || entry.count < 1) {
              return;
            }

            const entryDate = moment(entry.date).startOf("day");
            const daysSinceEntry = now.diff(entryDate, "days");

            // Count shared edits in last 90 days only
            if (daysSinceEntry <= 90) {
              sharedEditsInLast90Days += entry.count || 0;
            }
          });
        }

        // Check criteria: >= 1 in last 90 days (this covers both >= 1 and >= 3)
        if (sharedEditsInLast90Days < 1) {
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

        // Random notification messages for viral users/sharers
        // Goal: Exclusivity + creator ego
        const notificationMessages = [
          {
            title: "😎 Early Access Unlocked",
            description: "Be first to post",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Face%20Swap.png"
          },
          {
            title: "🚀 Creator Quality Mode",
            description: "Go viral faster",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "🎨 Trending Creator Filter",
            description: "Made for shares",
            image: null // No image for this one
          },
          {
            title: "💇 Creator Hair Looks",
            description: "Bold & viral",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Kiddo%20Snap-1.png"
          },
          {
            title: "💄 Glam That Gets Likes",
            description: "Try it now",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Makeup.png"
          },
          {
            title: "📸 Aesthetic Polaroid",
            description: "Perfect for socials",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Polaroid.png"
          },
          {
            title: "🔓 Creator VIP Access",
            description: "Limited time",
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
            `Notification sent successfully to viral user ${user._id} (${sharedEditsInLast90Days} shares in last 90 days)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            sharedEditsInLast90Days,
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
      `CRON COMPLETE >> Viral Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${mediaClicks.length}`
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
    logger.error("Error in Viral Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.VIRAL_USERS, async () => {
  try {
    await runViralUsersCron();
  } catch (error) {
    logger.error("Error executing Viral Users cron:", error);
  }
});

