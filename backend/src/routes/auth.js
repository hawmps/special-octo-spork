const express = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { cognito } = require('../config/aws');

const router = express.Router();

// Validation middleware
const validateSignUp = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').isIn(['platform_admin', 'field_manager', 'field_technician', 'customer_service']).withMessage('Invalid role')
];

const validateSignIn = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const validatePasswordReset = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

const validateConfirmPassword = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('confirmationCode').notEmpty().withMessage('Confirmation code is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Sign up
router.post('/signup', authLimiter, validateSignUp, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, role } = req.body;

    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS', // Don't send welcome email
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'custom:role', Value: role },
        { Name: 'email_verified', Value: 'true' }
      ]
    };

    // Create user in Cognito
    const createResult = await cognito.adminCreateUser(params).promise();

    // Set permanent password
    await cognito.adminSetUserPassword({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    }).promise();

    // Add user to appropriate group
    await cognito.adminAddUserToGroup({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      GroupName: role
    }).promise();

    logger.info('User created successfully:', { email, role });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userId: createResult.User.Username,
        email: email,
        role: role
      }
    });

  } catch (error) {
    logger.error('Sign up error:', error);
    
    if (error.code === 'UsernameExistsException') {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    next(error);
  }
});

// Sign in
router.post('/signin', authLimiter, validateSignIn, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const params = {
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    const result = await cognito.adminInitiateAuth(params).promise();

    // Get user details
    const userResult = await cognito.adminGetUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email
    }).promise();

    // Get user groups
    const groupsResult = await cognito.adminListGroupsForUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email
    }).promise();

    const userAttributes = {};
    userResult.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });

    logger.info('User signed in successfully:', { email });

    res.json({
      success: true,
      message: 'Sign in successful',
      data: {
        accessToken: result.AuthenticationResult.AccessToken,
        refreshToken: result.AuthenticationResult.RefreshToken,
        idToken: result.AuthenticationResult.IdToken,
        expiresIn: result.AuthenticationResult.ExpiresIn,
        user: {
          id: userResult.Username,
          email: userAttributes.email,
          firstName: userAttributes.given_name,
          lastName: userAttributes.family_name,
          role: userAttributes['custom:role'],
          groups: groupsResult.Groups.map(group => group.GroupName)
        }
      }
    });

  } catch (error) {
    logger.error('Sign in error:', error);
    
    if (error.code === 'NotAuthorizedException') {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    if (error.code === 'UserNotFoundException') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    next(error);
  }
});

// Refresh token
router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    };

    const result = await cognito.initiateAuth(params).promise();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        expiresIn: result.AuthenticationResult.ExpiresIn
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    
    if (error.code === 'NotAuthorizedException') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    next(error);
  }
});

// Forgot password
router.post('/forgot-password', authLimiter, validatePasswordReset, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    await cognito.forgotPassword({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email
    }).promise();

    logger.info('Password reset initiated:', { email });

    res.json({
      success: true,
      message: 'Password reset code sent to email'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    
    if (error.code === 'UserNotFoundException') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    next(error);
  }
});

// Confirm forgot password
router.post('/confirm-forgot-password', authLimiter, validateConfirmPassword, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, confirmationCode, newPassword } = req.body;

    await cognito.confirmForgotPassword({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword
    }).promise();

    logger.info('Password reset confirmed:', { email });

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    logger.error('Confirm forgot password error:', error);
    
    if (error.code === 'CodeMismatchException') {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation code'
      });
    }
    
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userResult = await cognito.adminGetUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: req.user.username
    }).promise();

    const groupsResult = await cognito.adminListGroupsForUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: req.user.username
    }).promise();

    const userAttributes = {};
    userResult.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });

    res.json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        email: userAttributes.email,
        firstName: userAttributes.given_name,
        lastName: userAttributes.family_name,
        role: userAttributes['custom:role'],
        groups: groupsResult.Groups.map(group => group.GroupName),
        enabled: userResult.Enabled,
        status: userResult.UserStatus
      }
    });

  } catch (error) {
    logger.error('Get current user error:', error);
    next(error);
  }
});

// Sign out
router.post('/signout', authenticate, async (req, res, next) => {
  try {
    await cognito.adminUserGlobalSignOut({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: req.user.username
    }).promise();

    logger.info('User signed out:', { username: req.user.username });

    res.json({
      success: true,
      message: 'Sign out successful'
    });

  } catch (error) {
    logger.error('Sign out error:', error);
    next(error);
  }
});

module.exports = router;