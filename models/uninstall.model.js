import mongoose, { Schema } from "mongoose";
import enums from "../config/enum.config.js";

const { uninstallReasons: UNINSTALL_REASONS } = enums;

const uninstallSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    package_name: { type: String, default: null },
    android_version: { type: String, default: null },
    app_version: { type: String, default: null },
    platform: {
      type: String,
      enum: {
        values: ["android", "ios", "web"],
        message: "Platform must be one of: android, ios, web",
      },
      default: null,
    },
    device_model: { type: String, default: null },
    uninstall_reason: {
      type: String,
      enum: Object.values(UNINSTALL_REASONS),
      required: true,
    },
    other_reason_text: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Uninstall = mongoose.model("Uninstall", uninstallSchema);

export default Uninstall;

