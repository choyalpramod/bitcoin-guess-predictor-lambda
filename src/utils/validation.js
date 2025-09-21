const { VALIDATION_RULES, GUESS_DIRECTION } = require('../config/constants');

/**
 * Validate player name
 * @param {string} name - Player name to validate
 * @returns {Object} - Validation result with isValid and error properties
 */
const validatePlayerName = (name) => {
  if (!name) {
    return {
      isValid: false,
      error: 'Name is required'
    };
  }

  if (typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Name must be a string'
    };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return {
      isValid: false,
      error: 'Name cannot be empty'
    };
  }

  if (trimmedName.length < VALIDATION_RULES.PLAYER_NAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Name must be at least ${VALIDATION_RULES.PLAYER_NAME.MIN_LENGTH} characters long`
    };
  }

  if (trimmedName.length > VALIDATION_RULES.PLAYER_NAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Name must be less than ${VALIDATION_RULES.PLAYER_NAME.MAX_LENGTH} characters long`
    };
  }

  return {
    isValid: true,
    trimmedName
  };
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID format
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate guess direction
 * @param {string} direction - Guess direction to validate
 * @returns {Object} - Validation result with isValid and error properties
 */
const validateGuessDirection = (direction) => {
  if (!direction) {
    return {
      isValid: false,
      error: 'Direction is required'
    };
  }

  if (typeof direction !== 'string') {
    return {
      isValid: false,
      error: 'Direction must be a string'
    };
  }

  const normalizedDirection = direction.toLowerCase().trim();

  if (normalizedDirection !== GUESS_DIRECTION.UP && normalizedDirection !== GUESS_DIRECTION.DOWN) {
    return {
      isValid: false,
      error: `Direction must be either "${GUESS_DIRECTION.UP}" or "${GUESS_DIRECTION.DOWN}"`
    };
  }

  return {
    isValid: true,
    normalizedDirection
  };
};

/**
 * Validate make guess request body
 * @param {Object} body - Request body to validate
 * @returns {Object} - Validation result with isValid, error, and validated data
 */
const validateMakeGuessRequest = (body) => {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      error: 'Request body is required'
    };
  }

  // Validate userId
  if (!body.userId) {
    return {
      isValid: false,
      error: 'userId is required'
    };
  }

  if (!isValidUUID(body.userId)) {
    return {
      isValid: false,
      error: 'Invalid userId format'
    };
  }

  // Validate direction
  const directionValidation = validateGuessDirection(body.direction);
  if (!directionValidation.isValid) {
    return directionValidation;
  }

  return {
    isValid: true,
    validatedData: {
      userId: body.userId,
      direction: directionValidation.normalizedDirection
    }
  };
};

module.exports = {
  validatePlayerName,
  isValidUUID,
  validateGuessDirection,
  validateMakeGuessRequest
};
