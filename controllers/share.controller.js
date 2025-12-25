import helper from "../helper/common.helper.js";
import config from "../config/config.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import DeferredLink from "../models/deferredLink.model.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../config/logger.config.js";


// Helper function to normalize IP address (extract IPv4 from IPv4-mapped IPv6 format)
const normalizeIpAddress = (ip) => {
  if (!ip || ip === "Unknown") {
    return ip;
  }
  
  // If IP starts with ::ffff:, extract the IPv4 part
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7); // Remove "::ffff:" prefix (7 characters)
  }
  
  // Return as is if it's already in normal format
  return ip;
};

// Helper function to check if IP is localhost
const isLocalhostIp = (ip) => {
  if (!ip) return true;
  const normalized = normalizeIpAddress(ip);
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "localhost";
};

// Helper function to extract real client IP address from request
// Handles proxy/load balancer scenarios by checking X-Forwarded-For, X-Real-IP headers
const getClientIp = (req) => {
  // Helper to get header value (case-insensitive)
  const getHeader = (name) => {
    const lowerName = name.toLowerCase();
    return req.headers[lowerName] || req.headers[name];
  };

  // Check X-Forwarded-For header (most common, contains original client IP)
  // Format: "client-ip, proxy1-ip, proxy2-ip"
  const forwardedFor = getHeader("x-forwarded-for");
  if (forwardedFor) {
    // Get the first IP (original client IP) from the comma-separated list
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    for (const ip of ips) {
      if (ip && !isLocalhostIp(ip)) {
        return normalizeIpAddress(ip);
      }
    }
  }

  // Check X-Real-IP header (alternative header used by some proxies)
  const realIp = getHeader("x-real-ip");
  if (realIp) {
    const trimmedRealIp = realIp.trim();
    if (trimmedRealIp && !isLocalhostIp(trimmedRealIp)) {
      return normalizeIpAddress(trimmedRealIp);
    }
  }

  // Check CF-Connecting-IP header (Cloudflare)
  const cfIp = getHeader("cf-connecting-ip");
  if (cfIp) {
    const trimmedCfIp = cfIp.trim();
    if (trimmedCfIp && !isLocalhostIp(trimmedCfIp)) {
      return normalizeIpAddress(trimmedCfIp);
    }
  }

  // Check X-Client-IP header (some proxies use this)
  const clientIp = getHeader("x-client-ip");
  if (clientIp) {
    const trimmedClientIp = clientIp.trim();
    if (trimmedClientIp && !isLocalhostIp(trimmedClientIp)) {
      return normalizeIpAddress(trimmedClientIp);
    }
  }

  // Fallback to req.ip (works if trust proxy is enabled)
  if (req.ip && !isLocalhostIp(req.ip)) {
    return normalizeIpAddress(req.ip);
  }

  // Last fallback to connection remote address
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (remoteAddress && !isLocalhostIp(remoteAddress)) {
    return normalizeIpAddress(remoteAddress);
  }

  // Additional fallback: Check all headers for any IP-like value
  // This is a last resort to find IP in unexpected header names
  for (const [headerName, headerValue] of Object.entries(req.headers)) {
    if (headerValue && typeof headerValue === 'string') {
      // Check if header value looks like an IP address
      const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
      const match = headerValue.match(ipPattern);
      if (match) {
        const foundIp = match[0];
        if (!isLocalhostIp(foundIp)) {
          return normalizeIpAddress(foundIp);
        }
      }
    }
  }

  // If all else fails, return Unknown
  return "Unknown";
};

// Generate Deep Link with JWT Token
const generateShareLink = async (req, res) => {
  try {
    const { categoryId, imageId } = req.body;
    const userId = req.user._id;

    // Validate categoryId exists and is valid MongoDB ObjectId
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Category ID is required and must be a valid ObjectId",
        data: null,
      });
    }

    // Fetch category from database
    const category = await Category.findOne({
      _id: new mongoose.Types.ObjectId(categoryId),
      isDeleted: false,
    });

    if (!category) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    // Use category name as feature title
    const featureTitle = category.name || "AI Feature";

    // Create JWT payload with all required info
    const payload = {
      userId: userId.toString(),
      categoryId: categoryId.toString(),
      featureTitle: featureTitle,
      imageId: imageId || null,
      timestamp: Date.now(),
    };

    // Generate JWT token (valid for 30 days)
    const token = await helper.generateToken(payload, "30d");

    // Generate deep links (Android only)
    const baseUrl = config.base_url || config.server_url;
    
    // Android Intent URLhttps://play.google.com/store/apps/details?id=beauty.selfie.camera&hl=en_IN
    const androidPackage = "photo.editor.photoeditor.filtermaster"; // Replace with your actual package name
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${androidPackage}`;
    const encodedPlayStoreUrl = encodeURIComponent(playStoreUrl);
    
    // Deep link with JWT token (using categoryId in URL)
    const androidDeepLink = `${baseUrl}/share/${categoryId}?token=${token}`;
    const androidIntentLink = `intent://share/${categoryId}?token=${token}#Intent;scheme=photoeditor;package=${androidPackage};S.browser_fallback_url=${encodedPlayStoreUrl};end`;
    const customSchemeLink = `photoeditor://share/${categoryId}?token=${token}`;

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Deep link generated successfully",
      data: {
        token,
        categoryId: categoryId.toString(),
        featureTitle: featureTitle,
        // links: {
        //   web: androidDeepLink,
        //   android: androidIntentLink,
        //   customScheme: customSchemeLink,
        // },
        link: androidDeepLink
      },
    });
  } catch (error) {
    console.error("Error generating share link:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to generate share link",
      data: null,
    });
  }
};

// Handle Deep Link Route (serves HTML page and decodes JWT)
const handleShareDeepLink = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { categoryId } = req.params;
    const { token, appInstalled } = req.query;
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ip = req.ip || req.connection.remoteAddress || "Unknown";

    logger.info(`[${requestId}] handleShareDeepLink called - categoryId: ${categoryId}, IP: ${ip}, User-Agent: ${userAgent}, appInstalled: ${appInstalled || "not provided"}`);

    if (!token) {
      logger.warn(`[${requestId}] handleShareDeepLink failed - Token is missing`);
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Invalid share link. Token is missing.");
    }

    // Validate categoryId is valid MongoDB ObjectId
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      logger.warn(`[${requestId}] handleShareDeepLink failed - Invalid categoryId: ${categoryId}`);
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Invalid category ID in share link.");
    }

    // Decode JWT token to get all info
    let decodedData;
    try {
      logger.info(`[${requestId}] Verifying JWT token`);
      decodedData = await helper.verifyToken(token);
      logger.info(`[${requestId}] Token verified successfully`);
    } catch (error) {
      logger.error(`[${requestId}] JWT verification failed - ${error.message}`, { error: error.stack });
      console.error("JWT verification failed:", error);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .send("Share link has expired or is invalid.");
    }

    // Extract data from decoded token
    const {
      userId,
      categoryId: tokenCategoryId,
      featureTitle,
      imageId,
    } = decodedData;

    logger.info(`[${requestId}] Decoded token data - userId: ${userId}, tokenCategoryId: ${tokenCategoryId}, featureTitle: ${featureTitle}`);

    // Verify categoryId matches
    if (tokenCategoryId !== categoryId) {
      logger.warn(`[${requestId}] Category ID mismatch - tokenCategoryId: ${tokenCategoryId}, categoryId: ${categoryId}`);
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Category ID mismatch in share link.");
    }

    // Detect Android platform
    const isAndroid = /android/i.test(userAgent);
    logger.info(`[${requestId}] Platform detection - isAndroid: ${isAndroid}`);

    const baseUrl = config.base_url || config.server_url;
    const androidPackage = "photo.editor.photoeditor.filtermaster";

    // Always serve HTML page first - let JavaScript try to open app
    // If app doesn't open, JavaScript will create deferred link and redirect
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${androidPackage}`;
    const encodedPlayStoreUrl = encodeURIComponent(playStoreUrl);
    const androidIntentLink = `intent://share/${categoryId}?token=${token}#Intent;scheme=photoeditor;package=${androidPackage};S.browser_fallback_url=${encodedPlayStoreUrl};end`;
    const customSchemeLink = `photoeditor://share/${categoryId}?token=${token}`;
    const androidStoreLink = `https://play.google.com/store/apps/details?id=${androidPackage}`;
    const createDeferredUrl = `${baseUrl}/share/create-deferred/${categoryId}?token=${token}`;

    logger.info(`[${requestId}] Generated URLs`, {
      createDeferredUrl,
      androidStoreLink,
      baseUrl
    });

    // Generate HTML fallback page (Android only)
    const html = generateFallbackHTML({
      title: featureTitle,
      message: `Check out this amazing ${featureTitle} feature!`,
      featureTitle: featureTitle,
      deepLink: androidIntentLink,
      customSchemeLink: customSchemeLink,
      androidStoreLink: androidStoreLink,
      webLink: `${baseUrl}/share/${categoryId}?token=${token}`,
      createDeferredUrl: createDeferredUrl,
    });

    logger.info(`[${requestId}] HTML page generated and serving to client`);

    // Prevent caching
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.send(html);
  } catch (error) {
    logger.error(`[${requestId}] Error handling share deep link - ${error.message}`, {
      error: error.stack,
      categoryId: req.params.categoryId,
      hasToken: !!req.query.token,
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "Unknown",
    });
    console.error("Error handling share deep link:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("An error occurred while processing the share link.");
  }
};

// Resolve Install Reference (called by Android app after install)
const resolveInstallRef = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { installRef } = req.query;
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ip = req.ip || req.connection.remoteAddress || "Unknown";

    logger.info(`[${requestId}] resolveInstallRef called - installRef: ${installRef || "MISSING"}, IP: ${ip}, User-Agent: ${userAgent}`);

    let deferredLink = null;

    // If installRef is provided, try to find by installRef or shortCode
    if (installRef && installRef.trim().length > 0) {
      logger.info(`[${requestId}] Searching for deferred link with installRef: ${installRef}`);

      // Try to find by installRef first
      deferredLink = await DeferredLink.findOne({
        installRef,
        consumed: false,
        expiresAt: { $gt: new Date() },
      });

      // If not found by installRef, try by shortCode (in case Play Store modified the referrer)
      if (!deferredLink && installRef.length <= 10) {
        logger.info(`[${requestId}] Not found by installRef, trying shortCode lookup - installRef: ${installRef}`);
        deferredLink = await DeferredLink.findOne({
          shortCode: installRef,
          consumed: false,
          expiresAt: { $gt: new Date() },
        });
      }

      // If still not found, check if it was already consumed
      if (!deferredLink) {
        const consumedLink = await DeferredLink.findOne({ 
          $or: [
            { installRef },
            { shortCode: installRef }
          ]
        });
        if (consumedLink && consumedLink.consumed) {
          logger.warn(`[${requestId}] Deferred link already consumed - installRef: ${installRef}, consumedAt: ${consumedLink.consumedAt}`);
        }
      }
    }

    // FALLBACK: If installRef is missing or not found, try time-based matching
    // This handles cases where Play Store doesn't preserve the referrer
    // Match the most recent unconsumed deferred link created in the last 10 minutes
    if (!deferredLink) {
      logger.info(`[${requestId}] InstallRef missing or not found, attempting time-based fallback matching`);
      
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      // Find the most recent unconsumed deferred link created in the last 10 minutes
      deferredLink = await DeferredLink.findOne({
        consumed: false,
        expiresAt: { $gt: new Date() },
        createdAt: { $gte: tenMinutesAgo },
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (deferredLink) {
        logger.info(`[${requestId}] Found deferred link using time-based fallback - installRef: ${deferredLink.installRef}, createdAt: ${deferredLink.createdAt}, timeDiff: ${Math.round((Date.now() - deferredLink.createdAt.getTime()) / 1000)}s`);
        
        // Additional validation: Only use if created within last 5 minutes for better accuracy
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (deferredLink.createdAt < fiveMinutesAgo) {
          logger.warn(`[${requestId}] Time-based match is older than 5 minutes, rejecting for safety - createdAt: ${deferredLink.createdAt}`);
          deferredLink = null;
        }
      } else {
        logger.warn(`[${requestId}] No deferred links found in time-based fallback (last 10 minutes)`);
      }
    }

    if (!deferredLink) {
      logger.warn(`[${requestId}] Deferred link not found - installRef: ${installRef || "MISSING"}`);
      
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Deferred link not found or expired",
        data: null,
      });
    }

    logger.info(`[${requestId}] Deferred link found - categoryId: ${deferredLink.categoryId}, featureTitle: ${deferredLink.featureTitle}`);

    // Mark as consumed
    deferredLink.consumed = true;
    deferredLink.consumedAt = new Date();
    await deferredLink.save();

    logger.info(`[${requestId}] Deferred link marked as consumed`);

    // Generate a new short-lived token for the app (optional - for security)
    // You can reissue a token or just return the categoryId
    const payload = {
      userId: deferredLink.userId.toString(),
      categoryId: deferredLink.categoryId.toString(),
      featureTitle: deferredLink.featureTitle,
      imageId: deferredLink.imageId || null,
      timestamp: Date.now(),
    };

    logger.info(`[${requestId}] Generating new JWT token for deferred link`);

    // Generate new token (valid for 24 hours)
    const newToken = await helper.generateToken(payload, "24h");

    const responseData = {
      categoryId: deferredLink.categoryId.toString(),
      featureTitle: deferredLink.featureTitle,
      imageId: deferredLink.imageId || null,
      token: newToken,
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Deferred link resolved successfully - categoryId: ${responseData.categoryId}, featureTitle: ${responseData.featureTitle}, duration: ${duration}ms`);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Deferred link resolved successfully",
      data: responseData,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Error resolving install reference - ${error.message}`, {
      error: error.stack,
      installRef: req.query.installRef,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "Unknown",
    });
    console.error("Error resolving install reference:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to resolve install reference",
      data: null,
    });
  }
};

// Resolve Deferred Link by IP Address (called by Android app)
const resolveByIp = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { ipAddress } = req.query;
    const userAgent = req.headers["user-agent"] || "Unknown";
    const clientIp = req.ip || req.connection.remoteAddress || "Unknown";

    logger.info(`[${requestId}] resolveByIp called - ipAddress: ${ipAddress || "MISSING"}, Client IP: ${clientIp}, User-Agent: ${userAgent}`);

    if (!ipAddress || ipAddress.trim().length === 0) {
      logger.warn(`[${requestId}] resolveByIp failed - IP address is missing`);
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "IP address is required",
        data: null,
      });
    }

    logger.info(`[${requestId}] Searching for deferred link with IP: ${ipAddress}`);

    const trimmedIp = ipAddress.trim();
    // Create IP variations to match both formats: plain IPv4 and IPv4-mapped IPv6 (::ffff:)
    const ipVariations = [
      trimmedIp,                    // Exact match: 192.168.0.20
      `::ffff:${trimmedIp}`,        // IPv4-mapped format: ::ffff:192.168.0.20
    ];

    // Find the most recent unconsumed deferred link matching the IP address (checking both formats)
    const deferredLink = await DeferredLink.findOne({
      "deviceInfo.ip": { $in: ipVariations },
      consumed: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 }) // Get the latest one (most recent)
      .limit(1);

    if (!deferredLink) {
      logger.warn(`[${requestId}] Deferred link not found for IP: ${ipAddress}`);
      
      // Check if there are any consumed links for this IP (checking both formats)
      const consumedLink = await DeferredLink.findOne({ 
        "deviceInfo.ip": { $in: ipVariations }
      }).sort({ createdAt: -1 });
      
      if (consumedLink) {
        if (consumedLink.consumed) {
          logger.warn(`[${requestId}] Deferred link already consumed for IP: ${ipAddress}, consumedAt: ${consumedLink.consumedAt}`);
        } else if (consumedLink.expiresAt <= new Date()) {
          logger.warn(`[${requestId}] Deferred link expired for IP: ${ipAddress}, expiresAt: ${consumedLink.expiresAt}`);
        }
      }
      
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Deferred link not found or expired for this IP address",
        data: null,
      });
    }

    logger.info(`[${requestId}] Deferred link found for IP - categoryId: ${deferredLink.categoryId}, featureTitle: ${deferredLink.featureTitle}, createdAt: ${deferredLink.createdAt}`);

    // Mark as consumed
    deferredLink.consumed = true;
    deferredLink.consumedAt = new Date();
    await deferredLink.save();

    logger.info(`[${requestId}] Deferred link marked as consumed`);

    // Generate a new short-lived token for the app
    const payload = {
      userId: deferredLink.userId.toString(),
      categoryId: deferredLink.categoryId.toString(),
      featureTitle: deferredLink.featureTitle,
      imageId: deferredLink.imageId || null,
      timestamp: Date.now(),
    };

    logger.info(`[${requestId}] Generating new JWT token for deferred link`);

    // Generate new token (valid for 24 hours)
    const newToken = await helper.generateToken(payload, "24h");

    const responseData = {
      categoryId: deferredLink.categoryId.toString(),
      featureTitle: deferredLink.featureTitle,
      imageId: deferredLink.imageId || null,
      token: newToken,
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Deferred link resolved successfully by IP - categoryId: ${responseData.categoryId}, featureTitle: ${responseData.featureTitle}, duration: ${duration}ms`);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Deferred link resolved successfully",
      data: responseData,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Error resolving deferred link by IP - ${error.message}`, {
      error: error.stack,
      ipAddress: req.query.ipAddress,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "Unknown",
    });
    console.error("Error resolving deferred link by IP:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to resolve deferred link by IP address",
      data: null,
    });
  }
};

// Create Deferred Link Endpoint (called by JavaScript when app doesn't open)
const createDeferredLink = async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  try {
    const { categoryId } = req.params;
    const { token } = req.query;
    const userAgent = req.headers["user-agent"] || "Unknown";
    // Use helper function to extract real client IP (handles proxy/load balancer scenarios)
    const ip = getClientIp(req);

    // Log all IP-related headers for debugging
    const ipHeaders = {
      "x-forwarded-for": req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"] || "N/A",
      "x-real-ip": req.headers["x-real-ip"] || req.headers["X-Real-IP"] || "N/A",
      "cf-connecting-ip": req.headers["cf-connecting-ip"] || req.headers["CF-Connecting-IP"] || "N/A",
      "x-client-ip": req.headers["x-client-ip"] || req.headers["X-Client-IP"] || "N/A",
      "req.ip": req.ip || "N/A",
      "req.connection.remoteAddress": req.connection?.remoteAddress || "N/A",
      "req.socket.remoteAddress": req.socket?.remoteAddress || "N/A",
      "all-headers": Object.keys(req.headers).filter(h => h.toLowerCase().includes("ip") || h.toLowerCase().includes("forward") || h.toLowerCase().includes("client") || h.toLowerCase().includes("real")).reduce((acc, key) => { acc[key] = req.headers[key]; return acc; }, {}),
    };

    if (ip === "Unknown") {
      logger.warn(`[${requestId}] WARNING: Could not extract client IP address. This may cause issues with deferred link resolution.`, { ipHeaders });
    }

    logger.info(`[${requestId}] createDeferredLink API called - categoryId: ${categoryId}, Extracted IP: ${ip}, User-Agent: ${userAgent}`, { ipHeaders });

    if (!token) {
      logger.warn(`[${requestId}] createDeferredLink failed - Token is missing`);
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Token is required",
        data: null,
      });
    }

    logger.info(`[${requestId}] Token received, length: ${token.length}`);

    // Validate categoryId
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      logger.warn(`[${requestId}] createDeferredLink failed - Invalid categoryId: ${categoryId}`);
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID",
        data: null,
      });
    }

    logger.info(`[${requestId}] CategoryId validated: ${categoryId}`);

    // Decode JWT token
    let decodedData;
    try {
      logger.info(`[${requestId}] Attempting to verify JWT token`);
      decodedData = await helper.verifyToken(token);
      logger.info(`[${requestId}] Token verified successfully - userId: ${decodedData.userId}, categoryId: ${decodedData.categoryId}`);
    } catch (error) {
      logger.error(`[${requestId}] Token verification failed - ${error.message}`, { error: error.stack });
      return apiResponse({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        status: false,
        message: "Invalid or expired token",
        data: null,
      });
    }

    const { userId, categoryId: tokenCategoryId, featureTitle, imageId } = decodedData;

    logger.info(`[${requestId}] Decoded data - userId: ${userId}, tokenCategoryId: ${tokenCategoryId}, featureTitle: ${featureTitle}, imageId: ${imageId || "null"}`);

    if (tokenCategoryId !== categoryId) {
      logger.warn(`[${requestId}] Category ID mismatch - tokenCategoryId: ${tokenCategoryId}, categoryId: ${categoryId}`);
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Category ID mismatch",
        data: null,
      });
    }

    logger.info(`[${requestId}] Category ID matched, proceeding to create deferred link`);

    // Generate unique install reference (UUID)
    const installRef = uuidv4();
    
    // Generate short code (8 characters) for better referrer preservation
    // Use alphanumeric characters that are URL-safe
    const shortCodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let shortCode = "";
    for (let i = 0; i < 8; i++) {
      shortCode += shortCodeChars.charAt(Math.floor(Math.random() * shortCodeChars.length));
    }
    
    const tokenHash = helper.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    logger.info(`[${requestId}] Generated installRef: ${installRef}, shortCode: ${shortCode}, expiresAt: ${expiresAt.toISOString()}`);

    try {
      const deferredLinkData = {
        installRef,
        shortCode,
        categoryId: new mongoose.Types.ObjectId(categoryId),
        tokenHash,
        featureTitle,
        imageId: imageId || null,
        userId: new mongoose.Types.ObjectId(userId),
        expiresAt,
        consumed: false,
        deviceInfo: {
          userAgent: userAgent,
          ip: ip,
          installSource: "web_browser",
        },
      };

      logger.info(`[${requestId}] Creating deferred link in database`, { deferredLinkData: { ...deferredLinkData, tokenHash: "***HIDDEN***" } });

      await DeferredLink.create(deferredLinkData);

      logger.info(`[${requestId}] Deferred link created successfully in database - installRef: ${installRef}, shortCode: ${shortCode}`);
    } catch (dbError) {
      logger.error(`[${requestId}] Database error while creating deferred link - ${dbError.message}`, { error: dbError.stack, categoryId, userId, installRef });
      throw dbError;
    }

    const androidPackage = "photo.editor.photoeditor.filtermaster";
    
    // Use install_ref= format that works better with Play Store referrer preservation
    // Format: install_ref=UUID (matches the format that works when link is opened directly)
    // URL encode the referrer value - the entire "install_ref=UUID" string gets encoded
    const referrerValue = `install_ref=${installRef}`;
    const encodedReferrer = encodeURIComponent(referrerValue);
    
    // Generate Play Store URL with properly formatted referrer
    // This format works consistently whether opened directly or from browser
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${androidPackage}&referrer=${encodedReferrer}`;

    console.log("playStoreUrl", playStoreUrl);  
    
    logger.info(`[${requestId}] Generated Play Store URL with referrer format: install_ref=${installRef}`);

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Deferred link created successfully - installRef: ${installRef}, playStoreUrl: ${playStoreUrl}, duration: ${duration}ms`);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Deferred link created successfully",
      data: {
        playStoreUrl,
        installRef,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Error creating deferred link - ${error.message}`, {
      error: error.stack,
      categoryId: req.params.categoryId,
      hasToken: !!req.query.token,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "Unknown",
    });
    console.error("Error creating deferred link:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to create deferred link",
      data: null,
    });
  }
};

// Generate Fallback HTML Page (Android Only)
// const generateFallbackHTML = (data) => {
//   const {
//     title = "AI Feature",
//     message = "Check out this amazing AI feature!",
//     featureTitle = "AI Feature",
//     deepLink,
//     customSchemeLink,
//     androidStoreLink,
//     webLink,
//     createDeferredUrl,
//   } = data;

//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <meta http-equiv="X-UA-Compatible" content="IE=edge">
//   <title>${featureTitle} - Selfie Beauty Camera</title>
//   <style>
//     * {
//       margin: 0;
//       padding: 0;
//       box-sizing: border-box;
//     }
//     body {
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       min-height: 100vh;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       padding: 20px;
//     }
//     .container {
//       background: white;
//       border-radius: 20px;
//       padding: 40px;
//       max-width: 500px;
//       width: 100%;
//       box-shadow: 0 20px 60px rgba(0,0,0,0.3);
//       text-align: center;
//     }
//     .icon {
//       width: 80px;
//       height: 80px;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       border-radius: 50%;
//       margin: 0 auto 20px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 40px;
//     }
//     h1 {
//       color: #333;
//       margin-bottom: 10px;
//       font-size: 28px;
//     }
//     p {
//       color: #666;
//       margin-bottom: 30px;
//       font-size: 16px;
//       line-height: 1.6;
//     }
//     .feature-badge {
//       display: inline-block;
//       background: #f0f0f0;
//       padding: 8px 16px;
//       border-radius: 20px;
//       color: #667eea;
//       font-weight: 600;
//       margin-bottom: 30px;
//       font-size: 14px;
//     }
//     .button {
//       display: inline-block;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       color: white;
//       padding: 16px 32px;
//       border-radius: 12px;
//       text-decoration: none;
//       font-weight: 600;
//       font-size: 16px;
//       transition: transform 0.2s, box-shadow 0.2s;
//       cursor: pointer;
//       border: none;
//       width: 100%;
//       margin-bottom: 15px;
//     }
//     .button:hover {
//       transform: translateY(-2px);
//       box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
//     }
//     .button:active {
//       transform: translateY(0);
//     }
//     .loading {
//       display: none;
//       color: #666;
//       font-size: 14px;
//       margin-top: 20px;
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="icon">✨</div>
//     <h1>${featureTitle}</h1>
//     <p>${message}</p>
//     <div class="feature-badge">${featureTitle} Feature</div>
//     <button id="openAppBtn" class="button">Open in App</button>
//     <div class="loading" id="loading">Opening app...</div>
//   </div>

//   <script>
//     (function() {
//       console.log('[DeferredLink] Script started');
//       const ua = navigator.userAgent || navigator.vendor || window.opera;
//       const deepLinkUrl = "${deepLink}";
//       const customSchemeLink = "${customSchemeLink}";
//       const androidStoreLink = "${androidStoreLink}";
//       const webLink = "${webLink}";
//       const createDeferredUrl = "${createDeferredUrl}";
      
//       console.log('[DeferredLink] URLs initialized', {
//         createDeferredUrl: createDeferredUrl,
//         androidStoreLink: androidStoreLink,
//         customSchemeLink: customSchemeLink
//       });
      
//       const isAndroid = /android/i.test(ua);
//       console.log('[DeferredLink] Platform detected', { isAndroid, userAgent: ua });
      
//       let appOpened = false;
//       let pageHidden = false;
//       let redirectTimer = null;
//       let startTime = Date.now();
//       let hasRedirected = false;
//       let deferredLinkCreated = false;

//       const createDeferredLink = async () => {
//         if (deferredLinkCreated) {
//           console.log('[DeferredLink] Deferred link already created, skipping');
//           return null;
//         }

//         if (!createDeferredUrl || createDeferredUrl === 'undefined') {
//           console.error('[DeferredLink] createDeferredUrl is missing or undefined');
//           return null;
//         }

//         console.log('[DeferredLink] Creating deferred link...', { url: createDeferredUrl });
//         deferredLinkCreated = true;

//         try {
//           const response = await fetch(createDeferredUrl, {
//             method: 'GET',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             // Use keepalive to ensure request completes even if page unloads
//             keepalive: true
//           });

//           console.log('[DeferredLink] Fetch response received', { 
//             status: response.status, 
//             statusText: response.statusText 
//           });

//           const data = await response.json();
//           console.log('[DeferredLink] Response data', data);

//           if (data.status && data.data && data.data.playStoreUrl) {
//             console.log('[DeferredLink] Deferred link created successfully', {
//               installRef: data.data.installRef,
//               playStoreUrl: data.data.playStoreUrl
//             });
//             return data.data.playStoreUrl;
//           } else {
//             console.warn('[DeferredLink] Deferred link creation failed - invalid response', data);
//             return null;
//           }
//         } catch (error) {
//           console.error('[DeferredLink] Error creating deferred link', {
//             error: error.message,
//             stack: error.stack,
//             url: createDeferredUrl
//           });
//           return null;
//         }
//       };

//       const redirectToPlayStore = async (useDeferredLink = true) => {
//         console.log('[DeferredLink] Redirecting to Play Store', { useDeferredLink });
        
//         if (useDeferredLink) {
//           const playStoreUrl = await createDeferredLink();
//           if (playStoreUrl) {
//             console.log('[DeferredLink] Redirecting to deferred Play Store URL');
//             window.location.href = playStoreUrl;
//             return;
//           } else {
//             console.warn('[DeferredLink] Deferred link creation failed, using regular Play Store URL');
//           }
//         }
        
//         console.log('[DeferredLink] Redirecting to regular Play Store URL');
//         window.location.href = androidStoreLink;
//       };

//       const markAppOpened = () => { 
//         console.log('[DeferredLink] App opened detected');
//         appOpened = true; 
//         if (redirectTimer) {
//           clearTimeout(redirectTimer);
//           redirectTimer = null;
//         }
//       };

//       const handleVisibilityChange = () => {
//         console.log('[DeferredLink] Visibility changed', { 
//           visibilityState: document.visibilityState 
//         });
//         if (document.visibilityState === 'hidden') { 
//           pageHidden = true; 
//           markAppOpened(); 
//         }
//       };

//       const handleBlur = () => { 
//         console.log('[DeferredLink] Window blur event');
//         pageHidden = true; 
//         markAppOpened(); 
//       };

//       const handlePageHide = () => { 
//         console.log('[DeferredLink] Page hide event');
//         pageHidden = true; 
//         markAppOpened();
//         // Create deferred link before page unloads
//         if (!appOpened && !deferredLinkCreated) {
//           console.log('[DeferredLink] Page hiding - creating deferred link before unload');
//           createDeferredLink();
//         }
//       };

//       const handleBeforeUnload = () => {
//         console.log('[DeferredLink] Before unload event');
//         if (!appOpened && !deferredLinkCreated) {
//           console.log('[DeferredLink] Before unload - creating deferred link');
//           // Use sendBeacon for more reliable delivery during page unload
//           if (navigator.sendBeacon && createDeferredUrl) {
//             // Note: sendBeacon doesn't support response, so we'll use fetch with keepalive
//             createDeferredLink();
//           } else {
//             createDeferredLink();
//           }
//         }
//       };

//       document.addEventListener('visibilitychange', handleVisibilityChange);
//       window.addEventListener('blur', handleBlur);
//       window.addEventListener('pagehide', handlePageHide);
//       window.addEventListener('beforeunload', handleBeforeUnload);

//       const tryOpenAppAndroid = () => {
//         if (hasRedirected) {
//           console.log('[DeferredLink] Already redirected, skipping');
//           return;
//         }
        
//         console.log('[DeferredLink] Attempting to open app with deep link', { deepLinkUrl });
//         window.location.href = deepLinkUrl;
//         hasRedirected = true;
        
//         if (redirectTimer) {
//           clearTimeout(redirectTimer);
//           redirectTimer = null;
//         }
        
//         // Android Intent URLs handle fallback automatically, but we add a safety check
//         // If app doesn't open, create deferred link and redirect to Play Store
//         redirectTimer = setTimeout(async () => {
//           console.log('[DeferredLink] Timeout check', {
//             visibilityState: document.visibilityState,
//             pageHidden: pageHidden,
//             appOpened: appOpened
//           });

//           if (document.visibilityState === 'visible' && !pageHidden && !appOpened) {
//             console.log('[DeferredLink] App did not open - redirecting to Play Store with deferred link');
//             await redirectToPlayStore(true);
//           } else {
//             console.log('[DeferredLink] App may have opened or page hidden, skipping redirect');
//           }
//         }, 2000);
//       };

//       const startJoinFlow = () => {
//         if (isAndroid) {
//           console.log('[DeferredLink] Starting join flow for Android');
//           // Android can trigger immediately
//           setTimeout(() => {
//             tryOpenAppAndroid();
//           }, 500);
//         } else {
//           console.log('[DeferredLink] Not Android, skipping auto-open');
//         }
//       };

//       if (document.readyState === 'complete' || document.readyState === 'interactive') {
//         console.log('[DeferredLink] Document ready, starting flow');
//         startJoinFlow();
//       } else {
//         console.log('[DeferredLink] Waiting for DOMContentLoaded');
//         window.addEventListener('DOMContentLoaded', () => {
//           console.log('[DeferredLink] DOMContentLoaded fired');
//           startJoinFlow();
//         });
//       }

//       const openAppBtn = document.getElementById('openAppBtn');
//       if (openAppBtn) {
//         openAppBtn.addEventListener('click', async function(e) {
//           e.preventDefault();
//           e.stopPropagation();
          
//           console.log('[DeferredLink] Open App button clicked');
          
//           const loadingEl = document.getElementById('loading');
//           if (loadingEl) loadingEl.style.display = 'block';
          
//           const customSchemeUrl = customSchemeLink || deepLinkUrl;
          
//           if (isAndroid) {
//             if (customSchemeUrl && customSchemeUrl.startsWith('photoeditor://')) {
//               console.log('[DeferredLink] Opening custom scheme link', { customSchemeUrl });
//               window.location.href = customSchemeUrl;
//               hasRedirected = true;
              
//               // Fallback to Play Store if app doesn't open
//               setTimeout(async () => {
//                 console.log('[DeferredLink] Button click timeout check', {
//                   visibilityState: document.visibilityState,
//                   pageHidden: pageHidden,
//                   appOpened: appOpened
//                 });

//                 if (document.visibilityState === 'visible' && !pageHidden && !appOpened) {
//                   console.log('[DeferredLink] App did not open after button click - redirecting to Play Store');
//                   await redirectToPlayStore(true);
//                 }
//               }, 2000);
//             } else {
//               console.log('[DeferredLink] Using tryOpenAppAndroid from button click');
//               tryOpenAppAndroid();
//             }
//           } else {
//             if (!hasRedirected) {
//               console.log('[DeferredLink] Not Android, redirecting to web link');
//               hasRedirected = true;
//               window.location.href = webLink;
//             }
//           }
//         });
//       } else {
//         console.warn('[DeferredLink] Open App button not found');
//       }
//     })();
//   </script>
// </body>
// </html>`;
// };

// const generateFallbackHTML = (data) => {
//   const {
//     title = "AI Feature",
//     message = "Check out this amazing AI feature!",
//     featureTitle = "AI Feature",
//     deepLink,
//     customSchemeLink,
//     androidStoreLink,
//     webLink,
//     createDeferredUrl,
//   } = data;

//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <meta http-equiv="X-UA-Compatible" content="IE=edge">
//   <title>${featureTitle} - Selfie Beauty Camera</title>
//   <style>
//     * {
//       margin: 0;
//       padding: 0;
//       box-sizing: border-box;
//     }
//     body {
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       min-height: 100vh;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       padding: 20px;
//     }
//     .container {
//       background: white;
//       border-radius: 20px;
//       padding: 40px;
//       max-width: 500px;
//       width: 100%;
//       box-shadow: 0 20px 60px rgba(0,0,0,0.3);
//       text-align: center;
//     }
//     .icon {
//       width: 80px;
//       height: 80px;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       border-radius: 50%;
//       margin: 0 auto 20px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 40px;
//     }
//     h1 {
//       color: #333;
//       margin-bottom: 10px;
//       font-size: 28px;
//     }
//     p {
//       color: #666;
//       margin-bottom: 30px;
//       font-size: 16px;
//       line-height: 1.6;
//     }
//     .feature-badge {
//       display: inline-block;
//       background: #f0f0f0;
//       padding: 8px 16px;
//       border-radius: 20px;
//       color: #667eea;
//       font-weight: 600;
//       margin-bottom: 30px;
//       font-size: 14px;
//     }
//     .button {
//       display: inline-block;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       color: white;
//       padding: 16px 32px;
//       border-radius: 12px;
//       text-decoration: none;
//       font-weight: 600;
//       font-size: 16px;
//       transition: transform 0.2s, box-shadow 0.2s;
//       cursor: pointer;
//       border: none;
//       width: 100%;
//       margin-bottom: 15px;
//     }
//     .button:hover {
//       transform: translateY(-2px);
//       box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
//     }
//     .button:active {
//       transform: translateY(0);
//     }
//     .loading {
//       display: none;
//       color: #666;
//       font-size: 14px;
//       margin-top: 20px;
//     }
//     .debug-info {
//       display: none;
//       margin-top: 20px;
//       padding: 10px;
//       background: #f5f5f5;
//       border-radius: 8px;
//       font-size: 11px;
//       text-align: left;
//       color: #666;
//       max-height: 200px;
//       overflow-y: auto;
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="icon">✨</div>
//     <h1>${featureTitle}</h1>
//     <p>${message}</p>
//     <div class="feature-badge">${featureTitle} Feature</div>
//     <button id="openAppBtn" class="button">Open in App</button>
//     <div class="loading" id="loading">Opening app...</div>
//     <div class="debug-info" id="debugInfo"></div>
//   </div>

//   <script>
//     (function() {
//       console.log('[DeferredLink] Script started');
//       const ua = navigator.userAgent || navigator.vendor || window.opera;
//       const deepLinkUrl = "${deepLink}";
//       const customSchemeLink = "${customSchemeLink}";
//       const androidStoreLink = "${androidStoreLink}";
//       const webLink = "${webLink}";
//       const createDeferredUrl = "${createDeferredUrl}";
      
//       console.log('[DeferredLink] URLs initialized', {
//         createDeferredUrl: createDeferredUrl,
//         androidStoreLink: androidStoreLink,
//         customSchemeLink: customSchemeLink
//       });
      
//       const isAndroid = /android/i.test(ua);
//       console.log('[DeferredLink] Platform detected', { isAndroid, userAgent: ua });
      
//       let appOpened = false;
//       let pageHidden = false;
//       let redirectTimer = null;
//       let hasRedirected = false;
//       let deferredLinkCreated = false;
//       let playStoreUrlWithReferrer = null;

//       // Debug logging helper
//       const addDebugLog = (message) => {
//         const debugEl = document.getElementById('debugInfo');
//         if (debugEl) {
//           debugEl.style.display = 'block';
//           debugEl.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '<br>';
//           debugEl.scrollTop = debugEl.scrollHeight;
//         }
//       };

//       const createDeferredLink = async () => {
//         if (deferredLinkCreated) {
//           console.log('[DeferredLink] Deferred link already created, skipping');
//           return playStoreUrlWithReferrer;
//         }

//         if (!createDeferredUrl || createDeferredUrl === 'undefined') {
//           console.error('[DeferredLink] createDeferredUrl is missing or undefined');
//           addDebugLog('ERROR: createDeferredUrl missing');
//           return null;
//         }

//         console.log('[DeferredLink] Creating deferred link...', { url: createDeferredUrl });
//         addDebugLog('Creating deferred link...');
//         deferredLinkCreated = true;

//         try {
//           const response = await fetch(createDeferredUrl, {
//             method: 'GET',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             keepalive: true
//           });

//           console.log('[DeferredLink] Fetch response received', { 
//             status: response.status, 
//             statusText: response.statusText 
//           });

//           const data = await response.json();
//           console.log('[DeferredLink] Response data', data);

//           if (data.status && data.data && data.data.playStoreUrl) {
//             playStoreUrlWithReferrer = data.data.playStoreUrl;
//             console.log('[DeferredLink] Deferred link created successfully', {
//               installRef: data.data.installRef,
//               playStoreUrl: playStoreUrlWithReferrer
//             });
//             addDebugLog('Deferred link created: ' + data.data.installRef);
//             return playStoreUrlWithReferrer;
//           } else {
//             console.warn('[DeferredLink] Deferred link creation failed - invalid response', data);
//             addDebugLog('ERROR: Invalid response from server');
//             return null;
//           }
//         } catch (error) {
//           console.error('[DeferredLink] Error creating deferred link', {
//             error: error.message,
//             stack: error.stack,
//             url: createDeferredUrl
//           });
//           addDebugLog('ERROR: ' + error.message);
//           return null;
//         }
//       };

//       const redirectToPlayStore = async (useDeferredLink = true) => {
//         console.log('[DeferredLink] Redirecting to Play Store', { useDeferredLink });
//         addDebugLog('Redirecting to Play Store...');
        
//         let finalUrl = androidStoreLink;
        
//         if (useDeferredLink) {
//           const deferredUrl = await createDeferredLink();
//           if (deferredUrl) {
//             finalUrl = deferredUrl;
//             console.log('[DeferredLink] Using deferred Play Store URL with referrer');
//             addDebugLog('Using URL with referrer');
//           } else {
//             console.warn('[DeferredLink] Deferred link creation failed, using regular Play Store URL');
//             addDebugLog('WARNING: Using regular URL (no referrer)');
//           }
//         }
        
//         console.log('[DeferredLink] Final redirect URL:', finalUrl);
//         addDebugLog('Redirecting to: ' + finalUrl.substring(0, 80) + '...');
        
//         // **KEY FIX: Use window.location.replace() instead of window.location.href**
//         // This method preserves the referrer parameter better during redirect
//         window.location.replace(finalUrl);
//       };

//       const markAppOpened = () => { 
//         console.log('[DeferredLink] App opened detected');
//         addDebugLog('App opened successfully');
//         appOpened = true; 
//         if (redirectTimer) {
//           clearTimeout(redirectTimer);
//           redirectTimer = null;
//         }
//       };

//       const handleVisibilityChange = () => {
//         console.log('[DeferredLink] Visibility changed', { 
//           visibilityState: document.visibilityState 
//         });
//         if (document.visibilityState === 'hidden') { 
//           pageHidden = true; 
//           markAppOpened(); 
//         }
//       };

//       const handleBlur = () => { 
//         console.log('[DeferredLink] Window blur event');
//         pageHidden = true; 
//         markAppOpened(); 
//       };

//       const handlePageHide = () => { 
//         console.log('[DeferredLink] Page hide event');
//         pageHidden = true; 
//         markAppOpened();
//         // Pre-create deferred link before page unloads (don't wait for redirect)
//         if (!deferredLinkCreated) {
//           console.log('[DeferredLink] Page hiding - pre-creating deferred link');
//           createDeferredLink();
//         }
//       };

//       const handleBeforeUnload = () => {
//         console.log('[DeferredLink] Before unload event');
//         // Ensure deferred link is created before page unloads
//         if (!deferredLinkCreated) {
//           console.log('[DeferredLink] Before unload - creating deferred link');
//           createDeferredLink();
//         }
//       };

//       document.addEventListener('visibilitychange', handleVisibilityChange);
//       window.addEventListener('blur', handleBlur);
//       window.addEventListener('pagehide', handlePageHide);
//       window.addEventListener('beforeunload', handleBeforeUnload);

//       const tryOpenAppAndroid = async () => {
//         if (hasRedirected) {
//           console.log('[DeferredLink] Already redirected, skipping');
//           return;
//         }
        
//         console.log('[DeferredLink] Attempting to open app with deep link', { deepLinkUrl });
//         addDebugLog('Trying to open app...');
        
//         // Try opening app with custom scheme first (faster)
//         if (customSchemeLink && customSchemeLink.startsWith('photoeditor://')) {
//           window.location.href = customSchemeLink;
//         } else {
//           window.location.href = deepLinkUrl;
//         }
        
//         hasRedirected = true;
        
//         if (redirectTimer) {
//           clearTimeout(redirectTimer);
//           redirectTimer = null;
//         }
        
//         // Wait 2.5 seconds to see if app opens
//         redirectTimer = setTimeout(async () => {
//           console.log('[DeferredLink] Timeout check', {
//             visibilityState: document.visibilityState,
//             pageHidden: pageHidden,
//             appOpened: appOpened
//           });

//           // If page is still visible and app didn't open, redirect to Play Store
//           if (document.visibilityState === 'visible' && !pageHidden && !appOpened) {
//             console.log('[DeferredLink] App did not open - redirecting to Play Store with deferred link');
//             addDebugLog('App not installed, redirecting to store...');
//             await redirectToPlayStore(true);
//           } else {
//             console.log('[DeferredLink] App opened or page hidden, skipping redirect');
//             addDebugLog('App may have opened');
//           }
//         }, 2500); // Increased timeout slightly for better detection
//       };

//       const startJoinFlow = () => {
//         if (isAndroid) {
//           console.log('[DeferredLink] Starting join flow for Android');
//           addDebugLog('Starting Android flow...');
//           // Start after a short delay to ensure page is fully loaded
//           setTimeout(() => {
//             tryOpenAppAndroid();
//           }, 500);
//         } else {
//           console.log('[DeferredLink] Not Android, skipping auto-open');
//           addDebugLog('Not Android device');
//         }
//       };

//       if (document.readyState === 'complete' || document.readyState === 'interactive') {
//         console.log('[DeferredLink] Document ready, starting flow');
//         startJoinFlow();
//       } else {
//         console.log('[DeferredLink] Waiting for DOMContentLoaded');
//         window.addEventListener('DOMContentLoaded', () => {
//           console.log('[DeferredLink] DOMContentLoaded fired');
//           startJoinFlow();
//         });
//       }

//       const openAppBtn = document.getElementById('openAppBtn');
//       if (openAppBtn) {
//         openAppBtn.addEventListener('click', async function(e) {
//           e.preventDefault();
//           e.stopPropagation();
          
//           console.log('[DeferredLink] Open App button clicked');
//           addDebugLog('Button clicked');
          
//           const loadingEl = document.getElementById('loading');
//           if (loadingEl) loadingEl.style.display = 'block';
          
//           if (isAndroid) {
//             // Reset flags for manual retry
//             hasRedirected = false;
//             appOpened = false;
//             pageHidden = false;
            
//             await tryOpenAppAndroid();
//           } else {
//             if (!hasRedirected) {
//               console.log('[DeferredLink] Not Android, redirecting to web link');
//               hasRedirected = true;
//               window.location.href = webLink;
//             }
//           }
//         });
//       } else {
//         console.warn('[DeferredLink] Open App button not found');
//       }
//     })();
//   </script>
// </body>
// </html>`;
// };

const generateFallbackHTML = (data) => {
  const {
    title = "AI Feature",
    message = "Check out this amazing AI feature!",
    featureTitle = "AI Feature",
    deepLink,
    customSchemeLink,
    androidStoreLink,
    webLink,
    createDeferredUrl,
  } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${featureTitle} - Selfie Beauty Camera</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .container {
      background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center;
    }
    .icon {
      width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;
    }
    h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
    p { color: #666; margin-bottom: 30px; font-size: 16px; line-height: 1.6; }
    .feature-badge {
      display: inline-block; background: #f0f0f0; padding: 8px 16px; border-radius: 20px;
      color: #667eea; font-weight: 600; margin-bottom: 30px; font-size: 14px;
    }
    .button {
      display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none;
      font-weight: 600; font-size: 16px; cursor: pointer; border: none; width: 100%; margin-bottom: 15px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4); }
    .loading { display: none; color: #666; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✨</div>
    <h1>${featureTitle}</h1>
    <p>${message}</p>
    <div class="feature-badge">${featureTitle} Feature</div>
    <button id="openAppBtn" class="button">Open in App</button>
    <div class="loading" id="loading">Opening app...</div>
  </div>

  <script>
    (function() {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const customSchemeLink = "${customSchemeLink}";
      const createDeferredUrl = "${createDeferredUrl}";
      const androidPackage = "photo.editor.photoeditor.filtermaster";
      const isAndroid = /android/i.test(ua);
      
      let playStoreUrlWithReferrer = null;
      let referrerValue = null;

      // Fetch deferred link from API
      const fetchDeferredLink = async () => {
        if (playStoreUrlWithReferrer) {
          return playStoreUrlWithReferrer;
        }
        if (!createDeferredUrl || createDeferredUrl === 'undefined') {
          console.warn('[DeferredLink] createDeferredUrl not available');
          return null;
        }

        console.log('[DeferredLink] Fetching deferred link from API...');
        try {
          const response = await fetch(createDeferredUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true
          });
          const data = await response.json();
          
          if (data.status && data.data && data.data.playStoreUrl) {
            playStoreUrlWithReferrer = data.data.playStoreUrl;
            
            // Extract referrer from URL
            try {
              const urlObj = new URL(playStoreUrlWithReferrer);
              referrerValue = urlObj.searchParams.get('referrer');
              console.log('[DeferredLink] Deferred link fetched successfully, referrer:', referrerValue);
            } catch (e) {
              console.warn('[DeferredLink] Could not extract referrer from URL');
            }
            
            return playStoreUrlWithReferrer;
          }
          return null;
        } catch (error) {
          console.error('[DeferredLink] Error fetching deferred link:', error.message);
          return null;
        }
      };

      // Extract referrer from URL
      const extractReferrer = (url) => {
        try {
          const urlObj = new URL(url);
          return urlObj.searchParams.get('referrer');
        } catch (e) {
          return null;
        }
      };

      // Always open Play Store app (intent first, then market://, then web)
      const redirectToPlayStore = async () => {
        console.log('[DeferredLink] Forcing Play Store app open');
        
        // Fetch deferred link if not already fetched
        const playStoreUrl = await fetchDeferredLink();
        if (!playStoreUrl) {
          console.error('[DeferredLink] Could not get Play Store URL, using fallback');
          const fallbackUrl = 'https://play.google.com/store/apps/details?id=' + androidPackage;
          window.location.replace(fallbackUrl);
          return;
        }

        // Get referrer from URL or use cached value
        const referrer = referrerValue || extractReferrer(playStoreUrl);
        
        if (isAndroid && referrer) {
          // Build intent URL with referrer
          const intentUrl = 'intent://details?id=' + androidPackage + '&referrer=' + encodeURIComponent(referrer) + '#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=' + encodeURIComponent(playStoreUrl) + ';end';
          try {
            console.log('[DeferredLink] Using Intent URL for Play Store app');
            window.location.href = intentUrl;
            return;
          } catch (e) {
            console.log('[DeferredLink] Intent failed, trying market://');
            try {
              const marketUrl = 'market://details?id=' + androidPackage + '&referrer=' + encodeURIComponent(referrer);
              window.location.href = marketUrl;
              return;
            } catch (err) {
              console.log('[DeferredLink] market:// failed, falling back to https');
            }
          }
        }
        
        // Fallback to web URL
        window.location.replace(playStoreUrl);
      };

      const startJoinFlow = async () => {
        await redirectToPlayStore();
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        startJoinFlow();
      } else {
        window.addEventListener('DOMContentLoaded', startJoinFlow);
      }

      const openAppBtn = document.getElementById('openAppBtn');
      if (openAppBtn) {
        openAppBtn.addEventListener('click', async function(e) {
          e.preventDefault(); 
          e.stopPropagation();
          
          const loadingEl = document.getElementById('loading');
          if (loadingEl) loadingEl.style.display = 'block';
          
          // Reset cached URL to fetch fresh one
          playStoreUrlWithReferrer = null;
          referrerValue = null;
          
          await redirectToPlayStore();
        });
      }
    })();
  </script>
</body>
</html>`;
};

export default {
  generateShareLink,
  handleShareDeepLink,
  resolveInstallRef,
  resolveByIp,
  createDeferredLink,
};

