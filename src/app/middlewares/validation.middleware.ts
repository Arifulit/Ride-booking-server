
import { ZodSchema } from "zod";
import ResponseUtils from "../utils/response";
import { Request, Response, NextFunction } from "express";

/**
 * Validate request body using Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      const errors = err.errors?.map((e: any) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : e.path,
        message: e.message,
      })) || [{ message: err.message }];
      ResponseUtils.error(res, "Validation failed", 400, errors);
    }
  };
};

/**
 * Validate request query parameters using Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err: any) {
      const errors = err.errors?.map((e: any) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : e.path,
        message: e.message,
      })) || [{ message: err.message }];
      ResponseUtils.error(res, "Query validation failed", 400, errors);
    }
  };
};

/**
 * Validate request parameters using Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err: any) {
      const errors = err.errors?.map((e: any) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : e.path,
        message: e.message,
      })) || [{ message: err.message }];
      ResponseUtils.error(res, "Parameter validation failed", 400, errors);
    }
  };
};

export default { validateBody, validateQuery, validateParams };