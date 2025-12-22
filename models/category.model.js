import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Media URLs stored (DigitalOcean public URLs)
    img_sqr: { type: String, default: null }, // Square/Vertical Image
    img_rec: { type: String, default: null }, // Rectangular/Horizontal Image

    video_sqr: { type: String, default: null }, // Square/Vertical Video
    video_rec: { type: String, default: null }, // Rectangular/Horizontal Video

    status: { type: Boolean, default: true }, // show/hide
    order: { type: Number, default: 0 },

    // Trending section fields
    isTrending: { type: Boolean, default: false }, // Whether category is in trending section
    trendingOrder: { type: Number, default: 0 }, // Order in trending section (starts from 1)

    // AI World section fields
    isAiWorld: { type: Boolean, default: false }, // Whether category is in AI World section
    aiWorldOrder: { type: Number, default: 0 }, // Order in AI World section (starts from 1)

    // Premium field
    isPremium: { type: Boolean, default: false }, // Whether category is premium

    // Image count field
    imageCount: { type: Number, default: 1, min: 1 }, // Number of images needed to create this category (e.g., 3D Model: 1, AI Hug: 2, AI Kiss: 2)

    // Prompt field
    prompt: { type: String, default: "", trim: true }, // Default prompt for this category

    // Home section fields (Section 1, 2, 6, 7 use categories)
    isSection1: { type: Boolean, default: false }, // Whether category is in Section 1 (Featured Categories)
    section1Order: { type: Number, default: 1 }, // Order in Section 1 (starts from 1)
    isSection2: { type: Boolean, default: false }, // Whether category is in Section 2 (Category Showcase)
    section2Order: { type: Number, default: 1 }, // Order in Section 2 (starts from 1)
    isSection6: { type: Boolean, default: false }, // Whether category is in Section 6 (Enhance Tools)
    section6Order: { type: Number, default: 1 }, // Order in Section 6 (starts from 1)
    isSection7: { type: Boolean, default: false }, // Whether category is in Section 7 (AI Tools)
    section7Order: { type: Number, default: 1 }, // Order in Section 7 (starts from 1)

    // User Preference section fields
    isUserPreference: { type: Boolean, default: false }, // Whether category is in user preference section
    userPreferenceOrder: { type: Number, default: 0 }, // Order in user preference section (starts from 1)

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Optimized indexes for faster queries
// Compound index for most common query pattern (getCategories)
CategorySchema.index({ isDeleted: 1, order: 1, createdAt: 1 });
// Index for status-based queries
CategorySchema.index({ isDeleted: 1, status: 1, order: 1 });
// Index for order-based queries
CategorySchema.index({ order: 1 });
// Index for max order query optimization
CategorySchema.index({ isDeleted: 1, order: -1 });
// Index for single document lookups
CategorySchema.index({ _id: 1, isDeleted: 1 });
// Indexes for trending queries
CategorySchema.index({ isDeleted: 1, isTrending: 1, trendingOrder: 1 }); // Ascending for normal queries
CategorySchema.index({ isDeleted: 1, isTrending: 1, trendingOrder: -1 }); // Descending for max order queries
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isTrending: 1,
  trendingOrder: 1,
});
CategorySchema.index({ isTrending: 1, trendingOrder: 1 });
// Index for querying max trendingOrder from all categories (without isTrending filter)
CategorySchema.index({ isDeleted: 1, trendingOrder: -1 });

// Indexes for AI World queries
CategorySchema.index({ isDeleted: 1, isAiWorld: 1, aiWorldOrder: 1 }); // Ascending for normal queries
CategorySchema.index({ isDeleted: 1, isAiWorld: 1, aiWorldOrder: -1 }); // Descending for max order queries
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isAiWorld: 1,
  aiWorldOrder: 1,
});
CategorySchema.index({ isAiWorld: 1, aiWorldOrder: 1 });
// Index for querying max aiWorldOrder from all categories (without isAiWorld filter)
CategorySchema.index({ isDeleted: 1, aiWorldOrder: -1 });

// Indexes for Home Section queries (Section 1, 2, 6, 7)
CategorySchema.index({ isDeleted: 1, isSection1: 1, section1Order: 1 });
CategorySchema.index({ isDeleted: 1, isSection1: 1, section1Order: -1 });
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isSection1: 1,
  section1Order: 1,
});
CategorySchema.index({ isDeleted: 1, section1Order: -1 });

CategorySchema.index({ isDeleted: 1, isSection2: 1, section2Order: 1 });
CategorySchema.index({ isDeleted: 1, isSection2: 1, section2Order: -1 });
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isSection2: 1,
  section2Order: 1,
});
CategorySchema.index({ isDeleted: 1, section2Order: -1 });

CategorySchema.index({ isDeleted: 1, isSection6: 1, section6Order: 1 });
CategorySchema.index({ isDeleted: 1, isSection6: 1, section6Order: -1 });
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isSection6: 1,
  section6Order: 1,
});
CategorySchema.index({ isDeleted: 1, section6Order: -1 });

CategorySchema.index({ isDeleted: 1, isSection7: 1, section7Order: 1 });
CategorySchema.index({ isDeleted: 1, isSection7: 1, section7Order: -1 });
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isSection7: 1,
  section7Order: 1,
});
CategorySchema.index({ isDeleted: 1, section7Order: -1 });

// Indexes for User Preference queries
CategorySchema.index({ isDeleted: 1, isUserPreference: 1, userPreferenceOrder: 1 }); // Ascending for normal queries
CategorySchema.index({ isDeleted: 1, isUserPreference: 1, userPreferenceOrder: -1 }); // Descending for max order queries
CategorySchema.index({
  isDeleted: 1,
  status: 1,
  isUserPreference: 1,
  userPreferenceOrder: 1,
});
CategorySchema.index({ isUserPreference: 1, userPreferenceOrder: 1 });
// Index for querying max userPreferenceOrder from all categories (without isUserPreference filter)
CategorySchema.index({ isDeleted: 1, userPreferenceOrder: -1 });

export default mongoose.model("Category", CategorySchema);
