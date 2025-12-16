/**
 * Script to remove the old isSubscribed field from all users
 * This field was replaced by isSubscribe
 * 
 * Usage: node scripts/remove-isSubscribed-field.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/user.model.js";
import config from "../config/config.js";

// Load environment variables
dotenv.config({
  path: config.nodeEnv === "development" ? ".env.dev" : ".env",
});

const removeIsSubscribedField = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(config.mongodb.url);
    console.log("✅ Connected to MongoDB");

    // Remove isSubscribed field from all users using bulk operation
    console.log("\n🔄 Removing 'isSubscribed' field from all users...");
    
    // First, count how many users have the field
    const beforeCount = await UserModel.countDocuments({ isSubscribed: { $exists: true } });
    console.log(`Found ${beforeCount} users with 'isSubscribed' field`);
    
    // Remove the field using $unset
    const result = await UserModel.updateMany(
      {},
      { $unset: { isSubscribed: "" } }
    );

    console.log(`✅ Update operation completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    // Wait a moment for MongoDB to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify removal - check again
    console.log("\n🔍 Verifying removal...");
    const usersWithField = await UserModel.countDocuments({ isSubscribed: { $exists: true } });
    
    if (usersWithField === 0) {
      console.log("✅ All 'isSubscribed' fields have been removed successfully!");
    } else {
      console.log(`⚠️  Warning: ${usersWithField} users still have 'isSubscribed' field`);
      console.log("   This might be a caching issue. Try refreshing MongoDB Compass.");
    }

    // Show sample user to confirm
    const sampleUser = await UserModel.findOne({});
    if (sampleUser) {
      console.log("\n📊 Sample user fields after cleanup:");
      console.log(`  - isSubscribe: ${sampleUser.isSubscribe !== undefined ? '✅ ' + sampleUser.isSubscribe : '❌ Missing'}`);
      console.log(`  - isSubscribed: ${sampleUser.isSubscribed !== undefined ? '❌ Still exists' : '✅ Removed'}`);
    }

    console.log("\n✅ Script completed successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run script
removeIsSubscribedField();

