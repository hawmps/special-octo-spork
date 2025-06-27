const express = require('express');
const { authenticate, requireFieldManager } = require('../middleware/auth');
const { validateServiceAgent, validateUUID, validatePagination, validateSearch } = require('../middleware/validation');
const ServiceAgent = require('../models/ServiceAgent');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all service agents
router.get('/', 
  validatePagination,
  validateSearch,
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search,
        status: req.query.status,
        territory: req.query.territory,
        specialization: req.query.specialization,
        certification_level: req.query.certification_level
      };

      const result = await ServiceAgent.findAll(options);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error fetching service agents:', error);
      next(error);
    }
  }
);

// Get service agent by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const agent = await ServiceAgent.findById(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Service agent not found'
        });
      }

      res.json({
        success: true,
        data: agent
      });

    } catch (error) {
      logger.error('Error fetching service agent:', error);
      next(error);
    }
  }
);

// Create new service agent
router.post('/',
  requireFieldManager,
  validateServiceAgent,
  async (req, res, next) => {
    try {
      const agent = await ServiceAgent.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Service agent created successfully',
        data: agent
      });

    } catch (error) {
      logger.error('Error creating service agent:', error);
      next(error);
    }
  }
);

// Update service agent
router.put('/:id',
  requireFieldManager,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const agent = await ServiceAgent.update(req.params.id, req.body, req.user.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Service agent not found'
        });
      }

      res.json({
        success: true,
        message: 'Service agent updated successfully',
        data: agent
      });

    } catch (error) {
      logger.error('Error updating service agent:', error);
      next(error);
    }
  }
);

// Get agent availability
router.get('/:id/availability', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const { date } = req.query;
      const availability = await ServiceAgent.getAvailability(req.params.id, date);

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      logger.error('Error fetching agent availability:', error);
      next(error);
    }
  }
);

// Get agent statistics
router.get('/:id/stats', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const stats = await ServiceAgent.getStats(req.params.id);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      next(error);
    }
  }
);

// Delete service agent
router.delete('/:id',
  requireFieldManager,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const agent = await ServiceAgent.delete(req.params.id, req.user.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Service agent not found'
        });
      }

      res.json({
        success: true,
        message: 'Service agent deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting service agent:', error);
      next(error);
    }
  }
);

// Get overall statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await ServiceAgent.getOverallStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching service agent stats:', error);
    next(error);
  }
});

// Get available specializations
router.get('/specializations/list', async (req, res, next) => {
  try {
    const specializations = await ServiceAgent.getSpecializations();

    res.json({
      success: true,
      data: specializations
    });

  } catch (error) {
    logger.error('Error fetching specializations:', error);
    next(error);
  }
});

// Get available territories
router.get('/territories/list', async (req, res, next) => {
  try {
    const territories = await ServiceAgent.getTerritories();

    res.json({
      success: true,
      data: territories
    });

  } catch (error) {
    logger.error('Error fetching territories:', error);
    next(error);
  }
});

module.exports = router;