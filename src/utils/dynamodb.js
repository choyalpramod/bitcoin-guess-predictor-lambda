const AWS = require('aws-sdk');
const { TABLE_NAMES, INDEX_NAMES, ENV } = require('../config/constants');

// Configure DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: ENV.AWS_REGION,
  ...(ENV.IS_OFFLINE && {
    endpoint: 'http://localhost:8000'
  })
});

/**
 * Create a new player in DynamoDB
 * @param {Object} player - Player object with playerId, name, score, createdAt, lastActive
 * @returns {Promise<Object>} - Created player object
 */
const createPlayer = async (player) => {
  const params = {
    TableName: TABLE_NAMES.PLAYERS,
    Item: player,
    ConditionExpression: 'attribute_not_exists(playerId)' // Ensure no duplicate playerId
  };

  try {
    await dynamodb.put(params).promise();
    return player;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
};

/**
 * Get a player by playerId
 * @param {string} playerId - The player's unique ID
 * @returns {Promise<Object|null>} - Player object or null if not found
 */
const getPlayerById = async (playerId) => {
  const params = {
    TableName: TABLE_NAMES.PLAYERS,
    Key: {
      playerId: playerId
    }
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item || null;
  } catch (error) {
    console.error('Error getting player:', error);
    throw error;
  }
};

/**
 * Update player's last active timestamp
 * @param {string} playerId - The player's unique ID
 * @returns {Promise<Object>} - Updated player object
 */
const updatePlayerLastActive = async (playerId) => {
  const params = {
    TableName: TABLE_NAMES.PLAYERS,
    Key: {
      playerId: playerId
    },
    UpdateExpression: 'SET lastActive = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error('Error updating player last active:', error);
    throw error;
  }
};

/**
 * Create a new guess in DynamoDB
 * @param {Object} guess - Guess object with guessId, playerId, direction, etc.
 * @returns {Promise<Object>} - Created guess object
 */
const createGuess = async (guess) => {
  const params = {
    TableName: TABLE_NAMES.GUESSES,
    Item: guess,
    ConditionExpression: 'attribute_not_exists(guessId)' // Ensure no duplicate guessId
  };

  try {
    await dynamodb.put(params).promise();
    return guess;
  } catch (error) {
    console.error('Error creating guess:', error);
    throw error;
  }
};

/**
 * Get active guess for a player
 * @param {string} playerId - The player's unique ID
 * @returns {Promise<Object|null>} - Active guess object or null if not found
 */
const getActiveGuessForPlayer = async (playerId) => {
  const params = {
    TableName: TABLE_NAMES.GUESSES,
    IndexName: INDEX_NAMES.PLAYER_GUESSES,
    KeyConditionExpression: 'playerId = :playerId AND #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':playerId': playerId,
      ':status': 'ACTIVE'
    },
    Limit: 1
  };

  try {
    const result = await dynamodb.query(params).promise();
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error getting active guess for player:', error);
    throw error;
  }
};

/**
 * Get a guess by guessId
 * @param {string} guessId - The guess's unique ID
 * @returns {Promise<Object|null>} - Guess object or null if not found
 */
const getGuessById = async (guessId) => {
  const params = {
    TableName: TABLE_NAMES.GUESSES,
    Key: {
      guessId: guessId
    }
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item || null;
  } catch (error) {
    console.error('Error getting guess:', error);
    throw error;
  }
};

/**
 * Get the latest guess for a player (most recent by creation time)
 * @param {string} playerId - The player's unique ID
 * @param maxResults - Maximum number of results to return
 * @returns {Promise<Object|null>} - Latest guess object or null if not found
 */
const getLatestGuessForPlayer = async (playerId, maxResults = 1) => {
  const params = {
    TableName: TABLE_NAMES.GUESSES,
    IndexName: INDEX_NAMES.PLAYER_TIME,
    KeyConditionExpression: 'playerId = :playerId',
    ExpressionAttributeValues: {
      ':playerId': playerId
    },
    ScanIndexForward: false, // Sort in descending order (latest first)
    Limit: maxResults
  };

  try {
    const result = await dynamodb.query(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error getting latest guess for player:', error);
    throw error;
  }
};

/**
 * Update a guess with resolution data
 * @param {string} guessId - The guess ID to update
 * @param {string} status - New status ('WON' or 'LOST')
 * @param {number} resolvePrice - Bitcoin price at resolution time
 * @returns {Promise<Object>} - Updated guess object
 */
const updateGuessResolution = async (guessId, status, resolvePrice) => {
  const params = {
    TableName: TABLE_NAMES.GUESSES,
    Key: {
      guessId: guessId
    },
    UpdateExpression: 'SET #status = :status, resolvePrice = :resolvePrice, resolvedAt = :resolvedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':resolvePrice': resolvePrice,
      ':resolvedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error('Error updating guess resolution:', error);
    throw error;
  }
};

/**
 * Update player score
 * @param {string} playerId - The player's unique ID
 * @param {number} scoreChange - Score change (+1 for win, -1 for loss)
 * @returns {Promise<Object>} - Updated player object
 */
const updatePlayerScore = async (playerId, scoreChange) => {
  const now = new Date().toISOString();

  // Increment path (never capped)
  if (scoreChange >= 0) {
    const params = {
      TableName: TABLE_NAMES.PLAYERS,
      Key: { playerId },
      UpdateExpression: 'SET score = if_not_exists(score, :zero) + :scoreChange, lastActive = :timestamp',
      ExpressionAttributeValues: {
        ':scoreChange': scoreChange,
        ':zero': 0,
        ':timestamp': now
      },
      ReturnValues: 'ALL_NEW'
    };

    try {
      const result = await dynamodb.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error('Error updating player score (increment):', error);
      throw error;
    }
  }

  // Decrement path (floor at 0)
  const params = {
    TableName: TABLE_NAMES.PLAYERS,
    Key: { playerId },
    UpdateExpression: 'SET score = if_not_exists(score, :zero) - :one, lastActive = :timestamp',
    ConditionExpression: 'attribute_exists(score) AND score >= :one',
    ExpressionAttributeValues: {
      ':one': 1,
      ':zero': 0,
      ':timestamp': now
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      // Score is 0 or missing -> keep at 0, but still update lastActive and ensure score is set to 0
      try {
        const fallback = await dynamodb.update({
          TableName: TABLE_NAMES.PLAYERS,
          Key: { playerId },
          UpdateExpression: 'SET lastActive = :timestamp, score = if_not_exists(score, :zero)',
          ExpressionAttributeValues: {
            ':timestamp': now,
            ':zero': 0
          },
          ReturnValues: 'ALL_NEW'
        }).promise();
        return fallback.Attributes;
      } catch (fallbackErr) {
        console.error('Fallback update (no decrement) failed:', fallbackErr);
        throw fallbackErr;
      }
    }

    console.error('Error updating player score (decrement):', error);
    throw error;
  }
};

module.exports = {
  createPlayer,
  getPlayerById,
  updatePlayerLastActive,
  createGuess,
  getActiveGuessForPlayer,
  getGuessById,
  getLatestGuessForPlayer,
  updateGuessResolution,
  updatePlayerScore
};
