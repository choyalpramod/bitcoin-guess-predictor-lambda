const https = require('https');
const { BITCOIN_API, APP_CONFIG } = require('../config/constants');

/**
 * Fetch current Bitcoin price from CoinGecko API
 * @returns {Promise<number>} - Current Bitcoin price in USD
 */
const getCurrentBitcoinPrice = async () => {
  const url = BITCOIN_API.COINGECKO_URL;
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';

      // Collect data chunks
      response.on('data', (chunk) => {
        data += chunk;
      });

      // Handle response completion
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          
          if (parsedData.bitcoin && parsedData.bitcoin.usd) {
            const price = parsedData.bitcoin.usd;
            console.log('Bitcoin price fetched from CoinGecko:', price);
            resolve(price);
          } else {
            console.error('Invalid response format from CoinGecko:', parsedData);
            reject(new Error('Invalid response format from CoinGecko API'));
          }
        } catch (parseError) {
          console.error('Error parsing CoinGecko response:', parseError);
          reject(new Error('Failed to parse CoinGecko API response'));
        }
      });
    });

    // Handle request errors
    request.on('error', (error) => {
      console.error('Error fetching Bitcoin price from CoinGecko:', error);
      reject(new Error('Failed to fetch Bitcoin price from CoinGecko API'));
    });

    // Set request timeout
    request.setTimeout(APP_CONFIG.REQUEST_TIMEOUT, () => {
      request.destroy();
      reject(new Error('Request timeout while fetching Bitcoin price'));
    });
  });
};

/**
 * Get current Bitcoin price with fallback to mock price
 * @returns {Promise<number>} - Current Bitcoin price in USD
 */
const getBitcoinPriceWithFallback = async () => {
  try {
    // Try to get real price from CoinGecko
    const price = await getCurrentBitcoinPrice();
    return price;
  } catch (error) {
    console.warn('Failed to fetch real Bitcoin price, using fallback:', error.message);
    
    // Fallback to mock price for development/testing
    const mockPrice = BITCOIN_API.FALLBACK_PRICE_MIN +
                     Math.random() * (BITCOIN_API.FALLBACK_PRICE_MAX - BITCOIN_API.FALLBACK_PRICE_MIN);
    const roundedPrice = Math.round(mockPrice * 100) / 100; // Round to 2 decimal places
    
    console.log('Using mock Bitcoin price:', roundedPrice);
    return roundedPrice;
  }
};

/**
 * Cache for Bitcoin price to avoid excessive API calls
 */
let priceCache = {
  price: null,
  timestamp: null,
  ttl: APP_CONFIG.CACHE_TTL
};

/**
 * Get cached Bitcoin price or fetch new one if cache is expired
 * @returns {Promise<Object>} - Object with price and timestamp
 */
const getCachedBitcoinPrice = async () => {
  const now = Date.now();
  
  // Check if cache is valid
  if (priceCache.price && priceCache.timestamp && (now - priceCache.timestamp) < priceCache.ttl) {
    console.log('Using cached Bitcoin price:', priceCache.price);
    return {
      price: priceCache.price,
      timestamp: priceCache.timestamp
    };
  }
  
  // Fetch new price
  try {
    const price = await getBitcoinPriceWithFallback();
    
    // Update cache
    priceCache = {
      price: price,
      timestamp: now,
      ttl: APP_CONFIG.CACHE_TTL
    };
    
    return {
      price: price,
      timestamp: now
    };
  } catch (error) {
    console.error('Failed to get Bitcoin price:', error);
    
    // If we have stale cache, use it
    if (priceCache.price) {
      console.log('Using stale cached Bitcoin price:', priceCache.price);
      return {
        price: priceCache.price,
        timestamp: priceCache.timestamp
      };
    }
    
    // Last resort: throw error
    throw error;
  }
};

module.exports = {
  getCurrentBitcoinPrice,
  getBitcoinPriceWithFallback,
  getCachedBitcoinPrice
};
