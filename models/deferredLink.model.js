import mongoose from "mongoose";

const deferredLinkSchema = new mongoose.Schema(
  {
    installRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    tokenHash: {
      type: String,
      required: true,
    },
    featureTitle: {
      type: String,
      required: true,
    },
    imageId: {
      type: String,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired records
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient lookups
deferredLinkSchema.index({ installRef: 1, consumed: 1, expiresAt: 1 });

// Method to check if link is valid
deferredLinkSchema.methods.isValid = function () {
  return !this.consumed && this.expiresAt > new Date();
};

const DeferredLink = mongoose.model("DeferredLink", deferredLinkSchema);

export default DeferredLink;

