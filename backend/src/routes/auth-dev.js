const express = require('express');
const jwt = require('jsonwebtoken');
const { authLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// Development users (for local testing only)
const DEV_USERS = [
  {
    id: 'admin-001',
    email: 'admin@test.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'platform_admin',
    groups: ['platform_admin']
  },
  {
    id: 'manager-001', 
    email: 'manager@test.com',
    password: 'manager123',
    firstName: 'Field',
    lastName: 'Manager',
    role: 'field_manager',
    groups: ['field_manager']
  },
  {
    id: 'tech-001',
    email: 'tech@test.com', 
    password: 'tech123',
    firstName: 'Field',
    lastName: 'Technician',
    role: 'field_technician',
    groups: ['field_technician']
  }
];

// Validation middleware
const validateSignIn = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Development sign in (only available in development mode)
router.post('/signin', authLimiter, validateSignIn, async (req, res, next) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Development authentication not available in production'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user in development users
    const user = DEV_USERS.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
    
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role,
        groups: user.groups,
        'cognito:username': user.email
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        type: 'refresh'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info('Development user signed in:', { email, role: user.role });

    res.json({
      success: true,
      message: 'Sign in successful',
      data: {
        user: {
          id: user.id,
          username: user.email,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          groups: user.groups,
          enabled: true,
          status: 'CONFIRMED'
        },
        accessToken,
        refreshToken,
        idToken: accessToken, // Use same token for simplicity in dev
        expiresIn: 3600
      }
    });

  } catch (error) {
    logger.error('Development sign in error:', error);
    next(error);
  }
});

// Development user info endpoint
router.get('/me', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Development authentication not available in production'
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
    
    const decoded = jwt.verify(token, jwtSecret);
    const user = DEV_USERS.find(u => u.id === decoded.sub);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.email,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        groups: user.groups,
        enabled: true,
        status: 'CONFIRMED'
      }
    });

  } catch (error) {
    logger.error('Development user info error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// List available development users
router.get('/dev-users', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Development endpoints not available in production'
    });
  }

  const usersInfo = DEV_USERS.map(user => ({
    email: user.email,
    password: user.password,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`
  }));

  res.json({
    success: true,
    message: 'Available development users',
    data: usersInfo
  });
});

module.exports = router;