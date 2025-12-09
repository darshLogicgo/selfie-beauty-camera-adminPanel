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
    asset_images: { type: [String], default: [] }, // Array of additional image URLs
    // Premium field
    isPremium: { type: Boolean, default: false }, // Whether subcategory is premium
    // Select Image count field
    selectImage: { type: Number, default: 1, min: 1 }, // Number of images needed for this subcategory
    // AI World section fields
    isAiWorld: { type: Boolean, default: false }, // Whether category is in AI World section
    aiWorldOrder: { type: Number, default: 0 }, // Order in AI World section (starts from 1)
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

export default model("Subcategory", SubcategorySchema);
