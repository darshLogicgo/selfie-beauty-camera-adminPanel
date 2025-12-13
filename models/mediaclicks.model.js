import mongoose from "mongoose";

const MediaClicksSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categories: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        click_count: {
          type: Number,
          default: 0,
        },
        lastClickedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
MediaClicksSchema.index({ userId: 1 });
MediaClicksSchema.index({ "categories.categoryId": 1 });

// Explicitly set collection name to match your MongoDB collection
const MediaClicks = mongoose.model("MediaClicks", MediaClicksSchema, "media_clicks");

export default MediaClicks;

