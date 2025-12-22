import mongoose from "mongoose";

const UserPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index to ensure one user can have one preference per category
UserPreferenceSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

// Index for querying user preferences by user
UserPreferenceSchema.index({ userId: 1, isDeleted: 1 });
// Index for ordering user preferences
UserPreferenceSchema.index({ userId: 1, isDeleted: 1, order: 1 });

const UserPreference = mongoose.model("UserPreference", UserPreferenceSchema);

export default UserPreference;

