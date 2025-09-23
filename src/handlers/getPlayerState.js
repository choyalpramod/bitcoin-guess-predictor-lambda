const { getPlayerById, getLatestGuessForPlayer, updatePlayerLastActive } = require('../utils/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { isValidUUID } = require('../utils/validation');
const { getCachedBitcoinPrice } = require('../utils/bitcoin');
const { formatGuessForResponse } = require('../utils/guess');

/**
 * Lambda handler for getting player state including score, latest guess, and current BTC price
 * GET /api/player/{userId}
 * Response: { "score": number, "latestGuess": { ... }, "currentPrice": number }
 */
exports.handler = async (event) => {
  console.log('Get Player State Event:', JSON.stringify(event, null, 2));

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

    // Get player from DynamoDB
    const player = await getPlayerById(userId);

    if (!player) {
      return errorResponse('Player not found', 404, 'PLAYER_NOT_FOUND');
    }

    // Get latest guess for the player and current Bitcoin price in parallel
    const [latestGuess, bitcoinPriceData] = await Promise.all([
      getLatestGuessForPlayer(userId),
      getCachedBitcoinPrice()
    ]);

    // Update last active timestamp (non-blocking)
    updatePlayerLastActive(userId)
      .then(() => console.log('Player last active updated:', userId))
      .catch((updateError) => console.warn('Failed to update last active timestamp:', updateError));

    // Prepare response data
    const responseData = {
      score: player.score,
      currentPrice: bitcoinPriceData.price
    };

    const firstGuess = latestGuess && latestGuess.length > 0 && latestGuess[0];
    if (firstGuess) {
      responseData.latestGuess = formatGuessForResponse(firstGuess);
    } else {
      responseData.latestGuess = null;
    }

    console.log('Player state retrieved successfully:', userId);

    // Return success response
    return successResponse(responseData, 200);

  } catch (error) {
    console.error('Error getting player state:', error);

    // Handle DynamoDB errors
    if (error.code && error.code.startsWith('Dynamo')) {
      return errorResponse('Database error occurred', 500, 'DATABASE_ERROR');
    }

    // Generic server error
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
