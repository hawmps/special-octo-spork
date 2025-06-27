const db = require('../config/database');
const logger = require('../config/logger');

class ServiceAgent {
  static async findAll(options = {}) {
    const { page = 1, limit = 20, search, status, territory, specialization, certification_level } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR sa.employee_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

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

    if (certification_level) {
      paramCount++;
      whereClause += ` AND sa.certification_level = $${paramCount}`;
      params.push(certification_level);
    }

    const query = `
      SELECT 
        sa.agent_id,
        sa.contact_id,
        sa.employee_id,
        sa.specializations,
        sa.certification_level,
        sa.hire_date,
        sa.territory,
        sa.hourly_rate,
        sa.status,
        sa.created_date,
        sa.updated_date,
        CONCAT(c.first_name, ' ', c.last_name) as full_name,
        c.email,
        c.phone,
        c.mobile_phone,
        (SELECT COUNT(*) FROM work_orders wo WHERE wo.assigned_agent_id = sa.agent_id AND wo.status IN ('assigned', 'in_progress')) as active_work_orders
      FROM service_agents sa
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
      WHERE ${whereClause}
      ORDER BY c.first_name, c.last_name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) 
      FROM service_agents sa
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
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
      logger.error('Error fetching service agents:', error);
      throw error;
    }
  }

  static async findById(id) {
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

    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching service agent by id:', error);
      throw error;
    }
  }

  static async create(agentData, userId) {
    const {
      contact_id,
      employee_id,
      specializations,
      certification_level = 'junior',
      hire_date,
      territory,
      hourly_rate,
      status = 'active'
    } = agentData;

    const query = `
      INSERT INTO service_agents (
        contact_id, employee_id, specializations, certification_level, 
        hire_date, territory, hourly_rate, status, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *
    `;

    const params = [
      contact_id, employee_id, specializations, certification_level,
      hire_date, territory, hourly_rate, status, userId
    ];

    try {
      const result = await db.query(query, params);
      logger.info('Service agent created:', { agentId: result.rows[0].agent_id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating service agent:', error);
      throw error;
    }
  }

  static async update(id, agentData, userId) {
    const allowedFields = [
      'specializations', 'certification_level', 'territory', 'hourly_rate', 'status'
    ];
    
    const updates = [];
    const params = [id];
    let paramCount = 1;

    Object.keys(agentData).forEach(key => {
      if (allowedFields.includes(key) && agentData[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        params.push(agentData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    updates.push(`updated_by = $${paramCount}`);
    params.push(userId);

    const query = `
      UPDATE service_agents 
      SET ${updates.join(', ')}
      WHERE agent_id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, params);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Service agent updated:', { agentId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating service agent:', error);
      throw error;
    }
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM service_agents WHERE agent_id = $1 RETURNING *';

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Service agent deleted:', { agentId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting service agent:', error);
      throw error;
    }
  }

  static async getAvailability(id, date) {
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

    try {
      const result = await db.query(query, [id, targetDate]);
      return {
        date: targetDate,
        scheduled_work_orders: result.rows
      };
    } catch (error) {
      logger.error('Error fetching agent availability:', error);
      throw error;
    }
  }

  static async getStats(id) {
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

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      throw error;
    }
  }

  static async getOverallStats() {
    const query = `
      SELECT 
        COUNT(*) as total_agents,
        COUNT(*) FILTER (WHERE status = 'active') as active_agents,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_agents,
        COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave_agents,
        COUNT(*) FILTER (WHERE certification_level = 'master') as master_technicians,
        COUNT(*) FILTER (WHERE certification_level = 'supervisor') as supervisors,
        COUNT(*) FILTER (WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days') as new_hires_this_month
      FROM service_agents
    `;

    try {
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching service agent stats:', error);
      throw error;
    }
  }

  static async getSpecializations() {
    const query = `
      SELECT DISTINCT unnest(specializations) as specialization
      FROM service_agents
      WHERE specializations IS NOT NULL
      ORDER BY specialization
    `;

    try {
      const result = await db.query(query);
      return result.rows.map(row => row.specialization);
    } catch (error) {
      logger.error('Error fetching specializations:', error);
      throw error;
    }
  }

  static async getTerritories() {
    const query = `
      SELECT DISTINCT territory
      FROM service_agents
      WHERE territory IS NOT NULL AND territory != ''
      ORDER BY territory
    `;

    try {
      const result = await db.query(query);
      return result.rows.map(row => row.territory);
    } catch (error) {
      logger.error('Error fetching territories:', error);
      throw error;
    }
  }
}

module.exports = ServiceAgent;