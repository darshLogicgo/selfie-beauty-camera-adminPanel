/**
 * Script to add subscription fields to all existing users
 * Run this once to update all users in the database
 * 
 * Usage: node scripts/add-subscription-fields-to-users.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/user.model.js";
import config from "../config/config.js";

// Load environment variables
dotenv.config({
  path: config.nodeEnv === "development" ? ".env.dev" : ".env",
});

const addSubscriptionFields = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(config.mongodb.url);
    console.log("✅ Connected to MongoDB");

    // Find all users
    console.log("\n📊 Fetching all users...");
    const users = await UserModel.find({});
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log("No users found.");
      await mongoose.disconnect();
      return;
    }

    // Update all users with subscription fields using bulk operation (FAST)
    console.log("\n🔄 Updating users with subscription fields (bulk operation)...");
    
    // Use updateMany to update all users at once - MUCH FASTER
    const bulkUpdateResult = await UserModel.updateMany(
      {
        $or: [
          { isSubscribe: { $exists: false } },
          { isSubscribe: null },
          { subscriptionAppUserId: { $exists: false } },
          { subscriptionAppUserId: null },
          { subscriptionType: { $exists: false } },
          { subscriptionType: null },
          { subscriptionStart: { $exists: false } },
          { subscriptionStart: null },
          { subscriptionEnd: { $exists: false } },
          { subscriptionEnd: null }
        ]
      },
      {
        $set: {
          isSubscribe: false,
          subscriptionAppUserId: null,
          subscriptionType: null,
          subscriptionStart: null,
          subscriptionEnd: null
        }
      }
    );

    const updatedCount = bulkUpdateResult.modifiedCount;
    const skippedCount = users.length - updatedCount;

    console.log("\n📈 Migration Summary:");
    console.log(`✅ Updated: ${updatedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already had fields)`);
    console.log(`📊 Total: ${users.length} users`);

    // Verify migration
    console.log("\n🔍 Verifying migration...");
    const sampleUser = await UserModel.findOne({});
    if (sampleUser) {
      console.log("\nSample user fields after migration:");
      console.log(`  - isSubscribe: ${sampleUser.isSubscribe !== undefined ? '✅ ' + sampleUser.isSubscribe : '❌ Missing'}`);
      console.log(`  - subscriptionAppUserId: ${sampleUser.subscriptionAppUserId !== undefined ? '✅ ' + (sampleUser.subscriptionAppUserId || 'null') : '❌ Missing'}`);
      console.log(`  - subscriptionType: ${sampleUser.subscriptionType !== undefined ? '✅ ' + (sampleUser.subscriptionType || 'null') : '❌ Missing'}`);
      console.log(`  - subscriptionStart: ${sampleUser.subscriptionStart !== undefined ? '✅ ' + (sampleUser.subscriptionStart || 'null') : '❌ Missing'}`);
      console.log(`  - subscriptionEnd: ${sampleUser.subscriptionEnd !== undefined ? '✅ ' + (sampleUser.subscriptionEnd || 'null') : '❌ Missing'}`);
    }

    console.log("\n✅ Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run migration
addSubscriptionFields();

