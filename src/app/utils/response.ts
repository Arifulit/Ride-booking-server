class ResponseUtils {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  // Bangla: success method er data parameter er type any kora hoise, jate object, array, null, sob kichu pathano jay
  static success(res: any, data: any = null, message: string = "Success", statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} errors - Validation errors
   */
  static error(
    res: any,
    message: string = "Internal Server Error",
    statusCode: number = 500,
    errors: any = null // Accepts array, object, or null
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   */
  // Bangla: paginated method er parameter gulo type any kora hoise, jate kono type error na thake
  static paginated(res: any, data: any, pagination: any, message: string = "Data retrieved successfully") {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
}

export default ResponseUtils;