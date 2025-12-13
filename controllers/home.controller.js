import { StatusCodes } from "http-status-codes";
import Category from "../models/category.model.js";
import Subcategory from "../models/subcategory.js";
import HomeSettings from "../models/homeSettings.model.js";
import MediaClick from "../models/media_click.model.js";
import categoryService from "../services/category.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import helper from "../helper/common.helper.js";
import mongoose from "mongoose";

/**
 * Get home page data with 7 sections (Client side)
 * Returns only active categories/subcategories for each section
 * @route GET /api/v1/home
 * @access Public
 */
export const getHomeData = async (req, res) => {
  try {
    // Get home settings for section titles
    const homeSettings = await HomeSettings.getSettings();

    // Check if categoryId is provided in query
    const queryCategoryId = req.query?.categoryId;
    let priorityCategoryId = null;
    if (queryCategoryId && mongoose.Types.ObjectId.isValid(queryCategoryId)) {
      priorityCategoryId = queryCategoryId.toString();
    }

    // Check if user is logged in
    const userId = req.user?._id || req.user?.id;
    let userClickData = null;
    let userClickedCategoryIds = new Set();

    // Fetch user click data if user is logged in
    if (userId) {
      try {
        userClickData = await MediaClick.findOne({ userId }).lean();
        if (userClickData && userClickData.categories) {
          userClickData.categories.forEach((cat) => {
            if (cat.categoryId) {
              userClickedCategoryIds.add(cat.categoryId.toString());
            }
          });
        }
      } catch (error) {
        console.error("Error fetching user click data:", error);
        // Continue with default behavior if error occurs
      }
    }

    // Build Section 1 query - include categories user clicked even if isSection1 is false
    // Also include priority categoryId from query if provided
    const section1Query = {
      isDeleted: false,
      status: true,
    };

    // Build $or conditions array
    const orConditions = [{ isSection1: true }];

    // Add priority categoryId from query if provided
    if (priorityCategoryId) {
      orConditions.push({
        _id: new mongoose.Types.ObjectId(priorityCategoryId),
      });
    }

    // Add user clicked categories
    if (userClickedCategoryIds.size > 0) {
      orConditions.push({
        _id: {
          $in: Array.from(userClickedCategoryIds).map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      });
    }

    // If we have any special conditions, use $or, otherwise default to isSection1: true
    if (orConditions.length > 1 || priorityCategoryId) {
      section1Query.$or = orConditions;
    } else {
      // Default: only show categories with isSection1: true
      section1Query.isSection1 = true;
    }

    // Build Section 2 query - include categories user clicked even if isSection2 is false
    // Also include priority categoryId from query if provided
    const section2Query = {
      isDeleted: false,
      status: true,
    };

    // Build $or conditions array for Section 2
    const section2OrConditions = [{ isSection2: true }];

    // Add priority categoryId from query if provided
    if (priorityCategoryId) {
      section2OrConditions.push({
        _id: new mongoose.Types.ObjectId(priorityCategoryId),
      });
    }

    // Add user clicked categories
    if (userClickedCategoryIds.size > 0) {
      section2OrConditions.push({
        _id: {
          $in: Array.from(userClickedCategoryIds).map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      });
    }

    // If we have any special conditions, use $or, otherwise default to isSection2: true
    if (section2OrConditions.length > 1 || priorityCategoryId) {
      section2Query.$or = section2OrConditions;
    } else {
      // Default: only show categories with isSection2: true
      section2Query.isSection2 = true;
    }

    // Parallel queries for all sections (optimized)
    const [
      section1Categories,
      section2Categories,
      section3Subcategories,
      section4Subcategories,
      section5Subcategories,
      section6Categories,
      section7Categories,
    ] = await Promise.all([
      // Section 1: Featured Categories
      Category.find(section1Query)
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          section1Order: 1,
          isSection1: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section1Order: 1, createdAt: 1 })
        .lean()
        .hint({ isDeleted: 1, status: 1, isSection1: 1, section1Order: 1 }),

      // Section 2: Category Showcase
      Category.find(section2Query)
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          section2Order: 1,
          isSection2: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section2Order: 1, createdAt: 1 })
        .lean()
        .hint({ isDeleted: 1, status: 1, isSection2: 1, section2Order: 1 }),

      // Section 3: Subcategory Grid
      Subcategory.find({
        status: true,
        isSection3: true,
      })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section3Order: 1, createdAt: 1 })
        .lean()
        .hint({ status: 1, isSection3: 1, section3Order: 1 }),

      // Section 4: Subcategories
      Subcategory.find({
        status: true,
        isSection4: true,
      })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section4Order: 1, createdAt: 1 })
        .lean()
        .hint({ status: 1, isSection4: 1, section4Order: 1 }),

      // Section 5: Subcategories
      Subcategory.find({
        status: true,
        isSection5: true,
      })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section5Order: 1, createdAt: 1 })
        .lean()
        .hint({ status: 1, isSection5: 1, section5Order: 1 }),

      // Section 6: Enhance Tools
      Category.find({
        isDeleted: false,
        status: true,
        isSection6: true,
      })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section6Order: 1, createdAt: 1 })
        .lean()
        .hint({ isDeleted: 1, status: 1, isSection6: 1, section6Order: 1 }),

      // Section 7: AI Tools
      Category.find({
        isDeleted: false,
        status: true,
        isSection7: true,
      })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section7Order: 1, createdAt: 1 })
        .lean()
        .hint({ isDeleted: 1, status: 1, isSection7: 1, section7Order: 1 }),
    ]);

    // Sort Section 1 categories based on priority categoryId and user click data
    let sortedSection1Categories = section1Categories;

    // Separate priority category (from query) and other categories
    let priorityCategory = null;
    let otherCategories = [];

    if (priorityCategoryId) {
      const priorityIndex = section1Categories.findIndex(
        (cat) => cat._id.toString() === priorityCategoryId
      );
      if (priorityIndex !== -1) {
        priorityCategory = section1Categories[priorityIndex];
        otherCategories = section1Categories.filter(
          (cat) => cat._id.toString() !== priorityCategoryId
        );
      } else {
        // Priority category not found in results, try to fetch it separately
        try {
          const fetchedCategory = await Category.findOne({
            _id: new mongoose.Types.ObjectId(priorityCategoryId),
            isDeleted: false,
            status: true,
          })
            .select({
              name: 1,
              img_sqr: 1,
              img_rec: 1,
              video_sqr: 1,
              video_rec: 1,
              status: 1,
              order: 1,
              isPremium: 1,
              selectImage: 1,
              prompt: 1,
              section1Order: 1,
              isSection1: 1,
              createdAt: 1,
              updatedAt: 1,
            })
            .lean();
          if (fetchedCategory) {
            priorityCategory = fetchedCategory;
            otherCategories = section1Categories;
          } else {
            otherCategories = section1Categories;
          }
        } catch (error) {
          console.error("Error fetching priority category:", error);
          otherCategories = section1Categories;
        }
      }
    } else {
      otherCategories = section1Categories;
    }

    // Sort other categories based on user click data
    if (
      userId &&
      userClickData &&
      userClickData.categories &&
      userClickData.categories.length > 0
    ) {
      // Create a map of categoryId to click_count for quick lookup
      const clickCountMap = new Map();
      userClickData.categories.forEach((cat) => {
        if (cat.categoryId) {
          clickCountMap.set(cat.categoryId.toString(), cat.click_count || 0);
        }
      });

      // Sort categories:
      // 1. First by click_count (descending - highest first)
      // 2. If click_count is same, user-clicked categories first, then by section1Order
      otherCategories = [...otherCategories].sort((a, b) => {
        const aId = a._id.toString();
        const bId = b._id.toString();
        const aClickCount = clickCountMap.get(aId) || 0;
        const bClickCount = clickCountMap.get(bId) || 0;
        const aIsClicked = clickCountMap.has(aId);
        const bIsClicked = clickCountMap.has(bId);

        // Primary sort: by click count (descending - highest first)
        if (aClickCount !== bClickCount) {
          return bClickCount - aClickCount;
        }

        // Secondary sort: if same click count, user-clicked categories first
        // If a is clicked and b is not, a comes first (return -1)
        // If b is clicked and a is not, b comes first (return 1)
        if (aIsClicked && !bIsClicked) {
          return -1;
        }
        if (!aIsClicked && bIsClicked) {
          return 1;
        }

        // Tertiary sort: if both clicked or both not clicked, use section1Order
        const aOrder = a.section1Order || 999999;
        const bOrder = b.section1Order || 999999;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        // Final sort: by createdAt for consistency
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    } else {
      // Default sorting: by section1Order (already sorted from query)
      // No need to re-sort if no click data
    }

    // Combine: priority category first, then other categories
    if (priorityCategory) {
      sortedSection1Categories = [priorityCategory, ...otherCategories];
    } else {
      sortedSection1Categories = otherCategories;
    }

    // Sort Section 2 categories based on priority categoryId and user click data
    let sortedSection2Categories = section2Categories;

    // Separate priority category (from query) and other categories for Section 2
    let priorityCategory2 = null;
    let otherCategories2 = [];

    if (priorityCategoryId) {
      const priorityIndex2 = section2Categories.findIndex(
        (cat) => cat._id.toString() === priorityCategoryId
      );
      if (priorityIndex2 !== -1) {
        priorityCategory2 = section2Categories[priorityIndex2];
        otherCategories2 = section2Categories.filter(
          (cat) => cat._id.toString() !== priorityCategoryId
        );
      } else {
        // Priority category not found in results, try to fetch it separately
        try {
          const fetchedCategory2 = await Category.findOne({
            _id: new mongoose.Types.ObjectId(priorityCategoryId),
            isDeleted: false,
            status: true,
          })
            .select({
              name: 1,
              img_sqr: 1,
              img_rec: 1,
              video_sqr: 1,
              video_rec: 1,
              status: 1,
              order: 1,
              isPremium: 1,
              selectImage: 1,
              prompt: 1,
              section2Order: 1,
              isSection2: 1,
              createdAt: 1,
              updatedAt: 1,
            })
            .lean();
          if (fetchedCategory2) {
            priorityCategory2 = fetchedCategory2;
            otherCategories2 = section2Categories;
          } else {
            otherCategories2 = section2Categories;
          }
        } catch (error) {
          console.error("Error fetching priority category for Section 2:", error);
          otherCategories2 = section2Categories;
        }
      }
    } else {
      otherCategories2 = section2Categories;
    }

    // Sort other categories based on user click data for Section 2
    if (
      userId &&
      userClickData &&
      userClickData.categories &&
      userClickData.categories.length > 0
    ) {
      // Create a map of categoryId to click_count for quick lookup
      const clickCountMap2 = new Map();
      userClickData.categories.forEach((cat) => {
        if (cat.categoryId) {
          clickCountMap2.set(cat.categoryId.toString(), cat.click_count || 0);
        }
      });

      // Sort categories:
      // 1. First by click_count (descending - highest first)
      // 2. If click_count is same, user-clicked categories first, then by section2Order
      otherCategories2 = [...otherCategories2].sort((a, b) => {
        const aId = a._id.toString();
        const bId = b._id.toString();
        const aClickCount = clickCountMap2.get(aId) || 0;
        const bClickCount = clickCountMap2.get(bId) || 0;
        const aIsClicked = clickCountMap2.has(aId);
        const bIsClicked = clickCountMap2.has(bId);

        // Primary sort: by click count (descending - highest first)
        if (aClickCount !== bClickCount) {
          return bClickCount - aClickCount;
        }

        // Secondary sort: if same click count, user-clicked categories first
        // If a is clicked and b is not, a comes first (return -1)
        // If b is clicked and a is not, b comes first (return 1)
        if (aIsClicked && !bIsClicked) {
          return -1;
        }
        if (!aIsClicked && bIsClicked) {
          return 1;
        }

        // Tertiary sort: if both clicked or both not clicked, use section2Order
        const aOrder = a.section2Order || 999999;
        const bOrder = b.section2Order || 999999;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        // Final sort: by createdAt for consistency
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    } else {
      // Default sorting: by section2Order (already sorted from query)
      // No need to re-sort if no click data
    }

    // Combine: priority category first, then other categories for Section 2
    if (priorityCategory2) {
      sortedSection2Categories = [priorityCategory2, ...otherCategories2];
    } else {
      sortedSection2Categories = otherCategories2;
    }

    // Build response with 7 sections (all with title structure)
    const responseData = {
      section1: {
        title: "image",
        categories: sortedSection1Categories, // Featured Categories (sorted by click count if user has data)
      },
      section2: {
        title: "AI Face Swap",
        categories: sortedSection2Categories, // Category Showcase (sorted by click count if user has data)
      },
      section3: {
        title: "Ai Face Swap",
        subcategories: section3Subcategories, // Subcategory Grid
      },
      section4: {
        title: "image",
        subcategories: section4Subcategories, // Subcategories
      },
      section5: {
        title: "image",
        subcategories: section5Subcategories, // Subcategories
      },
      section6: {
        title: homeSettings.section6Title || "Enhance Tools",
        categories: section6Categories, // Enhance Tools
      },
      section7: {
        title: homeSettings.section7Title || "AI Tools",
        categories: section7Categories, // AI Tools
      },
    };

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Home data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("getHomeData error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error.message || "Failed to fetch home data",
    });
  }
};

/**
 * Get all sections data in one response (Admin)
 * Returns all categories and subcategories for all sections (same structure as public API)
 * @route GET /api/v1/home/sections/all
 * @access Private (Admin)
 */
const getAllSectionsData = async (req, res) => {
  try {
    // Get home settings for section titles
    const homeSettings = await HomeSettings.getSettings();

    // Parallel queries for all sections (optimized) - no pagination, return all
    const [
      section1Categories,
      section2Categories,
      section3Subcategories,
      section4Subcategories,
      section5Subcategories,
      section6Categories,
      section7Categories,
    ] = await Promise.all([
      // Section 1: Featured Categories - All categories (for admin selection)
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isTrending: 1,
          trendingOrder: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isPremium: 1,
          isSection1: 1,
          section1Order: 1,
          isSection2: 1,
          section2Order: 1,
          isSection6: 1,
          section6Order: 1,
          isSection7: 1,
          section7Order: 1,
          selectImage: 1,
          prompt: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section1Order: 1, createdAt: 1 })
        .lean(),

      // Section 2: Category Showcase - All categories (for admin selection)
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isTrending: 1,
          trendingOrder: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isPremium: 1,
          isSection1: 1,
          section1Order: 1,
          isSection2: 1,
          section2Order: 1,
          isSection6: 1,
          section6Order: 1,
          isSection7: 1,
          section7Order: 1,
          selectImage: 1,
          prompt: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section2Order: 1, createdAt: 1 })
        .lean(),

      // Section 3: Subcategory Grid - All subcategories (for admin selection)
      Subcategory.find({ status: true })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isSection3: 1,
          section3Order: 1,
          isSection4: 1,
          section4Order: 1,
          isSection5: 1,
          section5Order: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section3Order: 1, createdAt: 1 })
        .lean(),

      // Section 4: Subcategories - All subcategories (for admin selection)
      Subcategory.find({ status: true })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isSection3: 1,
          section3Order: 1,
          isSection4: 1,
          section4Order: 1,
          isSection5: 1,
          section5Order: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section4Order: 1, createdAt: 1 })
        .lean(),

      // Section 5: Subcategories - All subcategories (for admin selection)
      Subcategory.find({ status: true })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isSection3: 1,
          section3Order: 1,
          isSection4: 1,
          section4Order: 1,
          isSection5: 1,
          section5Order: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section5Order: 1, createdAt: 1 })
        .lean(),

      // Section 6: Enhance Tools - All categories (for admin selection)
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isTrending: 1,
          trendingOrder: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isPremium: 1,
          isSection1: 1,
          section1Order: 1,
          isSection2: 1,
          section2Order: 1,
          isSection6: 1,
          section6Order: 1,
          isSection7: 1,
          section7Order: 1,
          selectImage: 1,
          prompt: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section6Order: 1, createdAt: 1 })
        .lean(),

      // Section 7: AI Tools - All categories (for admin selection)
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isTrending: 1,
          trendingOrder: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          isPremium: 1,
          isSection1: 1,
          section1Order: 1,
          isSection2: 1,
          section2Order: 1,
          isSection6: 1,
          section6Order: 1,
          isSection7: 1,
          section7Order: 1,
          selectImage: 1,
          prompt: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        })
        .sort({ section7Order: 1, createdAt: 1 })
        .lean(),
    ]);

    // Build response with same structure as public API
    const responseData = {
      section1: section1Categories, // Array directly (like public API)
      section2: section2Categories, // Array directly (like public API)
      section3: section3Subcategories, // Array directly (like public API)
      section4: section4Subcategories, // Array directly (like public API)
      section5: section5Subcategories, // Array directly (like public API)
      section6: {
        title: homeSettings.section6Title || "Enhance Tools",
        categories: section6Categories, // Object with title and categories (like public API)
      },
      section7: {
        title: homeSettings.section7Title || "AI Tools",
        categories: section7Categories, // Object with title and categories (like public API)
      },
    };

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "All sections data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Get All Sections Data Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch all sections data",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all categories for Section 1 selection (Admin)
 * Returns all categories sorted by section1Order (regardless of isSection1 status)
 * @route GET /api/v1/home/section1/all
 * @access Private (Admin)
 */
const getAllCategoriesForSection1 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [categories, total] = await Promise.all([
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection1: 1,
          section1Order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section1Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ isDeleted: 1, section1Order: 1 }),
      categoryService.countDocuments({ isDeleted: false, status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for Section 1 selection",
      data: categories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Categories For Section 1 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for Section 1",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all categories for Section 2 selection (Admin)
 * @route GET /api/v1/home/section2/all
 * @access Private (Admin)
 */
const getAllCategoriesForSection2 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [categories, total] = await Promise.all([
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection2: 1,
          section2Order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section2Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ isDeleted: 1, section2Order: 1 }),
      categoryService.countDocuments({ isDeleted: false, status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for Section 2 selection",
      data: categories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Categories For Section 2 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for Section 2",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all categories for Section 6 selection (Admin)
 * @route GET /api/v1/home/section6/all
 * @access Private (Admin)
 */
const getAllCategoriesForSection6 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [categories, total] = await Promise.all([
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection6: 1,
          section6Order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section6Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ isDeleted: 1, section6Order: 1 }),
      categoryService.countDocuments({ isDeleted: false, status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for Section 6 selection",
      data: categories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Categories For Section 6 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for Section 6",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all categories for Section 7 selection (Admin)
 * @route GET /api/v1/home/section7/all
 * @access Private (Admin)
 */
const getAllCategoriesForSection7 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [categories, total] = await Promise.all([
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection7: 1,
          section7Order: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section7Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ isDeleted: 1, section7Order: 1 }),
      categoryService.countDocuments({ isDeleted: false, status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for Section 7 selection",
      data: categories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Categories For Section 7 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for Section 7",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all subcategories for Section 3 selection (Admin)
 * @route GET /api/v1/home/section3/all
 * @access Private (Admin)
 */
const getAllSubcategoriesForSection3 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [subcategories, total] = await Promise.all([
      Subcategory.find({ status: true })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection3: 1,
          section3Order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section3Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ status: 1, section3Order: 1 }),
      Subcategory.countDocuments({ status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Subcategories fetched successfully for Section 3 selection",
      data: subcategories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Subcategories For Section 3 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch subcategories for Section 3",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all subcategories for Section 4 selection (Admin)
 * @route GET /api/v1/home/section4/all
 * @access Private (Admin)
 */
const getAllSubcategoriesForSection4 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [subcategories, total] = await Promise.all([
      Subcategory.find({ status: true })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection4: 1,
          section4Order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section4Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ status: 1, section4Order: 1 }),
      Subcategory.countDocuments({ status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Subcategories fetched successfully for Section 4 selection",
      data: subcategories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Subcategories For Section 4 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch subcategories for Section 4",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all subcategories for Section 5 selection (Admin)
 * @route GET /api/v1/home/section5/all
 * @access Private (Admin)
 */
const getAllSubcategoriesForSection5 = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    const [subcategories, total] = await Promise.all([
      Subcategory.find({ status: true })
        .select({
          categoryId: 1,
          subcategoryTitle: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isSection5: 1,
          section5Order: 1,
          asset_images: 1,
          isPremium: 1,
          selectImage: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ section5Order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ status: 1, section5Order: 1 }),
      Subcategory.countDocuments({ status: true }),
    ]);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Subcategories fetched successfully for Section 5 selection",
      data: subcategories,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get All Subcategories For Section 5 Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch subcategories for Section 5",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category section status - Optimized with single query
 * @route PATCH /api/v1/home/section1/:id
 * @route PATCH /api/v1/home/section2/:id
 * @route PATCH /api/v1/home/section6/:id
 * @route PATCH /api/v1/home/section7/:id
 * @access Private (Admin)
 */
const toggleCategorySection = async (req, res) => {
  try {
    const { id } = req.params;
    // Extract section number from path (e.g., "/section1/..." -> "1")
    const section = req.path.split("/")[1]?.replace("section", "") || "";
    const { isSection } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Map section number to field names
    const sectionMap = {
      1: { isField: "isSection1", orderField: "section1Order" },
      2: { isField: "isSection2", orderField: "section2Order" },
      6: { isField: "isSection6", orderField: "section6Order" },
      7: { isField: "isSection7", orderField: "section7Order" },
    };

    const sectionConfig = sectionMap[section];
    if (!sectionConfig) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid section number. Valid sections: 1, 2, 6, 7",
        data: null,
      });
    }

    // Optimized: Single query approach
    if (isSection !== undefined) {
      const updated = await Category.findOneAndUpdate(
        { _id: id, isDeleted: false },
        {
          $set: {
            [sectionConfig.isField]: Boolean(isSection),
            updatedAt: new Date(),
          },
        },
        { new: true, lean: true }
      );

      if (!updated) {
        return apiResponse({
          res,
          statusCode: StatusCodes.NOT_FOUND,
          status: false,
          message: "Category not found",
          data: null,
        });
      }

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: isSection
          ? `Category added to Section ${section} successfully`
          : `Category removed from Section ${section} successfully`,
        data: updated,
      });
    }

    // Auto-toggle: Use MongoDB $not operator for atomic toggle in single query
    const updated = await Category.findOneAndUpdate(
      { _id: id, isDeleted: false },
      [
        {
          $set: {
            [sectionConfig.isField]: { $not: `$${sectionConfig.isField}` },
            updatedAt: new Date(),
          },
        },
      ],
      { new: true, lean: true }
    );

    if (!updated) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: updated[sectionConfig.isField]
        ? `Category added to Section ${section} successfully`
        : `Category removed from Section ${section} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Toggle Category Section Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category section status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle subcategory section status - Optimized with single query
 * @route PATCH /api/v1/home/section3/:id
 * @route PATCH /api/v1/home/section4/:id
 * @route PATCH /api/v1/home/section5/:id
 * @access Private (Admin)
 */
const toggleSubcategorySection = async (req, res) => {
  try {
    const { id } = req.params;
    // Extract section number from path (e.g., "/section3/..." -> "3")
    const section = req.path.split("/")[1]?.replace("section", "") || "";
    const { isSection } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid subcategory ID format",
        data: null,
      });
    }

    // Map section number to field names
    const sectionMap = {
      3: { isField: "isSection3", orderField: "section3Order" },
      4: { isField: "isSection4", orderField: "section4Order" },
      5: { isField: "isSection5", orderField: "section5Order" },
    };

    const sectionConfig = sectionMap[section];
    if (!sectionConfig) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid section number. Valid sections: 3, 4, 5",
        data: null,
      });
    }

    // Optimized: Single query approach
    if (isSection !== undefined) {
      const updated = await Subcategory.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            [sectionConfig.isField]: Boolean(isSection),
            updatedAt: new Date(),
          },
        },
        { new: true, lean: true }
      );

      if (!updated) {
        return apiResponse({
          res,
          statusCode: StatusCodes.NOT_FOUND,
          status: false,
          message: "Subcategory not found",
          data: null,
        });
      }

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: isSection
          ? `Subcategory added to Section ${section} successfully`
          : `Subcategory removed from Section ${section} successfully`,
        data: updated,
      });
    }

    // Auto-toggle: Use MongoDB $not operator for atomic toggle in single query
    const updated = await Subcategory.findOneAndUpdate(
      { _id: id },
      [
        {
          $set: {
            [sectionConfig.isField]: { $not: `$${sectionConfig.isField}` },
            updatedAt: new Date(),
          },
        },
      ],
      { new: true, lean: true }
    );

    if (!updated) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Subcategory not found",
        data: null,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: updated[sectionConfig.isField]
        ? `Subcategory added to Section ${section} successfully`
        : `Subcategory removed from Section ${section} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Toggle Subcategory Section Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle subcategory section status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder categories in section (Admin)
 * @route PATCH /api/v1/home/section1/reorder
 * @route PATCH /api/v1/home/section2/reorder
 * @route PATCH /api/v1/home/section6/reorder
 * @route PATCH /api/v1/home/section7/reorder
 * @access Private (Admin)
 */
const reorderCategorySection = async (req, res) => {
  try {
    // Extract section number from path (e.g., "/section1/reorder" -> "1")
    const section = req.path.split("/")[1]?.replace("section", "") || "";

    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { categories } = req.body;
    const items = Array.isArray(categories) ? categories : [];

    if (!items || items.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one category must be provided for reordering",
        data: null,
      });
    }

    // Map section number to field names
    const sectionMap = {
      1: { orderField: "section1Order" },
      2: { orderField: "section2Order" },
      6: { orderField: "section6Order" },
      7: { orderField: "section7Order" },
    };

    const sectionConfig = sectionMap[section];
    if (!sectionConfig) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid section number. Valid sections: 1, 2, 6, 7",
        data: null,
      });
    }

    // Validate all IDs
    const invalidIds = items.filter(
      (it) => !mongoose.Types.ObjectId.isValid(it._id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format provided",
        data: null,
      });
    }

    // Get all categories
    const allCategories = await categoryService
      .find({ isDeleted: false })
      .select({ _id: 1, [sectionConfig.orderField]: 1 })
      .sort({ [sectionConfig.orderField]: 1, createdAt: 1 })
      .lean();

    // Create map of new orders
    const newOrderMap = new Map();
    items.forEach((item) => {
      newOrderMap.set(
        item._id.toString(),
        Number(item[sectionConfig.orderField])
      );
    });

    const isFullReorder = allCategories.length === items.length;

    if (isFullReorder) {
      const sortedItems = [...items].sort(
        (a, b) =>
          Number(a[sectionConfig.orderField]) -
          Number(b[sectionConfig.orderField])
      );

      const finalOrders = new Map();
      sortedItems.forEach((item, index) => {
        finalOrders.set(item._id.toString(), index + 1);
      });

      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              [sectionConfig.orderField]: order,
              updatedAt: new Date(),
            },
          },
        },
      }));

      const result = await categoryService.bulkWrite(bulkOps, {
        ordered: false,
      });

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: `Section ${section} categories reordered successfully`,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
      });
    } else {
      // Partial reorder
      const reorderedCategories = [];
      const unchangedCategories = [];

      allCategories.forEach((cat) => {
        const catId = cat._id.toString();
        if (newOrderMap.has(catId)) {
          reorderedCategories.push({
            _id: cat._id,
            oldOrder: cat[sectionConfig.orderField],
            newOrder: newOrderMap.get(catId),
          });
        } else {
          unchangedCategories.push({
            _id: cat._id,
            order: cat[sectionConfig.orderField],
          });
        }
      });

      reorderedCategories.sort((a, b) => a.newOrder - b.newOrder);

      const finalOrders = new Map();
      let currentOrder = 1;

      reorderedCategories.forEach((cat) => {
        finalOrders.set(cat._id.toString(), currentOrder);
        currentOrder++;
      });

      unchangedCategories.sort((a, b) => a.order - b.order);
      unchangedCategories.forEach((cat) => {
        finalOrders.set(cat._id.toString(), currentOrder);
        currentOrder++;
      });

      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              [sectionConfig.orderField]: order,
              updatedAt: new Date(),
            },
          },
        },
      }));

      const result = await categoryService.bulkWrite(bulkOps, {
        ordered: false,
      });

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: `Section ${section} categories reordered successfully`,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
      });
    }
  } catch (error) {
    console.error("Reorder Category Section Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder category section",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder subcategories in section (Admin)
 * @route PATCH /api/v1/home/section3/reorder
 * @route PATCH /api/v1/home/section4/reorder
 * @route PATCH /api/v1/home/section5/reorder
 * @access Private (Admin)
 */
const reorderSubcategorySection = async (req, res) => {
  try {
    // Extract section number from path (e.g., "/section3/reorder" -> "3")
    const section = req.path.split("/")[1]?.replace("section", "") || "";

    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { subcategories } = req.body;
    const items = Array.isArray(subcategories) ? subcategories : [];

    if (!items || items.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one subcategory must be provided for reordering",
        data: null,
      });
    }

    // Map section number to field names
    const sectionMap = {
      3: { orderField: "section3Order" },
      4: { orderField: "section4Order" },
      5: { orderField: "section5Order" },
    };

    const sectionConfig = sectionMap[section];
    if (!sectionConfig) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid section number. Valid sections: 3, 4, 5",
        data: null,
      });
    }

    // Validate all IDs
    const invalidIds = items.filter(
      (it) => !mongoose.Types.ObjectId.isValid(it._id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid subcategory ID format provided",
        data: null,
      });
    }

    // Get all subcategories
    const allSubcategories = await Subcategory.find({})
      .select({ _id: 1, [sectionConfig.orderField]: 1 })
      .sort({ [sectionConfig.orderField]: 1, createdAt: 1 })
      .lean();

    // Create map of new orders
    const newOrderMap = new Map();
    items.forEach((item) => {
      newOrderMap.set(
        item._id.toString(),
        Number(item[sectionConfig.orderField])
      );
    });

    const isFullReorder = allSubcategories.length === items.length;

    if (isFullReorder) {
      const sortedItems = [...items].sort(
        (a, b) =>
          Number(a[sectionConfig.orderField]) -
          Number(b[sectionConfig.orderField])
      );

      const finalOrders = new Map();
      sortedItems.forEach((item, index) => {
        finalOrders.set(item._id.toString(), index + 1);
      });

      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: {
            $set: {
              [sectionConfig.orderField]: order,
              updatedAt: new Date(),
            },
          },
        },
      }));

      await Subcategory.bulkWrite(bulkOps, { ordered: false });

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: `Section ${section} subcategories reordered successfully`,
      });
    } else {
      // Partial reorder
      const reorderedSubcategories = [];
      const unchangedSubcategories = [];

      allSubcategories.forEach((sub) => {
        const subId = sub._id.toString();
        if (newOrderMap.has(subId)) {
          reorderedSubcategories.push({
            _id: sub._id,
            oldOrder: sub[sectionConfig.orderField],
            newOrder: newOrderMap.get(subId),
          });
        } else {
          unchangedSubcategories.push({
            _id: sub._id,
            order: sub[sectionConfig.orderField],
          });
        }
      });

      reorderedSubcategories.sort((a, b) => a.newOrder - b.newOrder);

      const finalOrders = new Map();
      let currentOrder = 1;

      reorderedSubcategories.forEach((sub) => {
        finalOrders.set(sub._id.toString(), currentOrder);
        currentOrder++;
      });

      unchangedSubcategories.sort((a, b) => a.order - b.order);
      unchangedSubcategories.forEach((sub) => {
        finalOrders.set(sub._id.toString(), currentOrder);
        currentOrder++;
      });

      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: {
            $set: {
              [sectionConfig.orderField]: order,
              updatedAt: new Date(),
            },
          },
        },
      }));

      await Subcategory.bulkWrite(bulkOps, { ordered: false });

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: `Section ${section} subcategories reordered successfully`,
      });
    }
  } catch (error) {
    console.error("Reorder Subcategory Section Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder subcategory section",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Bulk toggle categories in multiple sections (Admin)
 * Toggle multiple categories across sections 1, 2, 6, 7 in one API call
 * @route PATCH /api/v1/home/categories/toggle
 * @access Private (Admin)
 */
const bulkToggleCategorySections = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { categories } = req.body;
    const items = Array.isArray(categories) ? categories : [];

    if (!items || items.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one category must be provided",
        data: null,
      });
    }

    // Validate all IDs
    const invalidIds = items.filter(
      (it) => !mongoose.Types.ObjectId.isValid(it._id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format provided",
        data: null,
      });
    }

    // Section field mapping
    const sectionMap = {
      1: { isField: "isSection1" },
      2: { isField: "isSection2" },
      6: { isField: "isSection6" },
      7: { isField: "isSection7" },
    };

    // Build bulk operations
    const bulkOps = [];
    const now = new Date();

    items.forEach((item) => {
      const categoryId = new mongoose.Types.ObjectId(item._id);
      const updateFields = { updatedAt: now };

      // Process each section (1, 2, 6, 7)
      [1, 2, 6, 7].forEach((sectionNum) => {
        const sectionKey = `isSection${sectionNum}`;
        if (item[sectionKey] !== undefined) {
          updateFields[sectionKey] = Boolean(item[sectionKey]);
        }
      });

      if (Object.keys(updateFields).length > 1) {
        // Only add if there are fields to update (besides updatedAt)
        bulkOps.push({
          updateOne: {
            filter: { _id: categoryId, isDeleted: false },
            update: { $set: updateFields },
          },
        });
      }
    });

    if (bulkOps.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message:
          "No valid updates provided. Please specify isSection1, isSection2, isSection6, or isSection7",
        data: null,
      });
    }

    // Execute bulk update
    const result = await categoryService.bulkWrite(bulkOps, { ordered: false });

    // Fetch updated categories
    const updatedIds = items.map(
      (item) => new mongoose.Types.ObjectId(item._id)
    );
    const updated = await categoryService
      .find({ _id: { $in: updatedIds }, isDeleted: false })
      .lean();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories toggled successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        categories: updated,
      },
    });
  } catch (error) {
    console.error("Bulk Toggle Category Sections Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category sections",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Bulk toggle subcategories in multiple sections (Admin)
 * Toggle multiple subcategories across sections 3, 4, 5 in one API call
 * @route PATCH /api/v1/home/subcategories/toggle
 * @access Private (Admin)
 */
const bulkToggleSubcategorySections = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { subcategories } = req.body;
    const items = Array.isArray(subcategories) ? subcategories : [];

    if (!items || items.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one subcategory must be provided",
        data: null,
      });
    }

    // Validate all IDs
    const invalidIds = items.filter(
      (it) => !mongoose.Types.ObjectId.isValid(it._id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid subcategory ID format provided",
        data: null,
      });
    }

    // Section field mapping
    const sectionMap = {
      3: { isField: "isSection3" },
      4: { isField: "isSection4" },
      5: { isField: "isSection5" },
    };

    // Build bulk operations
    const bulkOps = [];
    const now = new Date();

    items.forEach((item) => {
      const subcategoryId = new mongoose.Types.ObjectId(item._id);
      const updateFields = { updatedAt: now };

      // Process each section (3, 4, 5)
      [3, 4, 5].forEach((sectionNum) => {
        const sectionKey = `isSection${sectionNum}`;
        if (item[sectionKey] !== undefined) {
          updateFields[sectionKey] = Boolean(item[sectionKey]);
        }
      });

      if (Object.keys(updateFields).length > 1) {
        // Only add if there are fields to update (besides updatedAt)
        bulkOps.push({
          updateOne: {
            filter: { _id: subcategoryId },
            update: { $set: updateFields },
          },
        });
      }
    });

    if (bulkOps.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message:
          "No valid updates provided. Please specify isSection3, isSection4, or isSection5",
        data: null,
      });
    }

    // Execute bulk update
    const result = await Subcategory.bulkWrite(bulkOps, { ordered: false });

    // Fetch updated subcategories
    const updatedIds = items.map(
      (item) => new mongoose.Types.ObjectId(item._id)
    );
    const updated = await Subcategory.find({ _id: { $in: updatedIds } }).lean();

    // Ensure selectImage and isPremium fields exist with default values
    const updatedWithDefaults = updated.map((subcategory) => ({
      ...subcategory,
      selectImage:
        subcategory.selectImage !== undefined &&
        subcategory.selectImage !== null
          ? subcategory.selectImage
          : 1,
      isPremium:
        subcategory.isPremium !== undefined ? subcategory.isPremium : false,
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Subcategories toggled successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        subcategories: updatedWithDefaults,
      },
    });
  } catch (error) {
    console.error("Bulk Toggle Subcategory Sections Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle subcategory sections",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Bulk reorder categories in multiple sections (Admin)
 * Reorder multiple sections (1, 2, 6, 7) in one API call
 * @route PATCH /api/v1/home/categories/reorder
 * @access Private (Admin)
 */
const bulkReorderCategorySections = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { sections } = req.body;
    const sectionsData = Array.isArray(sections) ? sections : [];

    if (!sectionsData || sectionsData.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one section must be provided for reordering",
        data: null,
      });
    }

    // Section field mapping
    const sectionMap = {
      1: { orderField: "section1Order" },
      2: { orderField: "section2Order" },
      6: { orderField: "section6Order" },
      7: { orderField: "section7Order" },
    };

    // Validate section numbers
    const validSections = sectionsData.filter((section) =>
      [1, 2, 6, 7].includes(Number(section.section))
    );

    if (validSections.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid section numbers. Valid sections: 1, 2, 6, 7",
        data: null,
      });
    }

    // Process each section
    const allBulkOps = [];
    const results = {};

    for (const sectionData of validSections) {
      const section = String(sectionData.section);
      const categories = Array.isArray(sectionData.categories)
        ? sectionData.categories
        : [];

      if (categories.length === 0) continue;

      const sectionConfig = sectionMap[section];
      if (!sectionConfig) continue;

      // Validate all IDs
      const invalidIds = categories.filter(
        (it) => !mongoose.Types.ObjectId.isValid(it._id)
      );
      if (invalidIds.length > 0) continue;

      // Get all categories for this section
      const allCategories = await categoryService
        .find({ isDeleted: false })
        .select({ _id: 1, [sectionConfig.orderField]: 1 })
        .sort({ [sectionConfig.orderField]: 1, createdAt: 1 })
        .lean();

      // Create map of new orders
      const newOrderMap = new Map();
      categories.forEach((item) => {
        newOrderMap.set(
          item._id.toString(),
          Number(item[sectionConfig.orderField])
        );
      });

      const isFullReorder = allCategories.length === categories.length;

      if (isFullReorder) {
        const sortedItems = [...categories].sort(
          (a, b) =>
            Number(a[sectionConfig.orderField]) -
            Number(b[sectionConfig.orderField])
        );

        const finalOrders = new Map();
        sortedItems.forEach((item, index) => {
          finalOrders.set(item._id.toString(), index + 1);
        });

        const bulkOps = Array.from(finalOrders.entries()).map(
          ([id, order]) => ({
            updateOne: {
              filter: {
                _id: new mongoose.Types.ObjectId(id),
                isDeleted: false,
              },
              update: {
                $set: {
                  [sectionConfig.orderField]: order,
                  updatedAt: new Date(),
                },
              },
            },
          })
        );

        allBulkOps.push(...bulkOps);
        results[`section${section}`] = {
          type: "full",
          count: bulkOps.length,
        };
      } else {
        // Partial reorder - Handle order conflicts by shifting existing categories
        // Get all categories in this section
        const allCategoriesInSection = await categoryService
          .find({ isDeleted: false })
          .select({ _id: 1, [sectionConfig.orderField]: 1 })
          .sort({ [sectionConfig.orderField]: 1, createdAt: 1 })
          .lean();

        // Create map of categories being updated with their new orders
        const updatedCategoryMap = new Map();
        categories.forEach((item) => {
          updatedCategoryMap.set(item._id.toString(), {
            _id: item._id.toString(),
            newOrder: Number(item[sectionConfig.orderField]),
          });
        });

        // Build a list of all categories with their target orders
        const allCategoriesWithOrders = allCategoriesInSection.map((cat) => {
          const catId = cat._id.toString();
          if (updatedCategoryMap.has(catId)) {
            // Use the new order from the request
            return {
              _id: catId,
              order: updatedCategoryMap.get(catId).newOrder,
            };
          } else {
            // Keep the existing order
            return {
              _id: catId,
              order: cat[sectionConfig.orderField] || 0,
            };
          }
        });

        // Sort by order, then by _id for consistency
        allCategoriesWithOrders.sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return a._id.localeCompare(b._id);
        });

        // Normalize orders to be sequential starting from 1
        const finalOrders = new Map();
        allCategoriesWithOrders.forEach((cat, index) => {
          finalOrders.set(cat._id, index + 1);
        });

        // Create bulk operations for all categories that need updating
        const bulkOps = Array.from(finalOrders.entries()).map(
          ([id, order]) => ({
            updateOne: {
              filter: {
                _id: new mongoose.Types.ObjectId(id),
                isDeleted: false,
              },
              update: {
                $set: {
                  [sectionConfig.orderField]: order,
                  updatedAt: new Date(),
                },
              },
            },
          })
        );

        allBulkOps.push(...bulkOps);
        results[`section${section}`] = {
          type: "partial",
          count: bulkOps.length,
        };
      }
    }

    if (allBulkOps.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "No valid reorder operations to perform",
        data: null,
      });
    }

    // Execute all bulk operations
    const bulkResult = await categoryService.bulkWrite(allBulkOps, {
      ordered: false,
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories reordered successfully",
      data: {
        modifiedCount: bulkResult.modifiedCount,
        matchedCount: bulkResult.matchedCount,
        sections: results,
      },
    });
  } catch (error) {
    console.error("Bulk Reorder Category Sections Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder category sections",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Bulk reorder subcategories in multiple sections (Admin)
 * Reorder multiple sections (3, 4, 5) in one API call
 * @route PATCH /api/v1/home/subcategories/reorder
 * @access Private (Admin)
 */
const bulkReorderSubcategorySections = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { sections } = req.body;
    const sectionsData = Array.isArray(sections) ? sections : [];

    if (!sectionsData || sectionsData.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one section must be provided for reordering",
        data: null,
      });
    }

    // Section field mapping
    const sectionMap = {
      3: { orderField: "section3Order" },
      4: { orderField: "section4Order" },
      5: { orderField: "section5Order" },
    };

    // Validate section numbers
    const validSections = sectionsData.filter((section) =>
      [3, 4, 5].includes(Number(section.section))
    );

    if (validSections.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid section numbers. Valid sections: 3, 4, 5",
        data: null,
      });
    }

    // Process each section
    const allBulkOps = [];
    const results = {};

    for (const sectionData of validSections) {
      const section = String(sectionData.section);
      const subcategories = Array.isArray(sectionData.subcategories)
        ? sectionData.subcategories
        : [];

      if (subcategories.length === 0) continue;

      const sectionConfig = sectionMap[section];
      if (!sectionConfig) continue;

      // Validate all IDs
      const invalidIds = subcategories.filter(
        (it) => !mongoose.Types.ObjectId.isValid(it._id)
      );
      if (invalidIds.length > 0) continue;

      // Get all subcategories for this section
      const allSubcategories = await Subcategory.find({})
        .select({ _id: 1, [sectionConfig.orderField]: 1 })
        .sort({ [sectionConfig.orderField]: 1, createdAt: 1 })
        .lean();

      // Create map of new orders
      const newOrderMap = new Map();
      subcategories.forEach((item) => {
        newOrderMap.set(
          item._id.toString(),
          Number(item[sectionConfig.orderField])
        );
      });

      const isFullReorder = allSubcategories.length === subcategories.length;

      if (isFullReorder) {
        const sortedItems = [...subcategories].sort(
          (a, b) =>
            Number(a[sectionConfig.orderField]) -
            Number(b[sectionConfig.orderField])
        );

        const finalOrders = new Map();
        sortedItems.forEach((item, index) => {
          finalOrders.set(item._id.toString(), index + 1);
        });

        const bulkOps = Array.from(finalOrders.entries()).map(
          ([id, order]) => ({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(id) },
              update: {
                $set: {
                  [sectionConfig.orderField]: order,
                  updatedAt: new Date(),
                },
              },
            },
          })
        );

        allBulkOps.push(...bulkOps);
        results[`section${section}`] = {
          type: "full",
          count: bulkOps.length,
        };
      } else {
        // Partial reorder - Handle order conflicts by shifting existing subcategories
        // Get all subcategories in this section
        const allSubcategoriesInSection = await Subcategory.find({})
          .select({ _id: 1, [sectionConfig.orderField]: 1 })
          .sort({ [sectionConfig.orderField]: 1, createdAt: 1 })
          .lean();

        // Create map of subcategories being updated with their new orders
        const updatedSubcategoryMap = new Map();
        subcategories.forEach((item) => {
          updatedSubcategoryMap.set(item._id.toString(), {
            _id: item._id.toString(),
            newOrder: Number(item[sectionConfig.orderField]),
          });
        });

        // Build a list of all subcategories with their target orders
        const allSubcategoriesWithOrders = allSubcategoriesInSection.map(
          (sub) => {
            const subId = sub._id.toString();
            if (updatedSubcategoryMap.has(subId)) {
              // Use the new order from the request
              return {
                _id: subId,
                order: updatedSubcategoryMap.get(subId).newOrder,
              };
            } else {
              // Keep the existing order
              return {
                _id: subId,
                order: sub[sectionConfig.orderField] || 0,
              };
            }
          }
        );

        // Sort by order, then by _id for consistency
        allSubcategoriesWithOrders.sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return a._id.localeCompare(b._id);
        });

        // Normalize orders to be sequential starting from 1
        const finalOrders = new Map();
        allSubcategoriesWithOrders.forEach((sub, index) => {
          finalOrders.set(sub._id, index + 1);
        });

        // Create bulk operations for all subcategories that need updating
        const bulkOps = Array.from(finalOrders.entries()).map(
          ([id, order]) => ({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(id) },
              update: {
                $set: {
                  [sectionConfig.orderField]: order,
                  updatedAt: new Date(),
                },
              },
            },
          })
        );

        allBulkOps.push(...bulkOps);
        results[`section${section}`] = {
          type: "partial",
          count: bulkOps.length,
        };
      }
    }

    if (allBulkOps.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "No valid reorder operations to perform",
        data: null,
      });
    }

    // Execute all bulk operations
    const bulkResult = await Subcategory.bulkWrite(allBulkOps, {
      ordered: false,
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Subcategories reordered successfully",
      data: {
        modifiedCount: bulkResult.modifiedCount,
        matchedCount: bulkResult.matchedCount,
        sections: results,
      },
    });
  } catch (error) {
    console.error("Bulk Reorder Subcategory Sections Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder subcategory sections",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get home settings (Admin)
 * Returns current section titles for Section 6 and Section 7
 * @route GET /api/v1/home/settings
 * @access Private (Admin)
 */
const getHomeSettings = async (req, res) => {
  try {
    const homeSettings = await HomeSettings.getSettings();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Home settings fetched successfully",
      data: homeSettings,
    });
  } catch (error) {
    console.error("Get Home Settings Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch home settings",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Update home settings (Admin)
 * Updates section titles for Section 6 and Section 7
 * @route PATCH /api/v1/home/settings
 * @access Private (Admin)
 */
const updateHomeSettings = async (req, res) => {
  try {
    const { section6Title, section7Title } = req.body;

    // Validate that at least one field is provided
    if (section6Title === undefined && section7Title === undefined) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message:
          "At least one field (section6Title or section7Title) must be provided",
        data: null,
      });
    }

    // Build update object with only provided fields
    const updateFields = {};
    if (section6Title !== undefined) {
      updateFields.section6Title = String(section6Title).trim();
    }
    if (section7Title !== undefined) {
      updateFields.section7Title = String(section7Title).trim();
    }

    // Use findOneAndUpdate with upsert to ensure only one document exists
    const updatedSettings = await HomeSettings.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Title updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Update Home Settings Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to update title",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getHomeData,
  getAllSectionsData,
  getAllCategoriesForSection1,
  getAllCategoriesForSection2,
  getAllCategoriesForSection6,
  getAllCategoriesForSection7,
  getAllSubcategoriesForSection3,
  getAllSubcategoriesForSection4,
  getAllSubcategoriesForSection5,
  toggleCategorySection,
  toggleSubcategorySection,
  bulkToggleCategorySections,
  bulkToggleSubcategorySections,
  reorderCategorySection,
  reorderSubcategorySection,
  bulkReorderCategorySections,
  bulkReorderSubcategorySections,
  getHomeSettings,
  updateHomeSettings,
};
