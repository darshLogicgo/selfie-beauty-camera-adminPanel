import mongoose from "mongoose";

const { Schema, model } = mongoose;

const SubcategorySchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    subcategoryTitle: { type: String, required: true, trim: true },
    // img_sqr: { type: String, default: "" },
    // img_rec: { type: String, default: "" },
    // video_sqr: { type: String, default: "" },
    // video_rec: { type: String, default: "" },

    img_sqr: { type: String, default: "", trim: true },
img_rec: { type: String, default: "", trim: true },
video_sqr: { type: String, default: "", trim: true },
video_rec: { type: String, default: "", trim: true },

    status: { type: Boolean, default: true },
    order: { type: Number },
    asset_images: { type: [String], default: [] }, // Array of additional image URLs
    // AI World section fields
    isAiWorld: { type: Boolean, default: false }, // Whether category is in AI World section
    aiWorldOrder: { type: Number, default: 0 }, // Order in AI World section (starts from 1)
    // you can add createdBy/updatedBy if needed
  },
  { timestamps: true }
);

// Compound unique index to ensure title uniqueness inside a category
SubcategorySchema.index({ categoryId: 1, subcategoryTitle: 1 }, { unique: true });

export default model("Subcategory", SubcategorySchema);
