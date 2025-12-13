import mongoose, { Schema } from "mongoose";

const feedbackSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      default: null,
    },
    platform: {
      type: String,
      enum: {
        values: ["android", "ios", "web"],
        message: "Platform must be one of: android, ios, web",
      },
      default: null,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "resolved"],
        message: "Status must be one of: pending, resolved",
      },
      default: "pending",
    },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
