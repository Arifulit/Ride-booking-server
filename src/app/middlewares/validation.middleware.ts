
// Zod library import
import { z, ZodSchema } from "zod";
// ResponseUtils import
import ResponseUtils from "../utils/response";

import { Request, Response, NextFunction } from "express";

/**
 * Validate request body using Zod schema
 * @param {Object} schema - Zod validation schema
 */

// Body validation middleware
// Bangla: ei function ta request body ke Zod schema diye validate kore
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      // Bangla: error gulo format kore response pathano hocche
      const errors = err.errors?.map((e: any) => ({
        field: e.path.join("."),
        message: e.message
      })) || [{ message: err.message }];
      return ResponseUtils.error(res, "Validation failed", 400, errors);
    }
  };
};

/**
 * Validate request query parameters using Zod schema
 * @param {Object} schema - Zod validation schema
 */

// Query validation middleware
// Bangla: ei function ta request query ke Zod schema diye validate kore
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any; // Type assertion to fix ParsedQs error
      next();
    } catch (err: any) {
      // Bangla: error gulo format kore response pathano hocche
      const errors = err.errors?.map((e: any) => ({
        field: e.path.join("."),
        message: e.message
      })) || [{ message: err.message }];
      return ResponseUtils.error(res, "Query validation failed", 400, errors);
    }
  };
};

/**
 * Validate request parameters using Zod schema
 * @param {Object} schema - Zod validation schema
 */

// Params validation middleware
// Bangla: ei function ta request params ke Zod schema diye validate kore
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any; // Type assertion to fix ParamsDictionary error
      next();
    } catch (err: any) {
      // Bangla: error gulo format kore response pathano hocche
      const errors = err.errors?.map((e: any) => ({
        field: e.path.join("."),
        message: e.message
      })) || [{ message: err.message }];
      return ResponseUtils.error(res, "Parameter validation failed", 400, errors);
    }
  };
};

// Bangla: sob middleware export kora hocche
// Exporting all validation middlewares
export default { validateBody, validateQuery, validateParams };