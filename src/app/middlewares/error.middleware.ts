/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from "express";
import ResponseUtils from "../utils/response";

/**
 * Handle 404 Not Found errors
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  return ResponseUtils.error(res, `Route ${req.originalUrl} not found`, 404);
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
    return ResponseUtils.error(res, "Validation failed", 400, errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ResponseUtils.error(res, `${field} already exists`, 409);
  }

  // Mongoose cast error
  if (err.name === "CastError") {
    return ResponseUtils.error(res, "Invalid ID format", 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return ResponseUtils.error(res, "Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    return ResponseUtils.error(res, "Token expired", 401);
  }

  // Default server error
  return ResponseUtils.error(
    res,
    err.message || "Internal Server Error",
    err.statusCode || 500
  );
};
