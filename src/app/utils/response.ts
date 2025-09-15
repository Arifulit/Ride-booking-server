import { Response } from "express";

/**
 * Send success response
 */
const success = (
  res: Response,
  data: any = null,
  message: string = "Success",
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send error response
 */
const error = (
  res: Response,
  message: string = "Internal Server Error",
  statusCode: number = 500,
  errors: any = null
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    errors: errors || null,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send paginated response
 */
const paginated = (
  res: Response,
  data: any,
  pagination: any,
  message: string = "Data retrieved successfully"
): void => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

const ResponseUtils = {
  error,
  success,
  paginated,
};

export default ResponseUtils;