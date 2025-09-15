import { Request, Response, NextFunction } from "express";
import ResponseUtils from "../utils/response";

/**
 * Handle 404 Not Found errors
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  ResponseUtils.error(res, `Route ${req.originalUrl} not found`, 404);
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
    ResponseUtils.error(res, "Validation failed", 400, errors);
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    ResponseUtils.error(res, `${field} already exists`, 409);
    return;
  }

  // Mongoose cast error
  if (err.name === "CastError") {
    ResponseUtils.error(res, "Invalid ID format", 400);
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    ResponseUtils.error(res, "Invalid token", 401);
    return;
  }

  if (err.name === "TokenExpiredError") {
    ResponseUtils.error(res, "Token expired", 401);
    return;
  }

  // Default server error
  ResponseUtils.error(
    res,
    err.message || "Internal Server Error",
    err.statusCode || 500
  );
};