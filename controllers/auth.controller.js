import bcrypt from "bcrypt";
import { apiResponse } from "../helper/api-response.helper.js";
import enums from "../config/enum.config.js";
import config from "../config/config.js";
import helper from "../helper/common.helper.js";
import { StatusCodes } from "http-status-codes";
import userService from "../services/user.service.js";
import emailService from "../services/email.service.js";
import jwt from "jsonwebtoken";
import firebaseAdmin from "firebase-admin";
import User from "../models/user.model.js";
import { OAuth2Client } from "google-auth-library";

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert({
    type: "service_account",
    project_id: "flutterrepomodule",
    private_key_id: "b00bb829e88bb3f9b07ac48266c7bbe42c1de1a4",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpgmp2v2J6YbxR\nDI4cXyWnId6V5jZ2Y75qRc//Px/1XXF+iqb2rsHta5u3uVuyYrdUlLSfSrNL4nls\nGP7rbOtViSqJRkBCs7kXzklJahgXmPWtYdYmtt38BwQws0TRHaL9nmwMhYRXWt87\nR6ExmrT9Nf6VrE7yiF/xXLdSvnhDrn4Pug5Y1ftqkepN+Goz0sblyJCgv68boEuA\niZcvu9XWhwyXNFEfTTQv4DLDTYP4VHHuL1QdtixDskS0wH1NV41KOEMoDGpOuM2n\nqFygKNJVhyHWyF3HJejvJNQtE/TypS5ArIHbudMasHCttz7l5Ulq4+4IGierCKk0\nals8YgRbAgMBAAECggEAAZQ77qhAwBgZ+31M85m1TZXEr4vJ9RdfxjipQ9zwLMZ2\nkLG09XZSSyZl+HOrFYHS6GBMQHGfMvVEoUuoUEQe+xiAg2/amGR5NG4RA7SPzeR4\nYWmYZ5rrfXYJRXTeDr6ibo9jvUgfH/syOiikKUSiK/utR/Knd53qmuJ8uLIah7Lc\nCymJhCoqIItOLsWe+NkCrmnP24pNE1etalUYhoRGKX/LY1VTJwGr4HBSQDGXZ+SV\nZen4tVs3gwDmQUN5xHdSdmMBI/a/M8iT8x7lEQ90oYrk2FMl4s/66lQFEBUAN90t\nKnkvKvnJgbT9CDxyjtQlAkWvPCEEj32vQyUocuye3QKBgQDSYgB3qE26BDtpoVEM\ngNgf/Vt1ZXv/IhkkBgtkm+HvnTgQK+nBfcFfklc1KAWUJWn+5PsSCrt2SiDOprbx\n+XLpdXvkL+pQKWBDsSepe7pyE28FQKridAO8evHOcgNniSyPG2uFERmxRKPHfY9R\nwTzK0ZM+VP+dAv2+m41pnR0GjwKBgQDOQ5navuxaQySB5mTM1ZS+NmySzVV11mhv\nY6KHccKNNi6JDNpljytvF3oGZ/q9F3r+4g01kQTUflKpxgaYj5wgSLGqq9zX4RZl\nm5LcrLQdKpnw4m+U652SAwIBtFQl5QHwbrL8ThqVXRNFFYmBredAkrwIC+U1HBgE\n4GRY87wrdQKBgFFYS0346XTPRhmloizvdKGJ2N8fij4v9QCUxbr0+vsnExJNqGiE\nM0y8zLNk8iNCBCXma52iQLGQH/dHRt1w0hmqr2ifjj3Igcwqp2dEy+Zn1Tl2s5wz\nt24dK3njY6WYyH3c4EnnPsPoAluUFOJLkTHqrsAfJWaUTYBxrM/1S8/JAoGBAJZQ\njX7sRDJDXAeOb0cXHx6/asBRA0asyc7jPT6XmMBwC9m0lDQO8ggzg6nHfOLwiaHV\n+upelLaGmJdAyO3FOnIMh+1o8bghQMErbwuCkH/w297AJbDRRDN0HbJASFKVYaRm\nB+n2wUi4W6Ks31ix8yULyhvTD2Z04swq+vYYKblBAoGBALWU0C5/cgO5OA+QatWg\n1l95CVjNse1tfz/PfGQygN0mEJ6fcaLv2uSDcfdK8bYzUDrfQb2KnmgMc9qtxzLV\nCkK6qzGhx8bh9RxlB5Oh7sJ81HsV5o6muEsfqTWpmuCaOuV6Awq9Hb+P5V4uzkA3\nuL7Y2+bxKlcd36aOTsOZhuZH\n-----END PRIVATE KEY-----\n",
    client_email:
      "firebase-adminsdk-fbsvc@flutterrepomodule.iam.gserviceaccount.com",
    client_id: "111337120115631152596",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40flutterrepomodule.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  }),
});

// For verify token
const verifyToken = async (req, res) => {
  try {
    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      message: "Token is verify successfully.",
      status: true,
      data: null,
    });
  } catch (error) {
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      status: false,
      data: null,
    });
  }
};

// For email registration
const registerByEmail = async (req, res) => {
  try {
    const { email, password, username, deviceId } = req.body;

    let user = await userService.findOne({ email, isDeleted: false }, true);

    const { otp, otpExpiresAt } = helper.generateOTP();
    await emailService.sendOTPEmail({ email, otp, otpExpiresAt });

    if (user) {
      if (user.isVerified) {
        return apiResponse({
          res,
          status: false,
          message: "Email ID already in use",
          statusCode: StatusCodes.BAD_REQUEST,
          data: null,
        });
      } else {
        const updateData = { otp, otpExpiresAt };
        if (deviceId) updateData.deviceId = deviceId;
        await userService.update(user._id, updateData);
      }
    } else {
      const hashPassword = await bcrypt.hash(password, 10);
      const newUser = {
        email,
        password: hashPassword,
        provider: enums.authProviderEnum.EMAIL,
        otp,
        otpExpiresAt,
        username,
        isVerified: false,
      };
      if (deviceId) newUser.deviceId = deviceId;

      await userService.create(newUser);
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.CREATED,
      status: true,
      message:
        "Registration complete! Check your email for the verification OTP",
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

// For mobile registration
const registerByMobile = async (req, res) => {
  try {
    const { mobileNumber, password, username, deviceId } = req.body;

    let user = await userService.findOne(
      { mobileNumber, isDeleted: false },
      true
    );

    const { otp, otpExpiresAt } = helper.generateOTP();
    // await smsService.sendOTPSMS({ mobileNumber, otp });

    if (user) {
      if (!user.isVerified) {
        return apiResponse({
          res,
          status: false,
          message: "Please verify your mobile number",
          statusCode: StatusCodes.BAD_REQUEST,
          data: null,
        });
      } else {
        const updateData = { otp, otpExpiresAt };
        if (deviceId) updateData.deviceId = deviceId;
        await userService.update(user._id, updateData);
      }
    } else {
      const hashPassword = await bcrypt.hash(password, 10);
      const newUser = {
        email: null,
        mobileNumber,
        password: hashPassword,
        provider: enums.authProviderEnum.EMAIL,
        otp,
        otpExpiresAt,
        username,
        isVerified: false,
      };
      if (deviceId) newUser.deviceId = deviceId;

      await userService.create(newUser);
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.CREATED,
      status: true,
      message: "Registration complete! Check your SMS for the verification OTP",
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

// For verify email otp
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    let user = await userService.findOne({ email, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid email or user does not exist",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return apiResponse({
        res,
        status: false,
        message: "OTP has expired",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (user.otp !== otp) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid OTP",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (user.backupEmail != null) {
      await userService.update(
        { email, isDeleted: false },
        {
          otp: null,
          otpExpiresAt: null,
          isVerified: true,
          otpVerified: true,
          email: user.backupEmail,
          backupEmail: null,
          recoveryMethods: { isEmail: false },
        }
      );
    } else {
      await userService.update(
        { email, isDeleted: false },
        { otp: null, otpExpiresAt: null, isVerified: true, otpVerified: true }
      );
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      config.jwt.secretKey,
      {
        expiresIn: config.jwt.expiresIn || "7days",
      }
    );

    const {
      password: _,
      otp: __,
      otpExpiresAt: ___,
      expiresIn: ____,
      secretKey: _____,
      recoveryCode: ______,
      ...userWithoutSensitiveInfo
    } = user.toObject();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "OTP verified successfully!",
      data: {
        token,
        user: userWithoutSensitiveInfo,
      },
    });
  } catch (error) {
    console.error("Error in verifyOTP:", error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// For verify mobile otp
const verifyMobileOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    let user = await userService.findOne({ mobileNumber, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid mobileNumber or user does not exist",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return apiResponse({
        res,
        status: false,
        message: "OTP has expired",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (user.otp !== otp) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid OTP",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (user.backupMobileNumber != null) {
      await userService.update(
        { mobileNumber, isDeleted: false },
        {
          otp: null,
          otpExpiresAt: null,
          isVerified: true,
          otpVerified: true,
          mobileNumber: user.backupMobileNumber,
          backupMobileNumber: null,
          countryCode: user.backupCountryCode,
          backupCountryCode: null,
          recoveryMethods: { isPhone: false },
        }
      );
    } else {
      await userService.update(
        { mobileNumber, isDeleted: false },
        { otp: null, otpExpiresAt: null, isVerified: true, otpVerified: true }
      );
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "OTP verified successfully!",
      data: null,
    });
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// For resend back-up mobile otp
const resendMobileOtp = async (req, res) => {
  try {
    const { type, mobileNumber } = req.body;

    if (!["mobileNumber", "backupMobileNumber"].includes(type)) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid type. Use 'mobileNumber' or 'backupMobileNumber'.",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    let user = await userService.findOne({
      [type]: mobileNumber,
      isDeleted: false,
    });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: `User with this ${type} does not exist.`,
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const { otp, otpExpiresAt } = helper.generateOTP();

    // await smsService.sendOTPSMS({ mobileNumber, otp });

    await userService.update(
      { [type]: mobileNumber, isDeleted: false },
      { otp, otpExpiresAt }
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: `OTP has been resent successfully to ${type}!`,
      data: null,
    });
  } catch (error) {
    console.error("Error in resendEmailOtp:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// For resend email otp
const resendEmailOtp = async (req, res) => {
  try {
    const { email, type } = req.body; // `type` can be 'email' or 'backupEmail'

    if (!type || (type !== "email" && type !== "backupEmail")) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid type. Use 'email' or 'backupEmail'",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    let user = await userService.findOne({ [type]: email, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User does not exist",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const { otp, otpExpiresAt } = helper.generateOTP();

    await emailService.sendOTPEmail({ email, otp, otpExpiresAt });

    await userService.update(
      { [type]: email, isDeleted: false },
      { otp, otpExpiresAt }
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: `OTP has been resent successfully to ${type}!`,
      data: null,
    });
  } catch (error) {
    console.error("Error in resendEmailOtp:", error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// For email login
const loginByEmail = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    let user = await userService.findOne({ email, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid email or user does not exist",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (!user.isVerified) {
      return apiResponse({
        res,
        status: false,
        message: "Please first verify OTP to activate your account",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid password",
        statusCode: StatusCodes.UNAUTHORIZED,
        data: null,
      });
    }

    // Update deviceId if provided
    if (deviceId) {
      await userService.update(user._id, { deviceId });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      config.jwt.secretKey,
      {
        expiresIn: config.jwt.expiresIn || "7days",
      }
    );

    const {
      password: _,
      otp: __,
      otpExpiresAt: ___,
      expiresIn: ____,
      secretKey: _____,
      recoveryCode: ______,
      ...userWithoutSensitiveInfo
    } = user.toObject();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Login successful",
      data: {
        token,
        user: userWithoutSensitiveInfo, // Send the modified user object without sensitive fields
      },
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

// For mobile login
const loginByMobile = async (req, res) => {
  try {
    const { mobileNumber, password, deviceId } = req.body;

    let user = await userService.findOne({ mobileNumber, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid mobile number or user does not exist",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (!user.isVerified) {
      return apiResponse({
        res,
        status: false,
        message: "Please first verify OTP to activate your account",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid password",
        statusCode: StatusCodes.UNAUTHORIZED,
        data: null,
      });
    }

    // Update deviceId if provided
    if (deviceId) {
      await userService.update(user._id, { deviceId });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      config.jwt.secretKey,
      {
        expiresIn: config.jwt.expiresIn || "7days",
      }
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Login successful",
      data: {
        token,
        user,
      },
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

// For forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let user = await userService.findOne({ email, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const { otp, otpExpiresAt } = helper.generateOTP();

    await emailService.sendOTPEmail({ email, otp });
    await userService.update(user._id, { otp, otpExpiresAt });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "OTP sent successfully!",
      data: null,
    });
  } catch (error) {
    console.error("Error in forgotOtp:", error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// For reset password
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    let user = await userService.findOne({ email, isDeleted: false });

    if (!user) {
      return apiResponse({
        res,
        status: false,
        message: "User not found",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    if (!user.otpVerified) {
      return apiResponse({
        res,
        status: false,
        message: "Please verify OTP before resetting password",
        statusCode: StatusCodes.BAD_REQUEST,
        data: null,
      });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    await userService.update(
      { email },
      { password: hashPassword, otpVerified: false }
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Password reset successfully!",
      data: null,
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// For google login/registration
const loginByGoogle = async (req, res) => {
  try {
    const { idToken, deviceId } = req.body;

    if (!idToken) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "ID token is required",
      });
    }

    const client = new OAuth2Client({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUrl,
    });

    const ticket = await client.verifyIdToken({
      idToken: idToken,
    });

    const { email, sub: googleId, picture } = ticket.getPayload();
    if (!email || !googleId) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        message: "Invalid token or payload.",
      });
    }

    const username = email.split("@")[0].replace(".", " ");
    let user;

    // ✅ If no user found check by email
    if (!user) {
      user = await User.findOne({ email, isVerified: true, isDeleted: false });

      if (!user) {
        const newUserData = {
          email: email,
          username: username,
          password: null,
          profileImage: picture,
          provider: enums.authProviderEnum.GOOGLE,
          providerId: googleId,
          role: enums.userRoleEnum.USER,
          isVerified: true,
        };
        if (deviceId) newUserData.deviceId = deviceId;
        user = await User.create(newUserData);
      } else {
        user.providerId = googleId;
        user.provider = enums.authProviderEnum.GOOGLE;
        user.password = null;
        if (deviceId) user.deviceId = deviceId;
        await user.save();
      }
    }

    // 🔐 Generate token
    const generatedToken = await helper.generateToken({ userId: user._id });

    const {
      password: _,
      otp: __,
      otpExpiresAt: ___,
      expiresIn: ____,
      secretKey: _____,
      recoveryCode: ______,
      ...userWithoutSensitiveInfo
    } = user.toObject();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      data: {
        token: generatedToken,
        user: userWithoutSensitiveInfo,
      },
      message: "User logged in successfully",
    });
  } catch (error) {
    console.log(error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Token is expired or invalid.",
    });
  }
};

// For apple login/registration
const loginByApple = async (req, res) => {
  try {
    const { idToken, deviceId } = req.body;

    if (!idToken) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "ID token is required",
      });
    }

    // ✅ Verify the Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    if (!decodedToken) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        message: "Invalid authentication token",
      });
    }

    const { email, uid: appleId, picture } = decodedToken;
    let user;

    // ✅ Fallback: no matching deviceId, use email logic
    if (!user) {
      user = await User.findOne({ email, isVerified: true, isDeleted: false });

      if (!user) {
        const newUserData = {
          email: email,
          username: email?.split("@")[0]?.replace(".", " ") || "apple_user",
          password: null,
          profileImage: picture || null,
          provider: enums.authProviderEnum.APPLE,
          providerId: appleId,
          role: enums.userRoleEnum.USER,
          isVerified: true,
        };
        if (deviceId) newUserData.deviceId = deviceId;
        user = await User.create(newUserData);
      } else {
        user.providerId = appleId;
        user.provider = enums.authProviderEnum.APPLE;
        user.password = null;
        if (deviceId) user.deviceId = deviceId;
        await user.save();
      }
    }

    // 🔐 Generate token
    const generatedToken = await helper.generateToken({ userId: user._id });

    const {
      password: _,
      otp: __,
      otpExpiresAt: ___,
      expiresIn: ____,
      secretKey: _____,
      recoveryCode: ______,
      ...userWithoutSensitiveInfo
    } = user.toObject();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      data: {
        token: generatedToken,
        user: userWithoutSensitiveInfo,
      },
      message: "User logged in successfully",
    });
  } catch (error) {
    console.error("Error verifying token:", error.message);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Token is expired or invalid.",
    });
  }
};

// For guest login
const guestLogin = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Device ID is required",
        data: null,
      });
    }

    // Find real user (non-demo) with this deviceId
    const realUser = await User.findOne({
      isDemo: false,
      deviceId,
      isDeleted: false,
    });

    if (realUser) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `User email ${realUser.email} already in use`,
        data: null,
      });
    }

    // Find or create demo user
    let user = await User.findOne({ deviceId, isDemo: true, isDeleted: false });

    if (!user) {
      const generateShortId = helper.createId({ length: 16 });
      const email = `${generateShortId}@selfie.app`;
      const username = generateShortId;

      user = await User.create({
        deviceId,
        isDemo: true,
        email,
        username,
        isVerified: true,
        role: enums.userRoleEnum.USER,
        provider: enums.authProviderEnum.EMAIL,
      });
    }

    // Get user data without sensitive fields
    const result = await User.findById(user._id)
      .select("-password -otp -otpExpiresAt -secretKey -recoveryCode")
      .lean();

    // Generate token
    const token = await helper.generateToken({
      userId: user._id,
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Successfully logged in as guest",
      data: {
        token,
        ...result,
      },
    });
  } catch (error) {
    console.error("guestLogin error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

export default {
  verifyToken,
  registerByEmail,
  loginByEmail,
  forgotPassword,
  verifyEmailOtp,
  verifyMobileOtp,
  resendEmailOtp,
  resendMobileOtp,
  verifyToken,
  resetPassword,
  loginByGoogle,
  loginByApple,
  registerByMobile,
  loginByMobile,
  guestLogin,
};
