const express = require('express');
const { authenticate, requireCustomerService } = require('../middleware/auth');
const { validateAccount, validateUUID, validatePagination, validateSearch } = require('../middleware/validation');
const Account = require('../models/Account');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all accounts
router.get('/', 
  validatePagination,
  validateSearch,
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search,
        status: req.query.status
      };

      const result = await Account.findAll(options);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error fetching accounts:', error);
      next(error);
    }
  }
);

// Get account by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const account = await Account.findById(req.params.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      res.json({
        success: true,
        data: account
      });

    } catch (error) {
      logger.error('Error fetching account:', error);
      next(error);
    }
  }
);

// Create new account
router.post('/',
  requireCustomerService,
  validateAccount,
  async (req, res, next) => {
    try {
      const account = await Account.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: account
      });

    } catch (error) {
      logger.error('Error creating account:', error);
      next(error);
    }
  }
);

// Update account
router.put('/:id',
  requireCustomerService,
  validateUUID('id'),
  validateAccount,
  async (req, res, next) => {
    try {
      const account = await Account.update(req.params.id, req.body, req.user.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      res.json({
        success: true,
        message: 'Account updated successfully',
        data: account
      });

    } catch (error) {
      logger.error('Error updating account:', error);
      next(error);
    }
  }
);

// Delete account
router.delete('/:id',
  requireCustomerService,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const account = await Account.delete(req.params.id, req.user.id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting account:', error);
      next(error);
    }
  }
);

// Get account statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Account.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching account stats:', error);
    next(error);
  }
});

module.exports = router;