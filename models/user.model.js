import mongoose from "mongoose";
import enums from "../config/enum.config.js";
import passportLocalMongoose from "passport-local-mongoose";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import config from "../config/config.js";

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      default: null,
    },
    backupEmail: {
      type: String,
      default: null,
    },
    backupMobileNumber: {
      type: Number,
      default: null,
    },
    backupCountryCode: { type: String, default: null },
    recoveryMethods: {
      isEmail: { type: Boolean, default: false },
      isPhone: { type: Boolean, default: false },
    },
    password: {
      type: String,
      default: null,
    },
    mobileNumber: {
      type: Number,
    },
    username: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    providerId: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: Object.values(enums.authProviderEnum),
    },
    role: {
      type: String,
      enum: Object.values(enums.userRoleEnum),
      default: enums.userRoleEnum.USER,
    },
    otp: {
      type: Number,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    expiresIn: {
      type: String,
      default: null, 
    },
    secretKey: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorQr: { type: String, trim: true },
    recoveryCode: [{ type: Number }],
    fcmToken: { type: String, default: null },
    deviceId: { type: String, default: null },
    isDemo: { type: Boolean, default: false, index: true },
    countryCode: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

schema.index({ provider: 1, providerId: 1 });

schema.plugin(passportLocalMongoose);

// Method to enable 2FA and generate QR code
schema.methods.enableTwoFactorAuthentication = async function () {
  if (!this.secretKey) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: config.appName,
    });
    this.secretKey = secret.base32;

    await this.save();

    // Generate QR code for user to scan with Google Authenticator
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode };
  }

  return null; // 2FA is already enabled
};

const UserModel = mongoose.model("User", schema);
export default UserModel;
