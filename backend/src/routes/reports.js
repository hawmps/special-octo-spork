const express = require('express');
const { authenticate, requireFieldManager } = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication and field manager role or higher
router.use(authenticate);
router.use(requireFieldManager);

// Dashboard overview
router.get('/dashboard', async (req, res, next) => {
  try {
    const queries = {
      accounts: `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE created_date >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
        FROM accounts
      `,
      workOrders: `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'new') as new,
          COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE priority = 'emergency') as emergency,
          COUNT(*) FILTER (WHERE scheduled_date >= CURRENT_DATE AND scheduled_date < CURRENT_DATE + INTERVAL '7 days') as scheduled_this_week
        FROM work_orders
      `,
      serviceAgents: `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave
        FROM service_agents
      `,
      revenue: `
        SELECT 
          SUM(wol.total_cost) as total_revenue,
          SUM(wol.total_cost) FILTER (WHERE wo.completion_date >= CURRENT_DATE - INTERVAL '30 days') as revenue_this_month,
          SUM(wol.total_cost) FILTER (WHERE wo.completion_date >= CURRENT_DATE - INTERVAL '7 days') as revenue_this_week
        FROM work_order_lines wol
        JOIN work_orders wo ON wol.work_order_id = wo.work_order_id
        WHERE wo.status = 'completed'
      `
    };

    const [accountsResult, workOrdersResult, agentsResult, revenueResult] = await Promise.all([
      db.query(queries.accounts),
      db.query(queries.workOrders),
      db.query(queries.serviceAgents),
      db.query(queries.revenue)
    ]);

    res.json({
      success: true,
      data: {
        accounts: accountsResult.rows[0],
        workOrders: workOrdersResult.rows[0],
        serviceAgents: agentsResult.rows[0],
        revenue: revenueResult.rows[0]
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    next(error);
  }
});

// Work order performance report
router.get('/work-orders/performance', async (req, res, next) => {
  try {
    const { start_date, end_date, agent_id } = req.query;
    
    let whereClause = "wo.status = 'completed'";
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (agent_id) {
      paramCount++;
      whereClause += ` AND wo.assigned_agent_id = $${paramCount}`;
      params.push(agent_id);
    }

    const query = `
      SELECT 
        CONCAT(c.first_name, ' ', c.last_name) as agent_name,
        sa.employee_id,
        COUNT(wo.work_order_id) as completed_work_orders,
        AVG(EXTRACT(EPOCH FROM (wo.completion_date - wo.created_date))/3600) as avg_completion_hours,
        SUM(wol.total_cost) as total_revenue,
        AVG(wol.total_cost) as avg_job_value
      FROM work_orders wo
      JOIN service_agents sa ON wo.assigned_agent_id = sa.agent_id
      JOIN contacts c ON sa.contact_id = c.contact_id
      LEFT JOIN work_order_lines wol ON wo.work_order_id = wol.work_order_id
      WHERE ${whereClause}
      GROUP BY sa.agent_id, c.first_name, c.last_name, sa.employee_id
      ORDER BY completed_work_orders DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching work order performance report:', error);
    next(error);
  }
});

// Revenue report
router.get('/revenue', async (req, res, next) => {
  try {
    const { start_date, end_date, group_by = 'month' } = req.query;
    
    let dateFormat;
    switch (group_by) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM';
    }

    let whereClause = "wo.status = 'completed'";
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date <= $${paramCount}`;
      params.push(end_date);
    }

    const query = `
      SELECT 
        TO_CHAR(wo.completion_date, '${dateFormat}') as period,
        COUNT(DISTINCT wo.work_order_id) as work_orders_completed,
        SUM(wol.labor_cost) as labor_revenue,
        SUM(wol.parts_cost) as parts_revenue,
        SUM(wol.total_cost) as total_revenue,
        AVG(wol.total_cost) as avg_job_value
      FROM work_orders wo
      LEFT JOIN work_order_lines wol ON wo.work_order_id = wol.work_order_id
      WHERE ${whereClause}
      GROUP BY TO_CHAR(wo.completion_date, '${dateFormat}')
      ORDER BY period DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching revenue report:', error);
    next(error);
  }
});

// Customer analysis report
router.get('/customers/analysis', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = "wo.status = 'completed'";
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date <= $${paramCount}`;
      params.push(end_date);
    }

    const query = `
      SELECT 
        a.account_id,
        a.company_name,
        a.account_type,
        COUNT(wo.work_order_id) as total_work_orders,
        SUM(wol.total_cost) as total_spent,
        AVG(wol.total_cost) as avg_job_value,
        MAX(wo.completion_date) as last_service_date,
        COUNT(DISTINCT ast.asset_id) as total_assets
      FROM accounts a
      LEFT JOIN work_orders wo ON a.account_id = wo.account_id
      LEFT JOIN work_order_lines wol ON wo.work_order_id = wol.work_order_id
      LEFT JOIN assets ast ON a.account_id = ast.account_id
      WHERE ${whereClause}
      GROUP BY a.account_id, a.company_name, a.account_type
      HAVING COUNT(wo.work_order_id) > 0
      ORDER BY total_spent DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching customer analysis report:', error);
    next(error);
  }
});

// Service type analysis
router.get('/service-types', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = "wo.status = 'completed'";
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND wo.completion_date <= $${paramCount}`;
      params.push(end_date);
    }

    const query = `
      SELECT 
        wo.service_type,
        COUNT(wo.work_order_id) as work_order_count,
        SUM(wol.total_cost) as total_revenue,
        AVG(wol.total_cost) as avg_revenue,
        AVG(EXTRACT(EPOCH FROM (wo.completion_date - wo.created_date))/3600) as avg_completion_hours
      FROM work_orders wo
      LEFT JOIN work_order_lines wol ON wo.work_order_id = wol.work_order_id
      WHERE ${whereClause} AND wo.service_type IS NOT NULL
      GROUP BY wo.service_type
      ORDER BY work_order_count DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching service type analysis:', error);
    next(error);
  }
});

// Asset maintenance report
router.get('/assets/maintenance', async (req, res, next) => {
  try {
    const { account_id, asset_type } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (account_id) {
      paramCount++;
      whereClause += ` AND a.account_id = $${paramCount}`;
      params.push(account_id);
    }

    if (asset_type) {
      paramCount++;
      whereClause += ` AND a.asset_type ILIKE $${paramCount}`;
      params.push(`%${asset_type}%`);
    }

    const query = `
      SELECT 
        a.asset_id,
        a.asset_type,
        a.brand,
        a.model,
        a.serial_number,
        a.installation_date,
        a.warranty_expiry,
        acc.company_name,
        COUNT(wol.line_id) as service_count,
        SUM(wol.total_cost) as total_maintenance_cost,
        MAX(wo.completion_date) as last_service_date,
        CASE 
          WHEN a.warranty_expiry < CURRENT_DATE THEN 'Expired'
          WHEN a.warranty_expiry < CURRENT_DATE + INTERVAL '90 days' THEN 'Expiring Soon'
          ELSE 'Active'
        END as warranty_status
      FROM assets a
      LEFT JOIN accounts acc ON a.account_id = acc.account_id
      LEFT JOIN work_order_lines wol ON a.asset_id = wol.asset_id
      LEFT JOIN work_orders wo ON wol.work_order_id = wo.work_order_id AND wo.status = 'completed'
      WHERE ${whereClause}
      GROUP BY a.asset_id, a.asset_type, a.brand, a.model, a.serial_number, a.installation_date, a.warranty_expiry, acc.company_name
      ORDER BY service_count DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching asset maintenance report:', error);
    next(error);
  }
});

// Parts usage report
router.get('/parts/usage', async (req, res, next) => {
  try {
    const { start_date, end_date, category } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND wop.created_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND wop.created_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (category) {
      paramCount++;
      whereClause += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    const query = `
      SELECT 
        p.part_id,
        p.part_number,
        p.name,
        p.category,
        p.brand,
        SUM(wop.quantity_used) as total_quantity_used,
        SUM(wop.total_cost) as total_cost,
        AVG(wop.unit_cost) as avg_unit_cost,
        COUNT(DISTINCT wo.work_order_id) as work_orders_count,
        p.quantity_on_hand,
        p.reorder_level
      FROM work_order_parts wop
      JOIN parts p ON wop.part_id = p.part_id
      JOIN work_order_lines wol ON wop.work_order_line_id = wol.line_id
      JOIN work_orders wo ON wol.work_order_id = wo.work_order_id
      WHERE ${whereClause}
      GROUP BY p.part_id, p.part_number, p.name, p.category, p.brand, p.quantity_on_hand, p.reorder_level
      ORDER BY total_quantity_used DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching parts usage report:', error);
    next(error);
  }
});

module.exports = router;