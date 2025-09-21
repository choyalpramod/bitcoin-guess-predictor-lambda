const { getGuessById, updateGuessResolution, updatePlayerScore } = require('../utils/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { getBitcoinPriceWithFallback } = require('../utils/bitcoin');
const {
  EVENTBRIDGE_CONFIG,
  GUESS_STATUS,
  GUESS_DIRECTION,
  SCORE_CHANGES,
  RESPONSE_MESSAGES,
  ERROR_MESSAGES,
  ERROR_CODES,
  HTTP_STATUS
} = require('../config/constants');

/**
 * Lambda handler for resolving a guess
 * Can be triggered by:
 * 1. EventBridge event (scheduled after 60 seconds)
 * 2. HTTP POST /api/resolve (for testing/manual resolution)
 * 
 * Input: { "guessId": "uuid", "userId": "uuid" }
 * Output: { "message": "Guess resolved", "result": "win", "newScore": number }
 */
exports.handler = async (event) => {
  console.log('Resolve Guess Event:', JSON.stringify(event, null, 2));

  try {
    let guessId, userId;

    // Handle different event sources
    if (event.source === EVENTBRIDGE_CONFIG.SOURCE && event['detail-type'] === EVENTBRIDGE_CONFIG.DETAIL_TYPES.RESOLVE_GUESS) {
      // EventBridge event
      console.log('Processing EventBridge event');
      guessId = event.detail.guessId;
      userId = event.detail.playerId;
    } else if (event.body) {
      // HTTP API event
      console.log('Processing HTTP API event');
      try {
        const body = JSON.parse(event.body);
        guessId = body.guessId;
        userId = body.userId;
      } catch (parseError) {
        console.error('Invalid JSON in request body:', parseError);
        return errorResponse(ERROR_MESSAGES.INVALID_JSON, HTTP_STATUS.BAD_REQUEST);
      }
    } else {
      console.error('Invalid event format:', event);
      return errorResponse(ERROR_MESSAGES.INVALID_EVENT, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_EVENT);
    }

    // Validate required parameters
    if (!guessId || !userId) {
      return errorResponse(ERROR_MESSAGES.MISSING_PARAMETERS, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.MISSING_PARAMETERS);
    }

    console.log('Resolving guess:', { guessId, userId });

    // Get the guess from DynamoDB
    const guess = await getGuessById(guessId);
    if (!guess) {
      return errorResponse(ERROR_MESSAGES.GUESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_CODES.GUESS_NOT_FOUND);
    }

    // Check if guess belongs to the specified user
    if (guess.playerId !== userId) {
      return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN, ERROR_CODES.UNAUTHORIZED);
    }

    // Check if guess is already resolved
    if (guess.status !== GUESS_STATUS.ACTIVE) {
      console.log('Guess already resolved:', guess.status);
      return successResponse({
        message: RESPONSE_MESSAGES.GUESS_ALREADY_RESOLVED,
        result: guess.status === GUESS_STATUS.WON ? 'win' : 'loss',
        alreadyResolved: true
      });
    }

    // Get current Bitcoin price
    const currentPrice = await getBitcoinPriceWithFallback();
    console.log('Price comparison:', {
      initialPrice: guess.currentPrice,
      currentPrice: currentPrice,
      direction: guess.direction
    });

    // Determine if guess was correct
    const priceWentUp = currentPrice > guess.currentPrice;
    const guessWasCorrect = (guess.direction === GUESS_DIRECTION.UP && priceWentUp) ||
                           (guess.direction === GUESS_DIRECTION.DOWN && !priceWentUp);

    const result = guessWasCorrect ? 'win' : 'loss';
    const status = guessWasCorrect ? GUESS_STATUS.WON : GUESS_STATUS.LOST;
    const scoreChange = guessWasCorrect ? SCORE_CHANGES.WIN : SCORE_CHANGES.LOSS;

    console.log('Guess resolution:', {
      guessWasCorrect,
      result,
      scoreChange
    });

    // Update guess status and player score in parallel
    const [updatedGuess, updatedPlayer] = await Promise.all([
      updateGuessResolution(guessId, status, currentPrice),
      updatePlayerScore(userId, scoreChange)
    ]);

    console.log('Guess resolved successfully:', {
      guessId,
      result,
      newScore: updatedPlayer.score
    });

    // Return success response
    return successResponse({
      message: RESPONSE_MESSAGES.GUESS_RESOLVED,
      result: result,
      newScore: updatedPlayer.score,
      priceChange: {
        initial: guess.currentPrice,
        final: currentPrice,
        direction: priceWentUp ? 'up' : 'down'
      }
    });

  } catch (error) {
    console.error('Error resolving guess:', error);

    // Handle DynamoDB errors
    if (error.code && error.code.startsWith('Dynamo')) {
      return errorResponse('Database error occurred', 500, 'DATABASE_ERROR');
    }

    // Handle Bitcoin price fetch errors
    if (error.message && error.message.includes('Bitcoin price')) {
      return errorResponse('Failed to fetch Bitcoin price', 500, 'PRICE_FETCH_ERROR');
    }

    // Generic server error
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
