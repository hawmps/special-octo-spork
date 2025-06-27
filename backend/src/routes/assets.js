const express = require('express');
const { authenticate, requireCustomerService } = require('../middleware/auth');
const { validateAsset, validateUUID } = require('../middleware/validation');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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
      const query = `
        SELECT 
          a.*,
          acc.company_name,
          addr.street_address,
          addr.city,
          addr.state,
          addr.zip_code
        FROM assets a
        LEFT JOIN accounts acc ON a.account_id = acc.account_id
        LEFT JOIN addresses addr ON a.address_id = addr.address_id
        WHERE a.asset_id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      // Get service history
      const historyQuery = `
        SELECT 
          wo.work_order_id,
          wo.title,
          wo.status,
          wo.completion_date,
          wol.service_type,
          wol.description,
          CONCAT(c.first_name, ' ', c.last_name) as technician_name
        FROM work_order_lines wol
        JOIN work_orders wo ON wol.work_order_id = wo.work_order_id
        LEFT JOIN service_agents sa ON wo.assigned_agent_id = sa.agent_id
        LEFT JOIN contacts c ON sa.contact_id = c.contact_id
        WHERE wol.asset_id = $1
        ORDER BY wo.completion_date DESC
        LIMIT 10
      `;

      const historyResult = await db.query(historyQuery, [req.params.id]);

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          service_history: historyResult.rows
        }
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
      const {
        account_id,
        address_id,
        asset_type,
        brand,
        model,
        serial_number,
        installation_date,
        warranty_expiry,
        location_description,
        status = 'active',
        notes
      } = req.body;

      const query = `
        INSERT INTO assets (
          account_id, address_id, asset_type, brand, model, serial_number,
          installation_date, warranty_expiry, location_description, status, notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        RETURNING *
      `;

      const params = [
        account_id, address_id, asset_type, brand, model, serial_number,
        installation_date, warranty_expiry, location_description, status, notes, req.user.id
      ];

      const result = await db.query(query, params);

      logger.info('Asset created:', { assetId: result.rows[0].asset_id, userId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        data: result.rows[0]
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
  async (req, res, next) => {
    try {
      const allowedFields = [
        'asset_type', 'brand', 'model', 'serial_number', 'installation_date',
        'warranty_expiry', 'location_description', 'status', 'notes'
      ];
      
      const updates = [];
      const params = [req.params.id];
      let paramCount = 1;

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key) && req.body[key] !== undefined) {
          paramCount++;
          updates.push(`${key} = $${paramCount}`);
          params.push(req.body[key]);
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      paramCount++;
      updates.push(`updated_by = $${paramCount}`);
      params.push(req.user.id);

      const query = `
        UPDATE assets 
        SET ${updates.join(', ')}
        WHERE asset_id = $1
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      logger.info('Asset updated:', { assetId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Asset updated successfully',
        data: result.rows[0]
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
      const query = 'DELETE FROM assets WHERE asset_id = $1 RETURNING *';
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      logger.info('Asset deleted:', { assetId: req.params.id, userId: req.user.id });

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

module.exports = router;