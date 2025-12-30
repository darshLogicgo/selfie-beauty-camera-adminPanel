import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";
import UserModel from "../models/user.model.js";
import MediaClickModel from "../models/media_click.model.js";
import helper from "../helper/common.helper.js";
import { getCountriesInNotificationWindow } from "../helper/cronCountry.helper.js";

/**
 * Cron job to send notifications to brand-new users who:
 * - User created <= 3 days ago (first_open = createdAt from User model)
 * - Completed >= 1 AI edit in 0-3 days (from ai_edit_daily_count array)
 * - Brand-new users. Need first wow moment. Best for onboarding + initial activation pushes
 */
export const runBrandNewUsersCron = async () => {
  logger.info("CRON START >> Brand New Users - Finding users to notify");

  try {
    // Get countries currently in notification window
    const activeCountries = getCountriesInNotificationWindow();

    if (activeCountries.length === 0) {
      logger.info("Brand New Users: No countries in notification window, skipping");
      return {
        success: true,
        message: "No countries in notification window",
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
      };
    }

    // Calculate date range: users created <= 3 days ago
    const now = moment();
    const threeDaysAgo = moment().subtract(3, "days").startOf("day");

    // Find all users created in last 3 days
    const users = await UserModel.find({
      createdAt: {
        $gte: threeDaysAgo.toDate(),
        $lte: now.toDate(),
      },
    })
      .select("_id fcmToken isDeleted country createdAt")
      .lean();

    logger.info(`Found ${users.length} users created in last 3 days`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if user exists, is not deleted, and has FCM token
        if (!user || user.isDeleted || !user.fcmToken) {
          skippedCount++;
          continue;
        }

        // Check if user's country is in active notification window
        const userCountry = user.country;
        if (!userCountry || !activeCountries.includes(userCountry)) {
          skippedCount++;
          continue;
        }

        // Find media click data for this user
        const mediaClick = await MediaClickModel.findOne({
          userId: user._id,
        })
          .lean();
        console.log("mediaClick", mediaClick);

        // If no media click data or no ai_edit_daily_count, skip
        if (!mediaClick || !mediaClick.ai_edit_daily_count || mediaClick.ai_edit_daily_count.length === 0) {
          skippedCount++;
          continue;
        }

        // Calculate days since user creation (first_open)
        const userCreatedAt = moment(user.createdAt).startOf("day");
        const daysSinceCreation = now.diff(userCreatedAt, "days");

        // Requirement: first_open ≤ 3 days & ai_edit_completed ≥1 in 0–3 days
        // This means: user created <= 3 days ago AND has >= 1 edit in last 0-3 days (from now)
        // Check if user has completed >= 1 AI edit in last 0-3 days (from now, not from creation)
        let hasEditInLast3Days = false;
        let totalEditsInLast3Days = 0;
        const threeDaysAgoFromNow = moment().subtract(3, "days").startOf("day");

        mediaClick.ai_edit_daily_count.forEach((entry) => {
          if (!entry.date || entry.count < 1) {
            return;
          }

          const entryDate = moment(entry.date).startOf("day");
          
          // Check if edit happened in last 0-3 days from NOW (not from user creation)
          // This matches the requirement: ai_edit_completed ≥1 in 0–3 days
          if (entryDate.isSameOrAfter(threeDaysAgoFromNow) && entryDate.isSameOrBefore(now)) {
            hasEditInLast3Days = true;
            totalEditsInLast3Days += entry.count || 0;
          }
        });

        // Skip if user hasn't completed any edit in last 3 days (from now)
        if (!hasEditInLast3Days || totalEditsInLast3Days < 1) {
          skippedCount++;
          continue;
        }

        // Check if user has already been notified in this execution
        const { isUserAlreadyNotified, markUserAsNotified } = await import("./countryNotification.cron.js");
        if (isUserAlreadyNotified(user._id)) {
          skippedCount++;
          logger.debug(`Skipping user ${user._id}: already notified in this execution`);
          continue;
        }

        // Random notification messages for brand-new users
        // Goal: First wow moment, onboarding + initial activation
        const notificationMessages = [
          {
            title: "🎉 Welcome! Try This First",
            description: "Start with AI Enhancer - see the magic",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/AI%20Enhancer.png"
          },
          {
            title: "✨ Your First Edit Was Great!",
            description: "Try Face Swap next - it's trending",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Face%20Swap.png"
          },
          {
            title: "😲 Remove Unwanted Objects",
            description: "Clean up photos in one tap",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Object%20Remover.png"
          },
          {
            title: "💄 Try Makeup Transfer",
            description: "Transform your look instantly",
            image: "https://guardianshot.blr1.cdn.digitaloceanspaces.com/selfie%20notification%20banner/Makeup.png"
          },
          {
            title: "📸 Explore Trending Filters",
            description: "Discover your favorite style",
            image: null // No image for this one
          },
          {
            title: "🌟 You're Off to a Great Start!",
            description: "Try more AI features and unlock your creativity",
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
            `Notification sent successfully to brand-new user ${user._id} (created ${daysSinceCreation} days ago, ${totalEditsInLast3Days} edits in last 3 days)`
          );
          results.push({
            userId: user._id,
            status: "sent",
            daysSinceCreation,
            totalEditsInLast3Days,
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
          `Error processing user ${user?._id || "unknown"}:`,
          error
        );
        results.push({
          userId: user?._id || null,
          status: "error",
          error: error.message,
        });
      }
    }

    logger.info(
      `CRON COMPLETE >> Brand New Users - Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}, Total: ${users.length}`
    );

    return {
      success: true,
      totalProcessed: users.length,
      successCount,
      failureCount,
      skippedCount,
      results,
    };
  } catch (error) {
    logger.error("Error in Brand New Users cron job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.BRAND_NEW_USERS, async () => {
  try {
    await runBrandNewUsersCron();
  } catch (error) {
    logger.error("Error executing Brand New Users cron:", error);
  }
});

