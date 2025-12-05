import { StatusCodes, getReasonPhrase } from "http-status-codes";

export const apiResponse = ({
  res,
  error,
  statusCode,
  message = null,
  data,
  pagination,
  ...options
}) => {
  const responseData = data ? data : null;
  const status =
    statusCode || error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const msg = message || error?.message || getReasonPhrase(status);
  return res
    .status(status)
    .json({ message: msg, error, pagination, data: responseData, ...options });
};

export const parseJoiError = (error) => {
  const errors = {};

  error.details.forEach((detail) => {
    errors[detail.context.key] = detail.message.replace(/['"]/g, "");
  });

  return errors;
};

export const validateResponse = ({
  res,
  error,
  statusCode = StatusCodes.BAD_REQUEST,
}) => {
  let responseObj = { status: false };
  if (error.details && error.details.length > 0) {
    const firstError = error.details[0];
    responseObj.message = firstError.message.replace(/['"]/g, "");
  } else {
    responseObj.message = error.message.replace(/['"]/g, "");
  }
  return res.status(statusCode).json(responseObj);
};
