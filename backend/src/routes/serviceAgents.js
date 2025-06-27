const express = require('express');
const { authenticate, requireFieldManager } = require('../middleware/auth');
const { validateServiceAgent, validateUUID } = require('../middleware/validation');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all service agents
router.get('/', async (req, res, next) => {
  try {
    const { status, territory, specialization } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND sa.status = $${paramCount}`;
      params.push(status);
    }

    if (territory) {
      paramCount++;
      whereClause += ` AND sa.territory ILIKE $${paramCount}`;
      params.push(`%${territory}%`);
    }

    if (specialization) {
      paramCount++;
      whereClause += ` AND $${paramCount} = ANY(sa.specializations)`;
      params.push(specialization);
    }

    const query = `
      SELECT 
        sa.*,
        CONCAT(c.first_name, ' ', c.last_name) as full_name,
        c.email,
        c.phone,
        (SELECT COUNT(*) FROM work_orders wo WHERE wo.assigned_agent_id = sa.agent_id AND wo.status IN ('assigned', 'in_progress')) as active_work_orders
      FROM service_agents sa
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
      WHERE ${whereClause}
      ORDER BY c.first_name, c.last_name
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching service agents:', error);
    next(error);
  }
});

// Get service agent by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const query = `
        SELECT 
          sa.*,
          CONCAT(c.first_name, ' ', c.last_name) as full_name,
          c.email,
          c.phone,
          c.mobile_phone,
          a.company_name
        FROM service_agents sa
        LEFT JOIN contacts c ON sa.contact_id = c.contact_id
        LEFT JOIN accounts a ON c.account_id = a.account_id
        WHERE sa.agent_id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Service agent not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
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
      const {
        contact_id,
        employee_id,
        specializations,
        certification_level = 'junior',
        hire_date,
        territory,
        hourly_rate,
        status = 'active'
      } = req.body;

      const query = `
        INSERT INTO service_agents (
          contact_id, employee_id, specializations, certification_level, 
          hire_date, territory, hourly_rate, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *
      `;

      const params = [
        contact_id, employee_id, specializations, certification_level,
        hire_date, territory, hourly_rate, status, req.user.id
      ];

      const result = await db.query(query, params);

      logger.info('Service agent created:', { agentId: result.rows[0].agent_id, userId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Service agent created successfully',
        data: result.rows[0]
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
      const allowedFields = [
        'specializations', 'certification_level', 'territory', 'hourly_rate', 'status'
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
        UPDATE service_agents 
        SET ${updates.join(', ')}
        WHERE agent_id = $1
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Service agent not found'
        });
      }

      logger.info('Service agent updated:', { agentId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Service agent updated successfully',
        data: result.rows[0]
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
      const targetDate = date || new Date().toISOString().split('T')[0];

      const query = `
        SELECT 
          wo.work_order_id,
          wo.title,
          wo.scheduled_date,
          wo.estimated_duration,
          wo.status
        FROM work_orders wo
        WHERE wo.assigned_agent_id = $1
        AND DATE(wo.scheduled_date) = $2
        AND wo.status IN ('assigned', 'in_progress')
        ORDER BY wo.scheduled_date
      `;

      const result = await db.query(query, [req.params.id, targetDate]);

      res.json({
        success: true,
        data: {
          date: targetDate,
          scheduled_work_orders: result.rows
        }
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
      const query = `
        SELECT 
          COUNT(*) as total_work_orders,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
          COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress')) as active_work_orders,
          COUNT(*) FILTER (WHERE created_date >= CURRENT_DATE - INTERVAL '30 days') as work_orders_this_month,
          AVG(EXTRACT(EPOCH FROM (completion_date - created_date))/3600) FILTER (WHERE completion_date IS NOT NULL) as avg_completion_hours
        FROM work_orders
        WHERE assigned_agent_id = $1
      `;

      const result = await db.query(query, [req.params.id]);

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      next(error);
    }
  }
);

module.exports = router;