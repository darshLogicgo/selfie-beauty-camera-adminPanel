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

const uninstallReasons = {
  NO_NEED: "I don't need the app anymore",
  BETTER_APP_FOUND: "I found a better expense tracker",
  TOO_MANY_ADS: "Too many ads or interruptions",
  MISSING_FEATURES: "Missing features I need (Budget, Reports, Sync, Multi-currency etc.)",
  HARD_TO_USE: "The app is difficult or confusing to use",
  PERFORMANCE_ISSUES: "App performance issues (slow, crashes, lag)",
  BACKUP_SYNC_ISSUES: "Data backup/sync not working properly",
  MANUAL_ENTRY_TOO_LONG: "Manual expense entry takes too much time",
  BAD_UI: "UI & design doesn't feel modern or easy to navigate",
  PRICING_ISSUE: "Subscription or pricing problem (expensive / unclear)",
  OTHER: "Other",
};

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
  uninstallReasons,
};
