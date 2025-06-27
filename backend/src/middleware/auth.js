const { CognitoJwtVerifier } = require('aws-jwt-verify');
const logger = require('../config/logger');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
});

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

    // Verify the JWT token with Cognito
    const payload = await verifier.verify(token);
    
    // Extract user information from token
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      groups: payload['cognito:groups'] || [],
      tokenUse: payload.token_use
    };

    logger.debug('User authenticated:', { 
      userId: req.user.id, 
      username: req.user.username,
      groups: req.user.groups 
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JwtExpiredError') {
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