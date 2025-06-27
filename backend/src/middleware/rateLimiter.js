const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    }
  });
};

// Default rate limiter - 100 requests per 15 minutes
const defaultLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  'Too many authentication attempts, please try again later.'
);

// File upload limiter - 10 uploads per hour
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10,
  'Too many file uploads, please try again later.'
);

module.exports = defaultLimiter;
module.exports.authLimiter = authLimiter;
module.exports.uploadLimiter = uploadLimiter;