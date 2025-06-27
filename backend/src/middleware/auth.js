const { CognitoJwtVerifier } = require('aws-jwt-verify');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Initialize Cognito verifier only if Cognito is configured
let verifier = null;
if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID) {
  verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: 'access',
    clientId: process.env.COGNITO_CLIENT_ID,
  });
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    let payload;

    // In development mode without Cognito, use regular JWT verification
    if (process.env.NODE_ENV === 'development' && !verifier) {
      const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
      payload = jwt.verify(token, jwtSecret);
      
      // Extract user information from development token
      req.user = {
        id: payload.sub,
        username: payload['cognito:username'] || payload.email,
        email: payload.email,
        groups: payload.groups || [],
        role: payload.role,
        tokenUse: 'access'
      };
    } else if (verifier) {
      // Verify the JWT token with Cognito
      payload = await verifier.verify(token);
      
      // Extract user information from Cognito token
      req.user = {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        groups: payload['cognito:groups'] || [],
        tokenUse: payload.token_use
      };
    } else {
      throw new Error('No authentication method configured');
    }

    logger.debug('User authenticated:', { 
      userId: req.user.id, 
      username: req.user.username,
      groups: req.user.groups 
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JwtExpiredError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userGroups = req.user.groups || [];
    const hasPermission = roles.some(role => userGroups.includes(role));

    if (!hasPermission) {
      logger.warn('Access denied:', { 
        userId: req.user.id, 
        userGroups, 
        requiredRoles: roles 
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Role-based authorization helpers
const requirePlatformAdmin = authorize('platform_admin');
const requireFieldManager = authorize('platform_admin', 'field_manager');
const requireFieldTechnician = authorize('platform_admin', 'field_manager', 'field_technician');
const requireCustomerService = authorize('platform_admin', 'field_manager', 'customer_service');

module.exports = {
  authenticate,
  authorize,
  requirePlatformAdmin,
  requireFieldManager,
  requireFieldTechnician,
  requireCustomerService
};