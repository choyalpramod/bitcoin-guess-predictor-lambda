/**
 * Create a standardized HTTP response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body object
 * @param {Object} headers - Additional headers (optional)
 * @returns {Object} - Lambda HTTP response object
 */
const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
};

/**
 * Create a success response
 * @param {Object} data - Success data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} - Lambda HTTP response object
 */
const successResponse = (data, statusCode = 200) => {
  return createResponse(statusCode, {
    success: true,
    data
  });
};

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {string} errorCode - Optional error code
 * @returns {Object} - Lambda HTTP response object
 */
const errorResponse = (message, statusCode = 400, errorCode = null) => {
  const body = {
    success: false,
    error: {
      message
    }
  };

  if (errorCode) {
    body.error.code = errorCode;
  }

  return createResponse(statusCode, body);
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse
};
