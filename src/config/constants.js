/**
 * Application Constants
 * Centralized configuration for the Bitcoin Guess Predictor API
 */

// Application Configuration
const APP_CONFIG = {
  SERVICE_NAME: 'bitcoin-guess-predictor',
  DEFAULT_REGION: 'eu-central-1',
  CACHE_TTL: 200000, // 20 seconds
  REQUEST_TIMEOUT: 5000, // 5 seconds
  GUESS_RESOLUTION_DELAY: 60000, // 60 seconds (1 minute)
};

// EventBridge Configuration
const EVENTBRIDGE_CONFIG = {
  SOURCE: 'bitcoin-guess-predictor',
  DETAIL_TYPES: {
    RESOLVE_GUESS: 'Resolve Guess',
  },
};

// DynamoDB Table Names (will be set from environment variables)
const TABLE_NAMES = {
  PLAYERS: process.env.PLAYERS_TABLE,
  GUESSES: process.env.GUESSES_TABLE,
};

// DynamoDB Index Names
const INDEX_NAMES = {
  PLAYER_GUESSES: 'PlayerGuessesIndex',
  PLAYER_TIME: 'PlayerTimeIndex',
};

// Guess Status Constants
const GUESS_STATUS = {
  ACTIVE: 'ACTIVE',
  WON: 'WON',
  LOST: 'LOST',
};

// Guess Direction Constants
const GUESS_DIRECTION = {
  UP: 'up',
  DOWN: 'down',
};

// Score Changes
const SCORE_CHANGES = {
  WIN: 1,
  LOSS: -1,
};

// API Response Messages
const RESPONSE_MESSAGES = {
  GUESS_RECORDED: 'Guess recorded',
  GUESS_RESOLVED: 'Guess resolved',
  GUESS_ALREADY_RESOLVED: 'Guess already resolved',
  PLAYER_CREATED: 'Player created successfully',
};

// Error Messages
const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',
  PLAYER_NOT_FOUND: 'Player not found',
  GUESS_NOT_FOUND: 'Guess not found',
  ACTIVE_GUESS_EXISTS: 'Player already has an active guess',
  UNAUTHORIZED: 'Unauthorized access',
  DATABASE_ERROR: 'Database error occurred',
  PRICE_FETCH_ERROR: 'Failed to fetch Bitcoin price',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_JSON: 'Invalid JSON in request body',
  INVALID_EVENT: 'Invalid event format',
  MISSING_PARAMETERS: 'Required parameters missing',
};

// Error Codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  GUESS_NOT_FOUND: 'GUESS_NOT_FOUND',
  ACTIVE_GUESS_EXISTS: 'ACTIVE_GUESS_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PRICE_FETCH_ERROR: 'PRICE_FETCH_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  SCHEDULING_ERROR: 'SCHEDULING_ERROR',
  MISSING_USER_ID: 'MISSING_USER_ID',
  INVALID_USER_ID: 'INVALID_USER_ID',
  MISSING_PLAYER_ID: 'MISSING_PLAYER_ID',
  INVALID_PLAYER_ID: 'INVALID_PLAYER_ID',
  INVALID_EVENT: 'INVALID_EVENT',
  MISSING_PARAMETERS: 'MISSING_PARAMETERS',
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Bitcoin API Configuration
const BITCOIN_API = {
  COINGECKO_URL: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  FALLBACK_PRICE_MIN: 45000,
  FALLBACK_PRICE_MAX: 55000,
};

// Validation Rules
const VALIDATION_RULES = {
  PLAYER_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
};

// Environment Variables
const ENV = {
  STAGE: process.env.STAGE || 'prod',
  AWS_REGION: process.env.AWS_REGION || APP_CONFIG.DEFAULT_REGION,
  IS_OFFLINE: process.env.IS_OFFLINE,
};

module.exports = {
  APP_CONFIG,
  EVENTBRIDGE_CONFIG,
  TABLE_NAMES,
  INDEX_NAMES,
  GUESS_STATUS,
  GUESS_DIRECTION,
  SCORE_CHANGES,
  RESPONSE_MESSAGES,
  ERROR_MESSAGES,
  ERROR_CODES,
  HTTP_STATUS,
  BITCOIN_API,
  VALIDATION_RULES,
  ENV,
};
