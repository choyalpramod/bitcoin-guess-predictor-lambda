const { v4: uuidv4 } = require('uuid');
const { createPlayer } = require('../utils/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { validatePlayerName } = require('../utils/validation');
const { ERROR_MESSAGES, ERROR_CODES, HTTP_STATUS } = require('../config/constants');

/**
 * Lambda handler for creating a new player
 * POST /players
 * Body: { "name": "string" }
 * Response: { "playerId": "uuid", "name": "string", "score": 0, "createdAt": "timestamp" }
 */
exports.handler = async (event) => {
  console.log('Create Player Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return errorResponse(ERROR_MESSAGES.INVALID_JSON, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate player name
    const nameValidation = validatePlayerName(body.name);
    if (!nameValidation.isValid) {
      return errorResponse(nameValidation.error, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    // Create player object
    const now = new Date().toISOString();
    const player = {
      playerId: uuidv4(),
      name: nameValidation.trimmedName,
      score: 0,
      createdAt: now,
      lastActive: now
    };

    // Save player to DynamoDB
    const createdPlayer = await createPlayer(player);

    console.log('Player created successfully:', createdPlayer.playerId);

    // Return success response
    return successResponse(createdPlayer, HTTP_STATUS.CREATED);

  } catch (error) {
    console.error('Error creating player:', error);

    // Handle DynamoDB conditional check failed (duplicate playerId - very unlikely with UUID)
    if (error.code === 'ConditionalCheckFailedException') {
      return errorResponse('Player creation failed due to conflict', HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT_ERROR);
    }

    // Handle other DynamoDB errors
    if (error.code && error.code.startsWith('Dynamo')) {
      return errorResponse(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR);
    }

    // Generic server error
    return errorResponse(ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR);
  }
};
