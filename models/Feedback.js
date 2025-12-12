import mongoose from "mongoose";
import enums from "../config/enum.config.js";

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
    status: {
      type: String,
      enum: Object.values(enums.feedbackStatusEnum),
      default: enums.feedbackStatusEnum.PENDING,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });

export default model("Feedback", FeedbackSchema);
