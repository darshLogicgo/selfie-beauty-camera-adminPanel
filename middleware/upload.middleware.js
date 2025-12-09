import multer from "multer";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Accept all files - validation happens in controller
    cb(null, true);
  },
});

const fields = [
  { name: "img_sqr", maxCount: 1 },
  { name: "img_rec", maxCount: 1 },
  { name: "video_sqr", maxCount: 1 },
  { name: "video_rec", maxCount: 1 },
  { name: "asset_images", maxCount: 50 }, // Allow up to 50 asset images
];

export const uploadMiddleware = (req, res, next) => {
  // Use upload.any() to accept any field name, then validate in code
  const handler = upload.any();

  handler(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `File upload failed: ${err.message || 'Unknown error'}`,
      });
    }

    // Validate and organize files by field name
    const allowedFields = fields.map(f => f.name);
    const organizedFiles = {};
    
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        const fieldName = file.fieldname;
        if (allowedFields.includes(fieldName)) {
          if (!organizedFiles[fieldName]) {
            organizedFiles[fieldName] = [];
          }
          organizedFiles[fieldName].push(file);
        } else {
          console.warn(`Unexpected field name: ${fieldName}`);
        }
      });
      
      // Check maxCount limits
      for (const field of fields) {
        if (organizedFiles[field.name] && organizedFiles[field.name].length > field.maxCount) {
          return apiResponse({
            res,
            statusCode: StatusCodes.BAD_REQUEST,
            message: `Too many files for field ${field.name}. Maximum allowed: ${field.maxCount}`,
          });
        }
      }
      
      // Replace req.files with organized structure (multer.fields format)
      req.files = organizedFiles;
    }

    try {
      // Always ensure req.body exists
      req.body = req.body || {};

      // If no files were uploaded → continue without error
      if (!req.files || Object.keys(req.files).length === 0) {
        return next();
      }

      const uploadPromises = [];

      const processField = (field) => {
        const fileArr = req.files[field];
        if (fileArr && fileArr.length > 0) {
          const file = fileArr[0];

          const promise = fileUploadService
            .uploadFile({
              buffer: file.buffer,
              mimetype: file.mimetype,
            })
            .then((url) => {
              req.body[field] = url; // attach uploaded URL
            });

          uploadPromises.push(promise);
        }
      };

      // Process all fields if present (skip asset_images as it's handled separately in controller)
      fields.forEach((f) => {
        if (f.name !== "asset_images") {
          processField(f.name);
        }
      });

      await Promise.all(uploadPromises);

      return next();
    } catch (error) {
      console.error("Error during file upload middleware:", error);
      return apiResponse({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "File upload processing failed",
      });
    }
  });
};

export default uploadMiddleware;
