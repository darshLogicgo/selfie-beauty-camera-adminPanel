import mongoose from "mongoose";

const { Schema, model } = mongoose;

const FeedbackSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    appVersion: {
      type: String,
      default: "",
      trim: true,
    },
    platform: {
      type: String,
      enum: ["ANDROID", "IOS", ""],
      default: "",
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for efficient queries
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ createdAt: -1 });

export default model("Feedback", FeedbackSchema);

