const db = require('../config/database');
const logger = require('../config/logger');

class WorkOrder {
  static async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      priority, 
      assigned_agent_id,
      account_id,
      start_date,
      end_date 
    } = options;
    const offset = (page - 1) * limit;
    
    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist, returning empty result');
      return {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      };
    }

    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (wo.title ILIKE $${paramCount} OR wo.work_order_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND wo.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      whereClause += ` AND wo.priority = $${paramCount}`;
      params.push(priority);
    }

    if (assigned_agent_id) {
      paramCount++;
      whereClause += ` AND wo.assigned_agent_id = $${paramCount}`;
      params.push(assigned_agent_id);
    }

    if (account_id) {
      paramCount++;
      whereClause += ` AND wo.account_id = $${paramCount}`;
      params.push(account_id);
    }

    if (start_date) {
      paramCount++;
      whereClause += ` AND wo.scheduled_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND wo.scheduled_date <= $${paramCount}`;
      params.push(end_date);
    }

    const query = `
      SELECT 
        wo.*,
        a.company_name,
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unassigned') as agent_name,
        sa.employee_id as agent_employee_id,
        'N/A' as street_address,
        'N/A' as city,
        'N/A' as state,
        0 as line_count,
        0 as total_cost
      FROM work_orders wo
      LEFT JOIN accounts a ON wo.account_id = a.account_id
      LEFT JOIN service_agents sa ON wo.assigned_agent_id = sa.agent_id
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
      WHERE ${whereClause}
      ORDER BY 
        CASE wo.priority 
          WHEN 'emergency' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        wo.scheduled_date ASC NULLS LAST,
        wo.created_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) 
      FROM work_orders wo
      WHERE ${whereClause}
    `;
    const countParams = params.slice(0, -2);

    try {
      const [result, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, countParams)
      ]);

      return {
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching work orders:', error);
      throw error;
    }
  }

  static async findById(id) {
    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist');
      return null;
    }

    const query = `
      SELECT 
        wo.*,
        a.company_name,
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unassigned') as agent_name,
        sa.employee_id as agent_employee_id,
        sa.specializations,
        'N/A' as street_address,
        'N/A' as city,
        'N/A' as state,
        'N/A' as zip_code,
        '[]'::json as lines,
        '[]'::json as attachments
      FROM work_orders wo
      LEFT JOIN accounts a ON wo.account_id = a.account_id
      LEFT JOIN service_agents sa ON wo.assigned_agent_id = sa.agent_id
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
      WHERE wo.work_order_id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching work order by id:', error);
      throw error;
    }
  }

  static async create(workOrderData, userId) {
    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.error('Work orders table does not exist, cannot create work order');
      throw new Error('Work orders functionality is not available');
    }

    const {
      account_id,
      assigned_agent_id,
      address_id,
      title,
      description,
      priority = 'medium',
      status = 'new',
      service_type,
      scheduled_date,
      estimated_duration,
      notes
    } = workOrderData;

    // Generate work order number if not provided
    const workOrderNumber = workOrderData.work_order_number || 
      `WO-${new Date().getFullYear()}-${String(Math.floor(Date.now() / 1000)).slice(-6)}`;

    const query = `
      INSERT INTO work_orders (
        work_order_number, account_id, assigned_agent_id, address_id, title, description, 
        priority, status, service_type, scheduled_date, estimated_duration, 
        notes, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      RETURNING *
    `;

    const params = [
      workOrderNumber, account_id, assigned_agent_id, address_id, title, description,
      priority, status, service_type, scheduled_date, estimated_duration,
      notes, userId
    ];

    try {
      const result = await db.query(query, params);
      logger.info('Work order created:', { workOrderId: result.rows[0].work_order_id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating work order:', error);
      throw error;
    }
  }

  static async update(id, workOrderData, userId) {
    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.error('Work orders table does not exist, cannot update work order');
      throw new Error('Work orders functionality is not available');
    }

    const allowedFields = [
      'assigned_agent_id', 'title', 'description', 'priority', 'status',
      'service_type', 'scheduled_date', 'estimated_duration', 'actual_start_time',
      'actual_end_time', 'completion_date', 'notes', 'internal_notes',
      'customer_signature_url'
    ];
    
    const updates = [];
    const params = [id];
    let paramCount = 1;

    Object.keys(workOrderData).forEach(key => {
      if (allowedFields.includes(key) && workOrderData[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        params.push(workOrderData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    updates.push(`updated_by = $${paramCount}`);
    params.push(userId);

    const query = `
      UPDATE work_orders 
      SET ${updates.join(', ')}
      WHERE work_order_id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, params);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Work order updated:', { workOrderId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating work order:', error);
      throw error;
    }
  }

  static async delete(id, userId) {
    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.error('Work orders table does not exist, cannot delete work order');
      throw new Error('Work orders functionality is not available');
    }

    const query = 'DELETE FROM work_orders WHERE work_order_id = $1 RETURNING *';

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Work order deleted:', { workOrderId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting work order:', error);
      throw error;
    }
  }

  static async getStats() {
    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist, returning empty stats');
      return {
        total_work_orders: 0,
        new_work_orders: 0,
        assigned_work_orders: 0,
        in_progress_work_orders: 0,
        completed_work_orders: 0,
        emergency_work_orders: 0,
        high_priority_work_orders: 0,
        scheduled_this_week: 0,
        created_this_month: 0,
        avg_completion_hours: null
      };
    }

    const query = `
      SELECT 
        COUNT(*) as total_work_orders,
        COUNT(*) FILTER (WHERE status = 'new') as new_work_orders,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_work_orders,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_work_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
        COUNT(*) FILTER (WHERE priority = 'emergency') as emergency_work_orders,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_work_orders,
        COUNT(*) FILTER (WHERE scheduled_date >= CURRENT_DATE AND scheduled_date < CURRENT_DATE + INTERVAL '7 days') as scheduled_this_week,
        COUNT(*) FILTER (WHERE created_date >= CURRENT_DATE - INTERVAL '30 days') as created_this_month,
        AVG(EXTRACT(EPOCH FROM (completion_date - created_date))/3600) FILTER (WHERE completion_date IS NOT NULL) as avg_completion_hours
      FROM work_orders
    `;

    try {
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching work order stats:', error);
      throw error;
    }
  }

  static async getByAgent(agentId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    // First, check if work_orders table exists
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist');
      return [];
    }

    let whereClause = 'assigned_agent_id = $1';
    const params = [agentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    const query = `
      SELECT 
        wo.*,
        a.company_name,
        'N/A' as street_address,
        'N/A' as city,
        'N/A' as state
      FROM work_orders wo
      LEFT JOIN accounts a ON wo.account_id = a.account_id
      WHERE ${whereClause}
      ORDER BY 
        CASE wo.priority 
          WHEN 'emergency' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        wo.scheduled_date ASC NULLS LAST
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching work orders by agent:', error);
      throw error;
    }
  }
}

module.exports = WorkOrder;