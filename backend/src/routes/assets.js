const express = require('express');
const { authenticate, requireCustomerService } = require('../middleware/auth');
const { validateAsset, validateUUID, validatePagination, validateSearch } = require('../middleware/validation');
const Asset = require('../models/Asset');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all assets
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
        account_id: req.query.account_id,
        asset_type: req.query.asset_type
      };

      const result = await Asset.findAll(options);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error fetching assets:', error);
      next(error);
    }
  }
);

// Get all assets for an account
router.get('/account/:accountId', 
  validateUUID('accountId'),
  async (req, res, next) => {
    try {
      const { status, asset_type } = req.query;
      
      let whereClause = 'account_id = $1';
      const params = [req.params.accountId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (asset_type) {
        paramCount++;
        whereClause += ` AND asset_type ILIKE $${paramCount}`;
        params.push(`%${asset_type}%`);
      }

      const query = `
        SELECT 
          a.*,
          addr.street_address,
          addr.city,
          addr.state,
          (SELECT COUNT(*) FROM work_order_lines wol WHERE wol.asset_id = a.asset_id) as service_count
        FROM assets a
        LEFT JOIN addresses addr ON a.address_id = addr.address_id
        WHERE ${whereClause}
        ORDER BY a.installation_date DESC
      `;
      
      const result = await db.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Error fetching assets:', error);
      next(error);
    }
  }
);

// Get asset by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const asset = await Asset.findById(req.params.id);

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.json({
        success: true,
        data: asset
      });

    } catch (error) {
      logger.error('Error fetching asset:', error);
      next(error);
    }
  }
);

// Create new asset
router.post('/',
  requireCustomerService,
  validateAsset,
  async (req, res, next) => {
    try {
      const asset = await Asset.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        data: asset
      });

    } catch (error) {
      logger.error('Error creating asset:', error);
      next(error);
    }
  }
);

// Update asset
router.put('/:id',
  requireCustomerService,
  validateUUID('id'),
  validateAsset,
  async (req, res, next) => {
    try {
      const asset = await Asset.update(req.params.id, req.body, req.user.id);

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.json({
        success: true,
        message: 'Asset updated successfully',
        data: asset
      });

    } catch (error) {
      logger.error('Error updating asset:', error);
      next(error);
    }
  }
);

// Delete asset
router.delete('/:id',
  requireCustomerService,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const asset = await Asset.delete(req.params.id, req.user.id);

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting asset:', error);
      next(error);
    }
  }
);

// Get asset statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Asset.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching asset stats:', error);
    next(error);
  }
});

module.exports = router;