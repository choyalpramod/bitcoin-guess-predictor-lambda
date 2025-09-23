/**
 * Utility to format a guess object for API responses.
 * Centralized to avoid duplication across handlers.
 */

/**
 * Format guess object for API response
 * @param {Object} guess - Raw guess object from DynamoDB
 * @returns {Object|null} - Formatted guess object for response or null if input is falsy
 */
function formatGuessForResponse(guess) {
  if (!guess) return null;

  const status = typeof guess.status === 'string' ? guess.status : 'ACTIVE';
  const isResolved = status !== 'ACTIVE';

  // Prefer common timestamp fields, fall back to current time
  const createdAt = guess.createdAt || guess.timestamp;
  const timestamp = createdAt ? Number(new Date(createdAt).getTime()) : Date.now();

  const formatted = {
    guessId: guess.guessId || null,
    direction: guess.direction || null,
    timestamp,
    resolved: isResolved
  };

  if (isResolved) {
    formatted.result = status === 'WON' ? 'win' : 'loss';
  }

  return formatted;
}

module.exports = {
  formatGuessForResponse
};

