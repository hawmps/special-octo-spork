const express = require('express');
const { authenticate, requireCustomerService } = require('../middleware/auth');
const { validateOpportunity, validateUUID } = require('../middleware/validation');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all opportunities
router.get('/', async (req, res, next) => {
  try {
    const { stage, account_id, search } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (stage) {
      paramCount++;
      whereClause += ` AND o.stage = $${paramCount}`;
      params.push(stage);
    }

    if (account_id) {
      paramCount++;
      whereClause += ` AND o.account_id = $${paramCount}`;
      params.push(account_id);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (o.title ILIKE $${paramCount} OR a.company_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const query = `
      SELECT 
        o.*,
        a.company_name,
        CASE 
          WHEN o.stage = 'closed_won' THEN o.estimated_value
          ELSE o.estimated_value * (o.probability / 100.0)
        END as weighted_value
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.account_id
      WHERE ${whereClause}
      ORDER BY o.expected_close_date ASC NULLS LAST, o.created_date DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    next(error);
  }
});

// Get opportunity by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const query = `
        SELECT 
          o.*,
          a.company_name,
          a.billing_address,
          a.phone,
          a.email
        FROM opportunities o
        LEFT JOIN accounts a ON o.account_id = a.account_id
        WHERE o.opportunity_id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Opportunity not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error fetching opportunity:', error);
      next(error);
    }
  }
);

// Create new opportunity
router.post('/',
  requireCustomerService,
  validateOpportunity,
  async (req, res, next) => {
    try {
      const {
        account_id,
        title,
        description,
        estimated_value,
        probability = 50,
        stage = 'prospecting',
        expected_close_date
      } = req.body;

      const query = `
        INSERT INTO opportunities (
          account_id, title, description, estimated_value, probability, stage, expected_close_date, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        RETURNING *
      `;

      const params = [account_id, title, description, estimated_value, probability, stage, expected_close_date, req.user.id];
      const result = await db.query(query, params);

      logger.info('Opportunity created:', { opportunityId: result.rows[0].opportunity_id, userId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Opportunity created successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error creating opportunity:', error);
      next(error);
    }
  }
);

// Update opportunity
router.put('/:id',
  requireCustomerService,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const allowedFields = [
        'title', 'description', 'estimated_value', 'probability', 'stage', 
        'expected_close_date', 'actual_close_date'
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
        UPDATE opportunities 
        SET ${updates.join(', ')}
        WHERE opportunity_id = $1
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Opportunity not found'
        });
      }

      logger.info('Opportunity updated:', { opportunityId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Opportunity updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error updating opportunity:', error);
      next(error);
    }
  }
);

// Delete opportunity
router.delete('/:id',
  requireCustomerService,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const query = 'DELETE FROM opportunities WHERE opportunity_id = $1 RETURNING *';
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Opportunity not found'
        });
      }

      logger.info('Opportunity deleted:', { opportunityId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Opportunity deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting opportunity:', error);
      next(error);
    }
  }
);

// Get opportunity statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_opportunities,
        COUNT(*) FILTER (WHERE stage = 'prospecting') as prospecting,
        COUNT(*) FILTER (WHERE stage = 'qualification') as qualification,
        COUNT(*) FILTER (WHERE stage = 'proposal') as proposal,
        COUNT(*) FILTER (WHERE stage = 'negotiation') as negotiation,
        COUNT(*) FILTER (WHERE stage = 'closed_won') as closed_won,
        COUNT(*) FILTER (WHERE stage = 'closed_lost') as closed_lost,
        SUM(estimated_value) FILTER (WHERE stage = 'closed_won') as total_won_value,
        SUM(estimated_value * (probability / 100.0)) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as weighted_pipeline_value,
        AVG(probability) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as avg_probability
      FROM opportunities
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching opportunity stats:', error);
    next(error);
  }
});

module.exports = router;