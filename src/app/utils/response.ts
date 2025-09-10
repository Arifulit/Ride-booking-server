import { Response } from "express";

class ResponseUtils {
  /**
   * Send success response
   */
  static success(
    res: Response,
    data: any = null,
    message: string = "Success",
    statusCode: number = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string = "Internal Server Error",
    statusCode: number = 500,
    errors: any = null
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors || null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send paginated response
   */
  static paginated(
    res: Response,
    data: any,
    pagination: any,
    message: string = "Data retrieved successfully"
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }
}

export default {
  error: ResponseUtils.error,
  success: ResponseUtils.success,
  paginated: ResponseUtils.paginated,
  // ...other functions if any
};