import mongoose from "mongoose";

const HomeSettingsSchema = new mongoose.Schema(
  {
    section6Title: {
      type: String,
      default: "Enhance Tools",
      trim: true,
    },
    section7Title: {
      type: String,
      default: "AI Tools",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure only one document exists
HomeSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      section6Title: "Enhance Tools",
      section7Title: "AI Tools",
    });
  }
  return settings;
};

export default mongoose.model("HomeSettings", HomeSettingsSchema);
