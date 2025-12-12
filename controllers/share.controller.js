import helper from "../helper/common.helper.js";
import config from "../config/config.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Category from "../models/category.model.js";

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
  try {
    const { categoryId } = req.params;
    const { token } = req.query;

    if (!token) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Invalid share link. Token is missing.");
    }

    // Validate categoryId is valid MongoDB ObjectId
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Invalid category ID in share link.");
    }

    // Decode JWT token to get all info
    let decodedData;
    try {
      decodedData = await helper.verifyToken(token);
    } catch (error) {
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

    // Verify categoryId matches
    if (tokenCategoryId !== categoryId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Category ID mismatch in share link.");
    }

    // Detect Android platform
    const userAgent = req.headers["user-agent"] || "";
    const isAndroid = /android/i.test(userAgent);

    // Generate Android Intent URL
    const baseUrl = config.base_url || config.server_url;
    const androidPackage = "photo.editor.photoeditor.filtermaster"; // Replace with your actual package name
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${androidPackage}`;
    const encodedPlayStoreUrl = encodeURIComponent(playStoreUrl);
    const androidIntentLink = `intent://share/${categoryId}?token=${token}#Intent;scheme=photoeditor;package=${androidPackage};S.browser_fallback_url=${encodedPlayStoreUrl};end`;
    const customSchemeLink = `photoeditor://share/${categoryId}?token=${token}`;
    const androidStoreLink = `https://play.google.com/store/apps/details?id=${androidPackage}`;

    // Generate HTML fallback page (Android only)
    const html = generateFallbackHTML({
      title: featureTitle,
      message: `Check out this amazing ${featureTitle} feature!`,
      featureTitle: featureTitle,
      deepLink: androidIntentLink,
      customSchemeLink: customSchemeLink,
      androidStoreLink: androidStoreLink,
      webLink: `${baseUrl}/share/${categoryId}?token=${token}`,
    });

    // Prevent caching
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.send(html);
  } catch (error) {
    console.error("Error handling share deep link:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("An error occurred while processing the share link.");
  }
};

// Generate Fallback HTML Page (Android Only)
const generateFallbackHTML = (data) => {
  const {
    title = "AI Feature",
    message = "Check out this amazing AI feature!",
    featureTitle = "AI Feature",
    deepLink,
    customSchemeLink,
    androidStoreLink,
    webLink,
  } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${featureTitle} - Selfie Beauty Camera</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    p {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
      line-height: 1.6;
    }
    .feature-badge {
      display: inline-block;
      background: #f0f0f0;
      padding: 8px 16px;
      border-radius: 20px;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      border: none;
      width: 100%;
      margin-bottom: 15px;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    .button:active {
      transform: translateY(0);
    }
    .loading {
      display: none;
      color: #666;
      font-size: 14px;
      margin-top: 20px;
    }
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
      const deepLinkUrl = "${deepLink}";
      const customSchemeLink = "${customSchemeLink}";
      const androidStoreLink = "${androidStoreLink}";
      const webLink = "${webLink}";
      
      const isAndroid = /android/i.test(ua);
      
      let appOpened = false;
      let pageHidden = false;
      let redirectTimer = null;
      let startTime = Date.now();
      let hasRedirected = false;

      const markAppOpened = () => { 
        appOpened = true; 
        if (redirectTimer) {
          clearTimeout(redirectTimer);
          redirectTimer = null;
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') { 
          pageHidden = true; 
          markAppOpened(); 
        }
      };

      const handleBlur = () => { 
        pageHidden = true; 
        markAppOpened(); 
      };

      const handlePageHide = () => { 
        pageHidden = true; 
        markAppOpened(); 
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('pagehide', handlePageHide);

      const tryOpenAppAndroid = () => {
        if (hasRedirected) return;
        
        window.location.href = deepLinkUrl;
        hasRedirected = true;
        
        if (redirectTimer) {
          clearTimeout(redirectTimer);
          redirectTimer = null;
        }
        
        // Android Intent URLs handle fallback automatically, but we add a safety check
        redirectTimer = setTimeout(() => {
          if (document.visibilityState === 'visible' && !pageHidden && !appOpened) {
            window.location.href = androidStoreLink;
          }
        }, 2000);
      };

      const startJoinFlow = () => {
        if (isAndroid) {
          // Android can trigger immediately
          setTimeout(() => {
            tryOpenAppAndroid();
          }, 500);
        }
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        startJoinFlow();
      } else {
        window.addEventListener('DOMContentLoaded', startJoinFlow);
      }

      const openAppBtn = document.getElementById('openAppBtn');
      if (openAppBtn) {
        openAppBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const loadingEl = document.getElementById('loading');
          if (loadingEl) loadingEl.style.display = 'block';
          
          const customSchemeUrl = customSchemeLink || deepLinkUrl;
          
          if (isAndroid) {
            if (customSchemeUrl && customSchemeUrl.startsWith('photoeditor://')) {
              window.location.href = customSchemeUrl;
              hasRedirected = true;
              
              // Fallback to Play Store if app doesn't open
              setTimeout(() => {
                if (document.visibilityState === 'visible' && !pageHidden && !appOpened) {
                  window.location.href = androidStoreLink;
                }
              }, 2000);
            } else {
              tryOpenAppAndroid();
            }
          } else {
            if (!hasRedirected) {
              hasRedirected = true;
              window.location.href = webLink;
            }
          }
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
};

