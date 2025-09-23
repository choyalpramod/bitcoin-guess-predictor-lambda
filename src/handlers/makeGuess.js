const { v4: uuidv4 } = require('uuid');
const { getPlayerById, createGuess, getActiveGuessForPlayer } = require('../utils/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { validateMakeGuessRequest } = require('../utils/validation');
const { scheduleGuessResolution } = require('../utils/eventbridge');
const { getBitcoinPriceWithFallback } = require('../utils/bitcoin');

/**
 * Lambda handler for making a new guess
 * POST /api/guess
 * Body: { "userId": "uuid", "direction": "up" | "down" }
 * Response: { "message": "Guess recorded", "guessId": "uuid", "timestamp": number }
 */
exports.handler = async (event) => {
  console.log('Make Guess Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validation = validateMakeGuessRequest(body);
    if (!validation.isValid) {
      return errorResponse(validation.error, 400, 'VALIDATION_ERROR');
    }

    const { userId, direction } = validation.validatedData;

    // Check if player exists
    const player = await getPlayerById(userId);
    if (!player) {
      return errorResponse('Player not found', 404, 'PLAYER_NOT_FOUND');
    }

    // Check if player already has an active guess
    const activeGuess = await getActiveGuessForPlayer(userId);
    if (activeGuess) {
      return errorResponse(
        'Player already has an active guess. Wait for it to resolve before making a new guess.',
        409,
        'ACTIVE_GUESS_EXISTS'
      );
    }

    // Get current Bitcoin price from CoinGecko API
    const currentPrice = await getBitcoinPriceWithFallback();

    // Create guess object
    const now = new Date();
    const timestamp = now.getTime();
    const guess = {
      guessId: uuidv4(),
      playerId: userId,
      direction: direction,
      currentPrice: currentPrice,
      status: 'ACTIVE',
      createdAt: now.toISOString(),
      resolveAt: new Date(timestamp + 60 * 1000).toISOString() // 60 seconds from now
    };

    // Save guess to DynamoDB
    const createdGuess = await createGuess(guess);

    // Schedule guess resolution via EventBridge
    try {
      await scheduleGuessResolution(guess.guessId, userId, currentPrice);
      console.log('Guess resolution scheduled successfully:', guess.guessId);
    } catch (scheduleError) {
      console.error('Failed to schedule guess resolution:', scheduleError);
      // Note: We could implement a fallback mechanism here
      // For now, we'll continue and log the error
    }

    console.log('Guess created successfully:', createdGuess.guessId);

    // Return success response
    return successResponse({
      message: 'Guess recorded',
      guessId: createdGuess.guessId,
      timestamp: timestamp
    }, 201);

  } catch (error) {
    console.error('Error making guess:', error);

    // Handle DynamoDB conditional check failed (duplicate guessId - very unlikely with UUID)
    if (error.code === 'ConditionalCheckFailedException') {
      return errorResponse('Guess creation failed due to conflict', 409, 'CONFLICT_ERROR');
    }

    // Handle other DynamoDB errors
    if (error.code && error.code.startsWith('Dynamo')) {
      return errorResponse('Database error occurred', 500, 'DATABASE_ERROR');
    }

    // Handle EventBridge errors
    if (error.code && error.code.includes('Events')) {
      console.error('EventBridge error, but guess was created:', error);
      // Return success since the guess was created, even if scheduling failed
      return errorResponse('Guess created but scheduling failed', 500, 'SCHEDULING_ERROR');
    }

    // Generic server error
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
