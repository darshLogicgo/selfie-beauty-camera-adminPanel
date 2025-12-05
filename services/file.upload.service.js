import { DeleteObjectCommand, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import config from "../config/config.js";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import helper from "../helper/common.helper.js";
import sharp from "sharp";
import enums from "../config/enum.config.js";

/**
 * Get file extension from base64 data
 */
const getFileExt = (imageData) => {
  const fileExtensionMapping = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-powerpoint": "ppt",
    "application/msword": "doc",
    "image/svg+xml": "svg",
  };
  const regex = /^data:([a-zA-Z0-9-+.]+\/[a-zA-Z0-9-+.]+);base64,/;
  const match = imageData.match(regex);
  if (!match) throw new Error("Invalid image data format");
  const mimetype = match[1];
  const fileExt = fileExtensionMapping[mimetype] || mimetype.split("/").pop();
  const data = imageData.replace(regex, "");
  return { fileExt, mimetype, data };
};

/**
 * Initialize S3 Client for DigitalOcean Spaces
 */
const s3Client = new S3({
  forcePathStyle: false,
  endpoint: config.cloud.digitalocean.endpoint,
  region: config.cloud.digitalocean.region,
  credentials: {
    accessKeyId: config.cloud.digitalocean.credentials.accessKeyId,
    secretAccessKey: config.cloud.digitalocean.credentials.secretAccessKey,
  },
});

/**
 * Upload file to DigitalOcean Spaces
 * @param {Object} params - Upload parameters
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.mimetype - File MIME type
 * @param {string} params.folder - Destination folder (optional)
 * @param {string} params.ACL - Access control level (default: public-read)
 * @returns {Promise<string>} - File URL
 */
const uploadFile = async ({
  mimetype,
  buffer,
  folder = "general",
  ACL = "public-read",
}) => {
  try {
    // Validate file size
    if (buffer.length > enums.maxFileSizeBytes) {
      throw new Error(
        `File size exceeds maximum allowed size of ${
          enums.maxFileSizeBytes / (1024 * 1024)
        }MB`
      );
    }

    const prefix = `${config.cloud.digitalocean.rootDirname}/${folder}`;
    const uuid = uuidv4();
    const extension = mime.extension(mimetype);
    const fileKey = `${prefix}/${uuid}.${extension}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.cloud.digitalocean.bucketName,
        Key: fileKey,
        Body: buffer,
        ACL: ACL,
        ContentType: mimetype,
      })
    );

    const fileUrl = `${config.cloud.digitalocean.baseUrl}/${fileKey}`;
    console.log(`File uploaded successfully: ${fileUrl}`);

    return fileUrl;
  } catch (error) {
    console.error("Upload File Error:", error);
    throw error;
  }
};

/**
 * Update file (delete old + upload new)
 * @param {Object} params - Update parameters
 * @param {string} params.url - Old file URL (optional)
 * @param {Buffer} params.buffer - New file buffer
 * @param {string} params.mimetype - New file MIME type
 * @param {string} params.folder - Destination folder (optional)
 * @param {string} params.ACL - Access control level (default: public-read)
 * @returns {Promise<string>} - New file URL
 */
const updateFile = async ({
  url,
  mimetype,
  buffer,
  folder = "general",
  ACL = "public-read",
}) => {
  try {
    // Delete old file if exists
    if (url) {
      await deleteFile({ url }).catch((err) =>
        console.warn("Warning: Failed to delete old file:", err.message)
      );
    }

    // Upload new file
    const newURL = await uploadFile({ buffer, mimetype, folder, ACL });
    return newURL;
  } catch (error) {
    console.error("Update File Error:", error);
    throw error;
  }
};

/**
 * Delete file from DigitalOcean Spaces
 * @param {Object} params - Delete parameters
 * @param {string} params.url - File URL to delete
 * @returns {Promise<string>} - Deleted file URL
 */
const deleteFile = async ({ url }) => {
  try {
    const fileKey = helper.extractFileKey(url);

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.cloud.digitalocean.bucketName,
        Key: fileKey,
      })
    );

    console.log(`File deleted successfully: ${url}`);
    return url;
  } catch (error) {
    console.error("Delete File Error:", error);
    throw error;
  }
};

/**
 * Handle and optimize base64 image
 * @param {string} imageData - Base64 encoded image data
 * @param {Object} file - File metadata (optional)
 * @returns {Promise<string>} - Optimized image URL
 */
const handleFile = async (imageData, file) => {
  try {
    const { fileExt, data, mimetype } = getFileExt(imageData);
    const imageBuffer = Buffer.from(data, "base64");

    // Optimize image dimensions
    const maxWidth = 1920;
    const maxHeight = 1080;

    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(fileExt)
      .toBuffer();

    const imageUrl = await uploadFile({
      buffer: optimizedImageBuffer,
      mimetype,
      folder: "images",
    });

    return imageUrl;
  } catch (error) {
    console.error("Handle File Error:", error);
    throw error;
  }
};

/**
 * Bulk delete files
 * @param {Array<string>} urls - Array of file URLs to delete
 * @returns {Promise<Object>} - Deletion result
 */
const bulkDeleteFiles = async (urls = []) => {
  try {
    const deletePromises = urls
      .filter((url) => url) // Filter out null/undefined
      .map((url) =>
        deleteFile({ url }).catch((err) => {
          console.warn(`Failed to delete ${url}:`, err.message);
          return null;
        })
      );

    const results = await Promise.all(deletePromises);
    const successCount = results.filter((r) => r !== null).length;

    console.log(
      `Bulk delete completed: ${successCount}/${urls.length} files deleted`
    );

    return {
      total: urls.length,
      successful: successCount,
      failed: urls.length - successCount,
    };
  } catch (error) {
    console.error("Bulk Delete Error:", error);
    throw error;
  }
};

export default {
  uploadFile,
  deleteFile,
  updateFile,
  handleFile,
  bulkDeleteFiles,
};
