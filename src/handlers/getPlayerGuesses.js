const { getLatestGuessForPlayer } = require('../utils/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { isValidUUID } = require('../utils/validation');
const { formatGuessForResponse } = require('../utils/guess');

/**
 * Lambda handler for getting player latest guesses
 * GET /api/guesses/{userId}
 * Response: { "latestGuesses": [...] }
 */
exports.handler = async (event) => {
  console.log('Get Player Guesses Event:', JSON.stringify(event, null, 2));

  try {
    // Extract userId from path parameters
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse('User ID is required', 400, 'MISSING_USER_ID');
    }

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return errorResponse('Invalid user ID format', 400, 'INVALID_USER_ID');
    }

    // Get latest guess for the player and current Bitcoin price in parallel
    const latestGuesses = await getLatestGuessForPlayer(userId, 5);

    // Prepare response data
    const responseData = {
      latestGuesses: latestGuesses && latestGuesses.length > 0 && latestGuesses.map(formatGuessForResponse) || []
    };

    console.log('Player latest guesses retrieved successfully:', userId);

    // Return success response
    return successResponse(responseData, 200);

  } catch (error) {
    console.error('Error getting player latest guesses:', error);

    // Handle DynamoDB errors
    if (error.code && error.code.startsWith('Dynamo')) {
      return errorResponse('Database error occurred', 500, 'DATABASE_ERROR');
    }

    // Generic server error
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
