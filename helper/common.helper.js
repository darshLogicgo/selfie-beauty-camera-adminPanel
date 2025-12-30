import config from "../config/config.js";
import jwt from "jsonwebtoken";
import moment from "moment";
import UserModel from "../models/user.model.js";
import firebaseAdmin from "../firebase/config.firebase.js";
import crypto from "crypto";

// ----------- Pagination -----------
const paginationDetails = ({ page = 1, totalItems, limit }) => {
  const totalPages = Math.ceil(totalItems / limit);
  return { page: Number(page), totalPages, totalItems, limit };
};

const paginationFun = (data) => {
  const { page = 1, limit = 10 } = data;
  return {
    limit: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
  };
};

// ------------- Token -------------
const generateToken = async (payload) => {
  // Token with unlimited expiry - no expiresIn option
  return jwt.sign(payload, config.jwt.secretKey);
};

const verifyToken = async (token) => {
  return jwt.verify(token, config.jwt.secretKey);
};

// ------------- Generate OTP -------------
const generateOTP = () => {
  // Generate a random number between 1000 and 9999
  const otp = Math.floor(100000 + Math.random() * 9000);
  const otpExpiryDurationSeconds = 180;
  const otpExpiresAt = moment()
    .add(otpExpiryDurationSeconds, "seconds")
    .toDate();
  return { otp, otpExpiresAt };
};

const generateOTPArray = (length, count) => {
  const otpArray = [];

  for (let i = 0; i < count; i++) {
    const otp = Math.floor(Math.random() * Math.pow(10, length));
    otpArray.push(otp);
  }

  return otpArray;
};

// ------------- Formatting -------------
const formatDateToString = (date) => {
  return `${date.getFullYear()}${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}${date
    .getHours()
    .toString()
    .padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
};

const convertUtcToLocal = (utcTimestamp) => {
  const utcTime = moment.utc(utcTimestamp);
  if (!utcTime.isValid()) {
    throw new Error("Invalid UTC timestamp format.");
  }
  const localTime = utcTime.local();
  return localTime.format("DD-MM-YYYY HH:mm:ss");
};

const validateEntitiesExistence = async (entities) => {
  const results = await Promise.all(
    entities.map(async ({ model, id, name }) => {
      const entity = await model.findById(id);
      return entity ? null : `${name} with ID ${id} not found`;
    })
  );
  return results.filter((result) => result !== null);
};

const toBoolean = (value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return value;
};

const extractFileKey = (url) => {
  try {
    // Parse URL to get the pathname, which handles double slashes correctly
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.replace(/^\/+/, "");
  } catch (error) {
    // Fallback to old method if URL parsing fails
    const parts = url.split("/").filter((part) => part !== ""); // Remove empty parts from double slashes
    // Find the domain part and get everything after it
    const domainIndex = parts.findIndex((part) => part.includes("."));
    if (domainIndex !== -1 && domainIndex < parts.length - 1) {
      return parts.slice(domainIndex + 1).join("/");
    }
    // If domain not found, use old method
    return parts.slice(3).join("/");
  }
};

const ensureUserId = async (userId, email) => {
  if (userId) return userId;
  try {
    const user = await UserModel.findOne({ email });
    return user ? user._id.toString() : "Not Found";
  } catch (err) {
    console.error("Error fetching user by email:", err.message);
    return "ErrorFetching";
  }
};

// Generate short ID for guest users
const createId = ({ length = 16 } = {}) => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ------------- Hash Token (for deferred links) -------------
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Helper function to compare app versions
// Returns true if userVersion >= subcategoryVersion
const compareAppVersionsSubCategory = (userVersion, subcategoryVersion) => {
  if (!userVersion || !subcategoryVersion) {
    return true; // If either version is missing, allow display
  }
  
  // Split version strings into parts (e.g., "1.2.3" -> [1, 2, 3])
  const userParts = userVersion.split('.').map(part => parseInt(part) || 0);
  const subcatParts = subcategoryVersion.split('.').map(part => parseInt(part) || 0);
  
  // Compare each part from left to right
  for (let i = 0; i < Math.max(userParts.length, subcatParts.length); i++) {
    const userPart = userParts[i] || 0;
    const subcatPart = subcatParts[i] || 0;
    
    if (userPart > subcatPart) {
      return true; // User version is greater
    } else if (userPart < subcatPart) {
      return false; // User version is lower
    }
    // If equal, continue to next part
  }
  
  return true; // Versions are equal
};

// Helper function to filter subcategories by app version
const filterSubcategoriesByVersion = (subcategories, userAppVersion, userProvider) => {
  console.log('FILTER DEBUG - Input:', {
    subcategoriesCount: subcategories.length,
    userAppVersion,
    userProvider
  });

  if (!userAppVersion || !userProvider) {
    // If user has no app version or provider, only show subcategories without version requirements
    const filtered = subcategories.filter(subcategory => {
      const androidVersion = subcategory.android_appVersion;
      const iosVersion = subcategory.ios_appVersion;
      return !androidVersion && !iosVersion; // Only show if subcategory has no version requirements for any platform
    });
    console.log('FILTER DEBUG - No user version/provider, filtered count:', filtered.length);
    return filtered;
  }
  
  const filtered = subcategories.filter(subcategory => {
    let subcategoryVersion = null;
    
    // Get the appropriate version based on user provider
    if (userProvider === "android") {
      subcategoryVersion = subcategory.android_appVersion;
    } else if (userProvider === "ios") {
      subcategoryVersion = subcategory.ios_appVersion;
    }
    
    console.log('FILTER DEBUG - Subcategory:', {
      id: subcategory._id,
      title: subcategory.subcategoryTitle,
      userProvider,
      subcategoryVersion,
      androidVersion: subcategory.android_appVersion,
      iosVersion: subcategory.ios_appVersion
    });
    
    // If subcategory has no version requirement for this platform, show it
    if (!subcategoryVersion) {
      console.log('FILTER DEBUG - No version requirement, showing subcategory');
      return true;
    }
    
    // Only show if user app version matches or is greater than subcategory version
    const isCompatible = compareAppVersionsSubCategory(userAppVersion, subcategoryVersion);
    console.log('FILTER DEBUG - Version comparison:', {
      userAppVersion,
      subcategoryVersion,
      isCompatible
    });
    
    return isCompatible;
  });

  console.log('FILTER DEBUG - Final filtered count:', filtered.length);
  return filtered;
}
// ------------- Version Comparison -------------
/**
 * Compare two version strings (e.g., "1.2.30", "2.0.0")
 * Returns true if userVersion >= categoryVersion
 * @param {string} userVersion - User's app version (e.g., "1.2.30")
 * @param {string} categoryVersion - Category's required app version (e.g., "1.2.30")
 * @returns {boolean} - True if userVersion >= categoryVersion
 */
const compareAppVersions = (userVersion, categoryVersion) => {
  try {
    // Normalize versions: remove leading/trailing whitespace
    const userVer = String(userVersion).trim();
    const catVer = String(categoryVersion).trim();

    // Parse versions: split by dots and convert to numbers
    const userParts = userVer.split(".").map((part) => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });

    const catParts = catVer.split(".").map((part) => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });

    // Normalize to same length by padding with zeros
    const maxLength = Math.max(userParts.length, catParts.length);
    while (userParts.length < maxLength) userParts.push(0);
    while (catParts.length < maxLength) catParts.push(0);

    // Compare each part
    for (let i = 0; i < maxLength; i++) {
      if (userParts[i] > catParts[i]) {
        return true; // User version is greater
      }
      if (userParts[i] < catParts[i]) {
        return false; // User version is less
      }
    }

    // Versions are equal
    return true;
  } catch (error) {
    console.error("Error comparing app versions:", error);
    // On error, don't show (fail closed)
    return false;
  }
};

/**
 * Filter categories based on user's appVersion and platform (provider)
 * Logic:
 * - If user doesn't have appVersion (null or missing) → Show only categories that don't have platform-specific appVersion
 * - If user has appVersion:
 *   - If category doesn't have platform-specific appVersion → Show (no restriction)
 *   - If category has platform-specific appVersion → Show only if userVersion >= categoryVersion
 * @param {Object} user - User object (may have appVersion and provider fields)
 * @param {Array} categories - Array of category objects (may have android_appVersion and ios_appVersion fields)
 * @returns {Array} - Filtered categories array
 */
const filterCategoriesByAppVersion = (user, categories) => {
  try {
    // Check if user has appVersion
    const userHasAppVersion = user && user.appVersion && String(user.appVersion).trim() !== "" && user.appVersion !== null;
    
    // Get user's platform (provider)
    const userProvider = user && user.provider ? String(user.provider).trim().toLowerCase() : null;
    
    // Determine which platform version field to check based on user's provider
    const platformVersionField = userProvider === "android" ? "android_appVersion" : userProvider === "ios" ? "ios_appVersion" : null;

    if (!userHasAppVersion) {
      // If user doesn't have appVersion, show only categories that don't have platform-specific appVersion
      return categories.filter((category) => {
        if (!platformVersionField) {
          // If platform is unknown, show categories without any appVersion
          return (!category.android_appVersion || String(category.android_appVersion).trim() === "" || category.android_appVersion === null) &&
                 (!category.ios_appVersion || String(category.ios_appVersion).trim() === "" || category.ios_appVersion === null);
        }
        
        // Check platform-specific version field
        const categoryPlatformVersion = category[platformVersionField];
        return !categoryPlatformVersion || String(categoryPlatformVersion).trim() === "" || categoryPlatformVersion === null;
      });
    }

    // User has appVersion
    const userAppVersion = String(user.appVersion).trim();

    // If platform is unknown, don't filter (show all)
    if (!platformVersionField) {
      return categories;
    }

    // Filter categories based on platform-specific version
    return categories.filter((category) => {
      const categoryPlatformVersion = category[platformVersionField];
      
      // If category doesn't have platform-specific appVersion, show it (no restriction)
      if (!categoryPlatformVersion || String(categoryPlatformVersion).trim() === "" || categoryPlatformVersion === null) {
        return true;
      }

      // If category has platform-specific appVersion, compare with user's version
      const categoryAppVersion = String(categoryPlatformVersion).trim();
      // Show only if userVersion >= categoryVersion
      return compareAppVersions(userAppVersion, categoryAppVersion);
    });
  } catch (error) {
    console.error("Error filtering categories by appVersion:", error);
    // On error, return empty array (fail closed)
    return [];
  }
};

// ------------- Send FCM Notification -------------
const sendFCMNotification = async ({
  fcmToken,
  title,
  description,
  image,
  screenName,
  imageUrl,
  generatedImageTitle,
}) => {
  try {
    // Validate inputs
    if (!fcmToken) {
      return {
        success: false,
        error: "FCM token is required",
      };
    }

    if (!title || !description) {
      return {
        success: false,
        error: "Title and description are required",
      };
    }

    // Prepare the message
    const message = {
      notification: {
        title: title,
        body: description,
        ...(image && { image: image }), // Add image if provided (for notification icon)
      },
      token: fcmToken,
    };

    // Add data payload for deep linking/navigation
    // FCM requires all data values to be strings
    if (screenName || imageUrl || generatedImageTitle) {
      message.data = {};
      if (screenName) {
        message.data.screenName = String(screenName);
      }
      if (imageUrl) {
        message.data.imageUrl = String(imageUrl);
      }
      if (generatedImageTitle) {
        message.data.generatedImageTitle = String(generatedImageTitle);
      }
    }
    console.log("message", message);

    // Send the notification
    const response = await firebaseAdmin.messaging().send(message);
    console.log("response", response);

    return {
      success: true,
      messageId: response,
      message: "Notification sent successfully",
    };
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return {
      success: false,
      error: error.message || "Failed to send notification",
    };
  }
};

export default {
  generateOTP,
  verifyToken,
  generateToken,
  paginationDetails,
  paginationFun,
  extractFileKey,
  formatDateToString,
  convertUtcToLocal,
  validateEntitiesExistence,
  toBoolean,
  generateOTPArray,
  ensureUserId,
  createId,
  sendFCMNotification,
  hashToken,
  compareAppVersions,
  filterSubcategoriesByVersion,
  filterCategoriesByAppVersion,
  compareAppVersionsSubCategory
};
