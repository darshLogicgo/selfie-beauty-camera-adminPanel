import mongoose from "mongoose";

const { Schema, model } = mongoose;

const SubcategorySchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
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
    asset_images: [
      {
        _id: Schema.Types.ObjectId,
        url: { type: String, required: true },
        isPremium: { type: Boolean, default: false },
        imageCount: { type: Number, default: 1, min: 1 },
        prompt: { type: String, default: "", trim: true }, // Optional prompt field
      },
    ], // Array of asset objects with _id, url, isPremium, imageCount, and prompt
    // Premium field
    isPremium: { type: Boolean, default: false }, // Whether subcategory is premium
    // Image count field
    imageCount: { type: Number, default: 1, min: 1 }, // Number of images needed for this subcategory
    // AI Photo section fields
    isAiPhoto: { type: Boolean, default: false }, // Whether category is in AI Photo section
    aiPhotoOrder: { type: Number, default: 0 }, // Order in AI Photo section (starts from 1)
    // Home section fields (Section 3, 4, 5 use subcategories)
    isSection3: { type: Boolean, default: false }, // Whether subcategory is in Section 3 (Subcategory Grid)
    section3Order: { type: Number, default: 1 }, // Order in Section 3 (starts from 1)
    isSection4: { type: Boolean, default: false }, // Whether subcategory is in Section 4
    section4Order: { type: Number, default: 1 }, // Order in Section 4 (starts from 1)
    isSection5: { type: Boolean, default: false }, // Whether subcategory is in Section 5
    section5Order: { type: Number, default: 1 }, // Order in Section 5 (starts from 1)
    isSection8: { type: Boolean, default: false }, // Whether subcategory is in Section 8
    section8Order: { type: Number, default: 1 }, // Order in Section 8 (starts from 1)
    // you can add createdBy/updatedBy if needed
  },
  { timestamps: true }
);

// Compound unique index to ensure title uniqueness inside a category
SubcategorySchema.index(
  { categoryId: 1, subcategoryTitle: 1 },
  { unique: true }
);

// Indexes for Home Section queries (Section 3, 4, 5)
SubcategorySchema.index({ isSection3: 1, section3Order: 1 });
SubcategorySchema.index({ status: 1, isSection3: 1, section3Order: 1 });
SubcategorySchema.index({ section3Order: -1 });

SubcategorySchema.index({ isSection4: 1, section4Order: 1 });
SubcategorySchema.index({ status: 1, isSection4: 1, section4Order: 1 });
SubcategorySchema.index({ section4Order: -1 });

SubcategorySchema.index({ isSection5: 1, section5Order: 1 });
SubcategorySchema.index({ status: 1, isSection5: 1, section5Order: 1 });
SubcategorySchema.index({ section5Order: -1 });

SubcategorySchema.index({ isSection8: 1, section8Order: 1 });
SubcategorySchema.index({ status: 1, isSection8: 1, section8Order: 1 });
SubcategorySchema.index({ section8Order: -1 });

// Check if model already exists to prevent overwrite error during hot reload
const Subcategory =
  mongoose.models.Subcategory || model("Subcategory", SubcategorySchema);

export default Subcategory;
