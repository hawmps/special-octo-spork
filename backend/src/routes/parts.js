const express = require('express');
const { authenticate, requireFieldManager } = require('../middleware/auth');
const { validatePart, validateUUID } = require('../middleware/validation');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all parts
router.get('/', async (req, res, next) => {
  try {
    const { category, status, search, low_stock } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (part_number ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (low_stock === 'true') {
      whereClause += ` AND quantity_on_hand <= reorder_level`;
    }

    const query = `
      SELECT 
        *,
        CASE 
          WHEN quantity_on_hand <= reorder_level THEN true
          ELSE false
        END as needs_reorder
      FROM parts
      WHERE ${whereClause}
      ORDER BY part_number
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching parts:', error);
    next(error);
  }
});

// Get part by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const query = `
        SELECT 
          p.*,
          CASE 
            WHEN p.quantity_on_hand <= p.reorder_level THEN true
            ELSE false
          END as needs_reorder
        FROM parts p
        WHERE p.part_id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Part not found'
        });
      }

      // Get usage history
      const usageQuery = `
        SELECT 
          wop.quantity_used,
          wop.unit_cost,
          wop.total_cost,
          wop.created_date,
          wo.work_order_number,
          wo.title as work_order_title,
          a.company_name
        FROM work_order_parts wop
        JOIN work_order_lines wol ON wop.work_order_line_id = wol.line_id
        JOIN work_orders wo ON wol.work_order_id = wo.work_order_id
        JOIN accounts a ON wo.account_id = a.account_id
        WHERE wop.part_id = $1
        ORDER BY wop.created_date DESC
        LIMIT 20
      `;

      const usageResult = await db.query(usageQuery, [req.params.id]);

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          usage_history: usageResult.rows
        }
      });

    } catch (error) {
      logger.error('Error fetching part:', error);
      next(error);
    }
  }
);

// Create new part
router.post('/',
  requireFieldManager,
  validatePart,
  async (req, res, next) => {
    try {
      const {
        part_number,
        name,
        description,
        category,
        brand,
        unit_cost,
        unit_price,
        quantity_on_hand = 0,
        reorder_level = 0,
        status = 'active'
      } = req.body;

      const query = `
        INSERT INTO parts (
          part_number, name, description, category, brand, unit_cost, unit_price, 
          quantity_on_hand, reorder_level, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING *
      `;

      const params = [
        part_number, name, description, category, brand, unit_cost, unit_price,
        quantity_on_hand, reorder_level, status, req.user.id
      ];

      const result = await db.query(query, params);

      logger.info('Part created:', { partId: result.rows[0].part_id, userId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Part created successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error creating part:', error);
      next(error);
    }
  }
);

// Update part
router.put('/:id',
  requireFieldManager,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const allowedFields = [
        'name', 'description', 'category', 'brand', 'unit_cost', 'unit_price',
        'quantity_on_hand', 'reorder_level', 'status'
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
        UPDATE parts 
        SET ${updates.join(', ')}
        WHERE part_id = $1
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Part not found'
        });
      }

      logger.info('Part updated:', { partId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Part updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error updating part:', error);
      next(error);
    }
  }
);

// Adjust inventory
router.patch('/:id/inventory',
  requireFieldManager,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const { adjustment, reason } = req.body;

      if (typeof adjustment !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Adjustment must be a number'
        });
      }

      const query = `
        UPDATE parts 
        SET quantity_on_hand = quantity_on_hand + $2,
            updated_by = $3
        WHERE part_id = $1
        RETURNING *
      `;

      const result = await db.query(query, [req.params.id, adjustment, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Part not found'
        });
      }

      logger.info('Inventory adjusted:', { 
        partId: req.params.id, 
        adjustment, 
        reason, 
        userId: req.user.id 
      });

      res.json({
        success: true,
        message: 'Inventory adjusted successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error adjusting inventory:', error);
      next(error);
    }
  }
);

// Get parts categories
router.get('/categories/list', async (req, res, next) => {
  try {
    const query = `
      SELECT DISTINCT category
      FROM parts
      WHERE category IS NOT NULL AND status = 'active'
      ORDER BY category
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => row.category)
    });

  } catch (error) {
    logger.error('Error fetching part categories:', error);
    next(error);
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        part_id,
        part_number,
        name,
        quantity_on_hand,
        reorder_level,
        (reorder_level - quantity_on_hand) as shortage
      FROM parts
      WHERE quantity_on_hand <= reorder_level
      AND status = 'active'
      ORDER BY (reorder_level - quantity_on_hand) DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching low stock alerts:', error);
    next(error);
  }
});

module.exports = router;