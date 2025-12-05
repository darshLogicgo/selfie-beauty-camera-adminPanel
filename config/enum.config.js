const nodeEnvEnums = {
  PRODUCTION: "production",
  DEVELOPMENT: "development",
};

const authProviderEnum = {
  GOOGLE: "google",
  APPLE: "apple",
  EMAIL: "email",
  MOBILE: "mobile",
};

const userRoleEnum = {
  USER: "user",
  ADMIN: "admin",
  MANAGER: "manager",
};

const socketEventEnums = {
  SEND_MESSAGE: "send_message",
};

export const MediaTypes = Object.freeze({
  IMAGE_SQUAR: "img_sqr",
  IMAGE_RECT: "img_rec",
  VIDEO_SQUAR: "video_sqr",
  VIDEO_RECT: "video_rec",
});

const categoryStatusEnum = {
  ACTIVE: true,
  INACTIVE: false,
};

const categoryMediaTypes = {
  IMAGE: "image",
  VIDEO: "video",
};

const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const allowedVideoMimeTypes = ["video/mp4", "video/mpeg", "video/quicktime"];

const maxFileSizeBytes = 100 * 1024 * 1024; // 100MB

export default {
  nodeEnvEnums,
  authProviderEnum,
  userRoleEnum,
  socketEventEnums,
  MediaTypes,
  categoryStatusEnum,
  categoryMediaTypes,
  allowedImageMimeTypes,
  allowedVideoMimeTypes,
  maxFileSizeBytes,
};
