import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Strict limit for auth endpoints
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Significantly increased to handle real-time dashboard polling
  message: {
    success: false,
    message: 'Too many requests from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
