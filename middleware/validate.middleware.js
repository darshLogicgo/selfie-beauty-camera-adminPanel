import Joi from "joi";
import { StatusCodes } from "http-status-codes";
import { validateResponse } from "../helper/api-response.helper.js";

/**
 * Picks specific keys from an object
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

/**
 * Get first required key from Joi schema
 */
const getFirstRequiredFieldName = (schemaObj) => {
  if (!schemaObj || typeof schemaObj.describe !== "function") return null;
  const desc = schemaObj.describe();

  if (desc.type === "object" && desc.keys) {
    for (const key in desc.keys) {
      const field = desc.keys[key];
      if (field?.flags?.presence === "required") {
        return key; // Return the first required field
      }
    }
  }

  return null;
};

/**
 * Middleware to validate request data, including `multipart/form-data`
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ["params", "query", "body", "files"]);

  if (req.file) {
    req.files = { agreementUrl: req.file };
  }
  if (!req.files) req.files = {};

  // Ensure req.body exists (multer should populate it for form-data)
  if (!req.body) req.body = {};
  // Ensure req.query exists
  if (!req.query) req.query = {};

  const object = pick(req, Object.keys(validSchema));

  // Skip empty check if we have any schema defined - let Joi handle the validation
  // This is important for:
  // - form-data requests where multer has already processed the body
  // - GET requests with optional query parameters
  // - requests with optional params
  // Also check if we have files, which indicates form-data was sent
  if (
    validSchema.body ||
    validSchema.query ||
    validSchema.params ||
    (req.files && Object.keys(req.files).length > 0)
  ) {
    // If any schema exists OR files are present, skip the empty check and let Joi validate
    // This allows Joi to provide proper error messages
  } else {
    // Only check for empty input if there's no schema defined
    const isEmptyInput = ["params", "query", "body", "files"].every((key) => {
      return (
        !object[key] ||
        (typeof object[key] === "object" &&
          Object.keys(object[key]).length === 0)
      );
    });

    if (isEmptyInput) {
      // Check first required key in priority order
      const firstRequiredField =
        getFirstRequiredFieldName(schema.body) ||
        getFirstRequiredFieldName(schema.params) ||
        getFirstRequiredFieldName(schema.query) ||
        getFirstRequiredFieldName(schema.files);

      const message = firstRequiredField
        ? `${firstRequiredField} is required.`
        : "Please fill in at least one of the required fields: params, query, body, or files.";

      return validateResponse({
        res,
        error: { message },
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }
  }

  // Special handling for manageAssetSchema: allow files OR body fields
  // Check if this is manageAssetSchema by looking for addUrl/removeUrl in body schema
  // These fields are unique to manageAssetSchema
  const isManageAssetSchema =
    validSchema.files &&
    validSchema.body &&
    (() => {
      try {
        const bodyDesc = validSchema.body.describe();
        return (
          bodyDesc.keys &&
          (bodyDesc.keys.addUrl !== undefined ||
            bodyDesc.keys.removeUrl !== undefined ||
            bodyDesc.keys.removeUrls !== undefined)
        );
      } catch {
        return false;
      }
    })();
  let validationError = null;

  if (isManageAssetSchema) {
    // Check if files are present
    const hasFiles =
      req.files?.asset_images &&
      Array.isArray(req.files.asset_images) &&
      req.files.asset_images.length > 0;
    const hasBodyFields =
      req.body?.addUrl ||
      req.body?.removeUrl ||
      (req.body?.removeUrls &&
        Array.isArray(req.body.removeUrls) &&
        req.body.removeUrls.length > 0);

    // If neither files nor body fields are present, create custom error
    if (!hasFiles && !hasBodyFields) {
      validationError = {
        details: [
          {
            message:
              "Please provide either file uploads (asset_images), addUrl, removeUrl, or removeUrls",
            path: ["body"],
          },
        ],
      };
    } else {
      // Validate normally if files or body fields are present
      const { value, error } = Joi.compile(validSchema)
        .prefs({ errors: { label: "key" }, abortEarly: false })
        .validate(object);

      if (error) {
        validationError = error;
      } else {
        // Assign validated values
        if (validSchema.body && value.body !== undefined) {
          req.body = value.body;
        }
        if (validSchema.params && value.params !== undefined) {
          req.params = value.params;
        }
        if (validSchema.query && value.query !== undefined) {
          req.query = value.query;
        }
        if (validSchema.files && value.files !== undefined) {
          req.files = value.files;
        }
        return next();
      }
    }
  } else {
    // Normal validation for other schemas
    const { value, error } = Joi.compile(validSchema)
      .prefs({ errors: { label: "key" }, abortEarly: false })
      .validate(object);

    if (error) {
      validationError = error;
    } else {
      // Assign validated values
      if (validSchema.body && value.body !== undefined) {
        req.body = value.body;
      }
      if (validSchema.params && value.params !== undefined) {
        req.params = value.params;
      }
      if (validSchema.query && value.query !== undefined) {
        req.query = value.query;
      }
      if (validSchema.files && value.files !== undefined) {
        req.files = value.files;
      }
      return next();
    }
  }

  if (validationError) {
    return validateResponse({
      res,
      error: validationError,
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }

  // This should never be reached, but keeping as fallback
  return next();
};

export default validate;
