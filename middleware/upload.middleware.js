import multer from "multer";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const fields = [
  { name: "img_sqr", maxCount: 1 },
  { name: "img_rec", maxCount: 1 },
  { name: "video_sqr", maxCount: 1 },
  { name: "video_rec", maxCount: 1 },
  { name: "asset_images", maxCount: 10 }, // Allow up to 10 asset images
];

export const uploadMiddleware = (req, res, next) => {
  const handler = upload.fields(fields);

  handler(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "File upload failed",
      });
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
