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

export default mongoose.model("Category", CategorySchema);
