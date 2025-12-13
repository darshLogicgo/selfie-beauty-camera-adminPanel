import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";
import fileUploadService from "../services/file.upload.service.js";
import userServices from "../services/user.service.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import config from "../config/config.js";
import helper from "../helper/common.helper.js";
import emailService from "../services/email.service.js";
import bcrypt from "bcrypt";

// ---- Get User Profile -----
const getUserProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await userServices.findOne({ _id: userId, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User not found.",
        statusCode: StatusCodes.NOT_FOUND,
      });
    }

    const { password, otp, otpExpiresAt, ...filteredUser } = user.toObject();

    return apiResponse({
      res,
      status: true,
      message: "User profile fetched successfully.",
      statusCode: StatusCodes.OK,
      data: filteredUser,
    });
  } catch (error) {
    return apiResponse({
      res,
      status: false,
      message: "Failed to fetch user profile.",
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
};

// ---- Update User Profile ------
const updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const data = req.body;
  const file = req.file;

  const user = await userServices.findOne({ _id: userId, isDeleted: false });

  if (!user) {
    return apiResponse({
      res,
      status: false,
      message: "User not found.",
      statusCode: StatusCodes.NOT_FOUND,
    });
  }

  try {
    let updateData = {};

    if (file) {
      if (user?.profileImage) {
        await fileUploadService.deleteFile({ url: user?.profileImage });
      }
      const fileKey = await fileUploadService.uploadFile({ buffer: file.buffer, mimetype: file.mimetype });
      updateData.profileImage = fileKey;
    }

    // Deep merge nested objects to avoid overwriting unintended fields
    const deepMerge = (target, source) => {
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== "object") {
            target[key] = {};
          }
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };

    deepMerge(updateData, data);

    // Update user profile
    const updatedUser = await userServices.updateSingleField(userId, updateData, { new: true });
    const { password, otp, otpExpiresAt, ...filteredUser } = updatedUser.toObject();

    return apiResponse({
      res,
      status: true,
      message: "User profile updated successfully.",
      statusCode: StatusCodes.OK,
      data: filteredUser,
    });
  } catch (error) {
    console.log(error);
    return apiResponse({
      res,
      status: false,
      message: "Failed to update user profile.",
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
};

// ---- Delete User Account (Soft delete / permanently delete) -----
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isPermanentlyDelete } = req.body;

    const user = await userServices.findOne({ _id: userId });
    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
      });
    }

    if (isPermanentlyDelete) {
      await userServices.deleteOne({ _id: userId });
    } else {
      await userServices.findByIdAndUpdate(userId, { isDeleted: true });
    }

    return apiResponse({
      res,
      status: true,
      message: "Account deleted successfully",
      statusCode: StatusCodes.OK,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
    });
  }
};

// ---- Enable 2Factor authentication -----
const enable2fa = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ length: 20, name: config.appName });

    QRCode.toDataURL(secret.otpauth_url, async (err, data_url) => {
      if (data_url) {
        const imageUrl = await fileUploadService.handleFile( data_url, "twofactorqr" );
        const otpArray = helper.generateOTPArray(6, 5);

        await userServices.findByIdAndUpdate(req.user._id, {
          secretKey: secret.base32,
          twoFactorQr: imageUrl,
          isTwoFactorEnabled: true,
          recoveryCode: otpArray,
        });

        await emailService.sendEmail({
          to: req.user.email,
          subject:
            "Set Up Google Two-Step Authentication for Your VA-BOT Account",
          templateVariables: {
            username: req.user.username,
            twofactorqr: imageUrl,
          },
          filename: "qrcode.html",
        });

        return apiResponse({
          res,
          statusCode: StatusCodes.OK,
          message: "Two factor authenticate enable successfully",
          data: imageUrl,
        });
      }
    });
  } catch (error) {
    console.log(error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// ---- Disable 2Factor Authentication --------
const disable2fa = async (req, res) => {
  try {
    if (req.user.twoFactorQr) fileUploadService.deleteFile({ url: req.user.twoFactorQr });

    await userServices.findByIdAndUpdate(req.user._id, {
      secretKey: "",
      twoFactorQr: "",
      isTwoFactorEnabled: false,
      recoveryCode: [],
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Two factor authenticate disable successfully",
      data: null,
    });
  } catch (error) {
    console.log(error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// ----- Regenerate Recovery Code -----
const regenerateRecoveryCode = async (req, res) => {
  try {
    const otpArray = helper.generateOTPArray(6, 5);
    await userServices.findByIdAndUpdate(req.user._id, { recoveryCode: otpArray });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      message: "Regenerate Recovery Code successfully",
      data: otpArray,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// ----- Verify 2factor OTP -------
const verif2faOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    let isRecoveryCode = false;
    const isValidToken = speakeasy.totp.verify({
      secret: req.user.secretKey,
      encoding: "base32",
      token: otp,
    });

    if (!isValidToken) isRecoveryCode = req.user.recoveryCode.includes(Number(otp));

    if (isValidToken || isRecoveryCode) {
      const token = await helper.generateToken({ userId: req.user._id });
      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: "OTP verify successfully.",
        data: { isVerify: true, token },
      });
    } else {
      return apiResponse({
        res,
        status: false,
        message: "Invalid OTP",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// ---- Change Password --------
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    let user = await userServices.findOne({ _id: userId, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
        data: null,
      });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return apiResponse({
        res,
        status: false,
        message: "Old password is incorrect",
        statusCode: StatusCodes.UNAUTHORIZED,
        data: null,
      });
    }

    const hashNewPassword = await bcrypt.hash(newPassword, 10);

    await userServices.update({ _id: userId }, { password: hashNewPassword });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    console.error("Error in changePassword:", error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// ---- Recovery Email ------
const recoveryEmail = async (req, res) => {
  try {
    const data = req.body;
    const { otp, otpExpiresAt } = helper.generateOTP();
    const findUser = await userServices.findById(req.user.id);
    if(!findUser) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
        data: null,
      });
    }
    await emailService.sendOTPEmail({ email: data.backupEmail, otp, otpExpiresAt });

    await userServices.update(
      { email: req.user.email },
      { otp, otpExpiresAt, backupEmail: data.backupEmail, recoveryMethods: { isEmail: true } },
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Recovery email sent successfully",
      data: null,
    });
  } catch (error) {
    console.log(error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to send recovery email",
      data: null,
    })
  }
}

// ---- Recovery Mobile Number ----------------
const recoveryMobileNumber = async (req , res) => {
  try {
    const { otp, otpExpiresAt } = helper.generateOTP();

    const findOne = await userServices.findById(req.user.id);
    if(!findOne) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
        data: null,
      });
    }

    // await smsService.sendOTPSMS({mobileNumber: data.backupMobileNumber, otp, otpExpiresAt })

    await userServices.update(
      { _id: findOne._id },
      { otp, otpExpiresAt, backupMobileNumber : req.body.backupMobileNumber, backupCountryCode: req.body.backupCountryCode, recoveryMethods: {isPhone: true}  },
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "OTP sent to new mobile number.",
      data: null,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to send OTP",
      data: null,
    })
  }
}

// ----- Update Role By Admin --------
const updateRole = async (req, res) => {
  try {
    const {id} = req.params;
    const { role } = req.body;
    const findById = await userServices.findById(id);
    if(!findById) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
        data: null,
      });
    }
    const user = await userServices.findByIdAndUpdate(id, { role }, { new: true });
    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to update user role",
      data: null,
    })
  }
}

// ---- Update FCM Token -----
const updateFcmToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return apiResponse({
        res,
        status: false,
        message: "FCM token is required",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const updatedUser = await userServices.findByIdAndUpdate(userId, {
      fcmToken: fcmToken,
    });

    if (!updatedUser) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.NOT_FOUND,
        data: null,
      });
    }

    return apiResponse({
      res,
      status: true,
      message: "FCM token updated successfully",
      statusCode: StatusCodes.OK,
      data: null,
    });
  } catch (error) {
    console.error("Error updating FCM token:", error);
    return apiResponse({
      res,
      status: false,
      message: "Failed to update FCM token",
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  deleteAccount,
  enable2fa,
  disable2fa,
  regenerateRecoveryCode,
  verif2faOtp,
  changePassword,
  recoveryEmail,
  recoveryMobileNumber,
  updateRole,
  updateFcmToken
};
