const AWS = require('aws-sdk');
const { APP_CONFIG, EVENTBRIDGE_CONFIG, ENV } = require('../config/constants');

// Configure EventBridge
const eventbridge = new AWS.EventBridge({
  region: ENV.AWS_REGION
});

/**
 * Schedule a guess resolution event to be triggered after 60 seconds
 * @param {string} guessId - The guess ID to resolve
 * @param {string} playerId - The player ID who made the guess
 * @param {number} currentPrice - The Bitcoin price when the guess was made
 * @returns {Promise<Object>} - EventBridge response
 */
const scheduleGuessResolution = async (guessId, playerId, currentPrice) => {
  // Calculate the time from configuration
  const resolveTime = new Date(Date.now() + APP_CONFIG.GUESS_RESOLUTION_DELAY);

  const params = {
    Entries: [
      {
        Source: EVENTBRIDGE_CONFIG.SOURCE,
        DetailType: EVENTBRIDGE_CONFIG.DETAIL_TYPES.RESOLVE_GUESS,
        Detail: JSON.stringify({
          guessId,
          playerId,
          currentPrice,
          scheduledAt: new Date().toISOString()
        }),
        Time: resolveTime
      }
    ]
  };

  try {
    const result = await eventbridge.putEvents(params).promise();
    console.log('Guess resolution scheduled:', {
      guessId,
      resolveTime: resolveTime.toISOString(),
      eventResult: result
    });
    return result;
  } catch (error) {
    console.error('Error scheduling guess resolution:', error);
    throw error;
  }
};

/**
 * Send a custom event to EventBridge
 * @param {string} source - Event source
 * @param {string} detailType - Event detail type
 * @param {Object} detail - Event detail object
 * @param {Date} time - Optional scheduled time (defaults to now)
 * @returns {Promise<Object>} - EventBridge response
 */
const sendEvent = async (source, detailType, detail, time = null) => {
  const params = {
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
        ...(time && { Time: time })
      }
    ]
  };

  try {
    const result = await eventbridge.putEvents(params).promise();
    console.log('Event sent to EventBridge:', {
      source,
      detailType,
      result
    });
    return result;
  } catch (error) {
    console.error('Error sending event to EventBridge:', error);
    throw error;
  }
};

module.exports = {
  scheduleGuessResolution,
  sendEvent
};
