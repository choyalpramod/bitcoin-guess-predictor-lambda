# Bitcoin Guess Predictor - Backend

A serverless backend for a Bitcoin price prediction game built with AWS Lambda, DynamoDB, and EventBridge.

## Overview

This backend provides APIs for a web application where users can guess whether Bitcoin's price will go up or down within a minute. Players earn points for correct guesses and lose points for incorrect ones.

## Architecture

- **AWS Lambda**: Serverless functions for API endpoints
- **Amazon DynamoDB**: NoSQL database for storing player data and game state
- **Amazon EventBridge**: Event scheduling for guess resolution
- **API Gateway**: REST API endpoints
- **CoinGecko API**: Real-time Bitcoin price data

## Current Implementation

### Completed Features

#### Player Management
- **POST /players** - Create a new player
- **GET /api/player/{userId}** - Get player state (score + latest guess + current BTC price)

#### Game Logic
- **POST /api/guess** - Make a new guess (up/down prediction)
- **POST /api/resolve** - Resolve a guess (triggered by EventBridge or manual)
- **GET /api/guesses/{userId}** - Get latest guesses for a player

### API Endpoints

#### Create Player
```http
POST /players
Content-Type: application/json

{
  "name": "Player Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "uuid-string",
    "name": "Player Name",
    "score": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastActive": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Player State
```http
GET /api/player/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 5,
    "currentPrice": 26950.23,
    "latestGuess": {
      "guessId": "abc123",
      "direction": "up",
      "timestamp": 1690000000000,
      "resolved": true,
      "result": "win"
    }
  }
}
```

**Response (no guesses made):**
```json
{
  "success": true,
  "data": {
    "score": 0,
    "currentPrice": 26950.23,
    "latestGuess": null
  }
}
```

#### Make Guess
```http
POST /api/guess
Content-Type: application/json

{
  "userId": "uuid-string",
  "direction": "up"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Guess recorded",
    "guessId": "uuid-string",
    "timestamp": 1690000000000
  }
}
```

**Error Responses:**
- `400` - Invalid request (missing fields, invalid direction, etc.)
- `404` - Player not found
- `409` - Player already has an active guess

#### Resolve Guess
```http
POST /api/resolve
Content-Type: application/json

{
  "guessId": "uuid-string",
  "userId": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Guess resolved",
    "result": "win",
    "newScore": 6,
    "priceChange": {
      "initial": 45123.45,
      "final": 46200.12,
      "direction": "up"
    }
  }
}
```

#### Get Player Guesses
```http
GET /api/guesses/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "latestGuess": [
        {
          "guessId": "abc123",
          "direction": "up",
          "timestamp": 1690000000000,
          "resolved": true,
          "result": "win"
        }
    ]
  }
}
```

**Note**: This endpoint is primarily triggered automatically by EventBridge after 60 seconds, but can also be called manually for testing.

## Project Structure

```
├── src/
│   ├── handlers/           # Lambda function handlers
│   │   ├── createPlayer.js
│   │   ├── getPlayerState.js
│   │   ├── makeGuess.js
│   │   ├── getPlayerGuesses.js
│   │   └── resolveGuess.js
│   └── utils/              # Shared utilities
│       ├── bitcoin.js      # Bitcoin price fetching
│       ├── dynamodb.js     # DynamoDB operations
│       ├── eventbridge.js  # EventBridge scheduling
│       ├── response.js     # HTTP response helpers
│       ├── guess.js        # helpers for formatting guess data
│       └── validation.js   # Input validation
├── tests/                  # Test files (to be added)
├── package.json
├── serverless.yml          # Serverless Framework configuration
└── README.md
```

## Setup and Installation

### Prerequisites
- Node.js 20.x or later
- AWS CLI configured with appropriate permissions
- Serverless Framework

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bitcoin-guess-predictor-lambda
```

2. Install dependencies:
```bash
npm install
```

3. Install Serverless Framework globally (if not already installed):
```bash
npm install -g serverless
```

### Local Development

1. Start the local development server:
```bash
npm run local
```

This will start the Serverless Offline plugin, allowing you to test the APIs locally.

### Deployment

1. Deploy to AWS (Production):
```bash
npm run deploy
```

This will deploy to the `prod` stage by default.

## Environment Variables

The following environment variables are automatically set by the Serverless Framework:

- `PLAYERS_TABLE`: DynamoDB table name for storing player data
- `GUESSES_TABLE`: DynamoDB table name for storing guess data
- `STAGE`: Deployment stage (defaults to prod)

## Database Schema

### Players Table
- **Primary Key**: `playerId` (String) - UUID
- **Attributes**:
  - `playerId`: Unique player identifier
  - `name`: Player's display name
  - `score`: Current game score (starts at 0)
  - `createdAt`: Account creation timestamp
  - `lastActive`: Last activity timestamp

### Guesses Table
- **Primary Key**: `guessId` (String) - UUID
- **Global Secondary Indexes**:
  - `PlayerGuessesIndex` (playerId, status) - For active guess queries
  - `PlayerTimeIndex` (playerId, createdAt) - For latest guess queries
- **Attributes**:
  - `guessId`: Unique guess identifier
  - `playerId`: Player who made the guess
  - `direction`: Guess direction ("up" or "down")
  - `currentPrice`: Bitcoin price when guess was made
  - `status`: Guess status ("ACTIVE", "WON", "LOST")
  - `createdAt`: Guess creation timestamp
  - `resolveAt`: Scheduled resolution timestamp
  - `resolvePrice`: Bitcoin price when guess was resolved (added after resolution)
  - `resolvedAt`: Actual resolution timestamp (added after resolution)

## Bitcoin Price Integration

The application fetches real-time Bitcoin prices from the CoinGecko API:

### Features:
- **Real-time pricing**: Uses CoinGecko's free API for current BTC/USD price
- **Caching**: 30-second cache to avoid excessive API calls
- **Fallback mechanism**: Mock prices if CoinGecko API is unavailable
- **Error handling**: Graceful degradation with stale cache or mock data

### API Endpoint:
- **CoinGecko**: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- **Rate limits**: No API key required, reasonable rate limits for free tier
- **Timeout**: 5-second timeout for API requests

### Integration Points:
- **makeGuess**: Captures current price when guess is made
- **getPlayerState**: Returns current price for frontend display
- **resolveGuess**: Compares current vs. initial price for resolution

## Testing

Run tests with:
```bash
npm test
```

## Next Steps

The following features are planned for implementation:

1. **Game Logic Functions**:
   - Make guess endpoint
   - Get current Bitcoin price
   - Resolve guess with EventBridge scheduling

2. **Additional Tables**:
   - Active guesses table
   - Price history table (optional)

3. **Real-time Features**:
   - WebSocket support for live price updates
   - Real-time score updates

## Contributing

1. Follow the existing code structure and patterns
2. Add appropriate error handling and logging
3. Include tests for new functionality
4. Update this README with any new features or changes

## License

MIT
