const AWS = require('aws-sdk');
const { APP_CONFIG, ENV } = require('../config/constants');

// Configure EventBridge Scheduler for scheduled events (AWS SDK v2 service is named 'Scheduler')
const scheduler = new AWS.Scheduler({
  region: ENV.AWS_REGION
});

// Configure EventBridge (for immediate events)
const eventbridge = new AWS.EventBridge({
  region: ENV.AWS_REGION
});

/**
 * Schedule a guess resolution event to be triggered after 60 seconds
 * @param {string} guessId - The guess ID to resolve
 * @param {string} userId - The user ID who made the guess
 * @param {number} currentPrice - The Bitcoin price when the guess was made
 * @returns {Promise<Object>} - EventBridge response
 */
const scheduleGuessResolution = async (guessId, userId, currentPrice) => {
  // Schedule name must be unique - use guessId
  const scheduleName = `resolve-guess-${guessId}`;

  // Time 60 seconds from now in seconds precision, no timezone suffix (Scheduler expects no 'Z')
  const runAt = new Date(Date.now() + APP_CONFIG.GUESS_RESOLUTION_DELAY)
    .toISOString()
    .slice(0, 19); // e.g., 2025-09-22T12:44:43

  const accountId = await getAccountId();
  const functionName = `${APP_CONFIG.SERVICE_NAME}-${ENV.STAGE}-resolveGuess`;
  const lambdaArn = `arn:aws:lambda:${ENV.AWS_REGION}:${accountId}:function:${functionName}`;
  const roleName = `${APP_CONFIG.SERVICE_NAME}-${ENV.STAGE}-scheduler-role`;
  const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;

  const params = {
    Name: scheduleName,
    GroupName: 'default',
    FlexibleTimeWindow: { Mode: 'OFF' }, // Run exactly once
    ScheduleExpression: `at(${runAt})`,
    ScheduleExpressionTimezone: 'UTC',
    Target: {
      Arn: lambdaArn,
      RoleArn: roleArn,
      Input: JSON.stringify({
        guessId,
        userId: userId,
        currentPrice,
        scheduledAt: new Date().toISOString(),
        source: 'eventbridge-scheduler'
      })
    }
  };

  try {
    const result = await scheduler.createSchedule(params).promise();
    console.log('Guess resolution scheduled via EventBridge Scheduler:', {
      guessId,
      scheduleName,
      runAt,
      result
    });
    return result;
  } catch (error) {
    console.error('Error scheduling guess resolution via EventBridge Scheduler:', error);
    throw error;
  }
};

// Helper function to get AWS account ID
const getAccountId = async () => {
  const sts = new AWS.STS({ region: ENV.AWS_REGION });
  const identity = await sts.getCallerIdentity().promise();
  return identity.Account;
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
