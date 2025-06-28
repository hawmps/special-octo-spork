const db = require('../config/database');
const logger = require('../config/logger');

class Schedule {
  // Get agent availability for a specific date range
  static async getAgentAvailability(agentId, startDate, endDate) {
    try {
      await db.query('SELECT 1 FROM service_agents LIMIT 1');
    } catch (error) {
      logger.info('Service agents table does not exist');
      return [];
    }

    const query = `
      SELECT 
        sa.agent_id,
        sa.employee_id,
        CONCAT(c.first_name, ' ', c.last_name) as agent_name,
        sa.status,
        sa.territory,
        sa.specializations,
        COALESCE(
          json_agg(
            CASE WHEN wo.work_order_id IS NOT NULL THEN
              json_build_object(
                'work_order_id', wo.work_order_id,
                'work_order_number', wo.work_order_number,
                'title', wo.title,
                'account_name', acc.company_name,
                'scheduled_date', wo.scheduled_date,
                'estimated_duration', wo.estimated_duration,
                'status', wo.status,
                'priority', wo.priority,
                'address', 'N/A'
              )
            END
          ) FILTER (WHERE wo.work_order_id IS NOT NULL),
          '[]'::json
        ) as scheduled_work_orders
      FROM service_agents sa
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
      LEFT JOIN work_orders wo ON sa.agent_id = wo.assigned_agent_id 
        AND wo.scheduled_date BETWEEN $2 AND $3
        AND wo.status NOT IN ('completed', 'cancelled')
      LEFT JOIN accounts acc ON wo.account_id = acc.account_id
      WHERE sa.agent_id = $1 AND sa.status = 'active'
      GROUP BY sa.agent_id, sa.employee_id, c.first_name, c.last_name, sa.status, sa.territory, sa.specializations
    `;

    try {
      const result = await db.query(query, [agentId, startDate, endDate]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching agent availability:', error);
      throw error;
    }
  }

  // Get all agents availability for a date range
  static async getAllAgentsAvailability(startDate, endDate, territory = null) {
    try {
      await db.query('SELECT 1 FROM service_agents LIMIT 1');
    } catch (error) {
      logger.info('Service agents table does not exist, returning mock data');
      // Return mock data for development when database is not available
      return [
        {
          agent_id: 'mock-agent-1',
          employee_id: 'EMP001',
          agent_name: 'John Smith',
          status: 'active',
          territory: 'North',
          specializations: ['HVAC', 'Electrical'],
          certification_level: 'senior',
          scheduled_count: 2,
          total_scheduled_minutes: 480,
          scheduled_work_orders: [
            {
              work_order_id: 'mock-wo-1',
              work_order_number: 'WO-2024-001',
              title: 'HVAC Maintenance',
              account_name: 'ABC Corp',
              scheduled_date: startDate,
              estimated_duration: 240,
              status: 'assigned',
              priority: 'medium',
              address: '123 Main St'
            }
          ]
        },
        {
          agent_id: 'mock-agent-2',
          employee_id: 'EMP002',
          agent_name: 'Sarah Johnson',
          status: 'active',
          territory: 'South',
          specializations: ['Plumbing', 'General Maintenance'],
          certification_level: 'master',
          scheduled_count: 1,
          total_scheduled_minutes: 240,
          scheduled_work_orders: [
            {
              work_order_id: 'mock-wo-2',
              work_order_number: 'WO-2024-002',
              title: 'Plumbing Repair',
              account_name: 'XYZ Inc',
              scheduled_date: endDate,
              estimated_duration: 240,
              status: 'assigned',
              priority: 'high',
              address: '456 Oak Ave'
            }
          ]
        }
      ];
    }

    let whereClause = "sa.status = 'active'";
    const params = [startDate, endDate];
    let paramCount = 2;

    if (territory) {
      paramCount++;
      whereClause += ` AND sa.territory = $${paramCount}`;
      params.push(territory);
    }

    const query = `
      SELECT 
        sa.agent_id,
        sa.employee_id,
        CONCAT(c.first_name, ' ', c.last_name) as agent_name,
        sa.status,
        sa.territory,
        sa.specializations,
        sa.certification_level,
        COUNT(wo.work_order_id) as scheduled_count,
        COALESCE(SUM(wo.estimated_duration), 0) as total_scheduled_minutes,
        COALESCE(
          json_agg(
            CASE WHEN wo.work_order_id IS NOT NULL THEN
              json_build_object(
                'work_order_id', wo.work_order_id,
                'work_order_number', wo.work_order_number,
                'title', wo.title,
                'account_name', acc.company_name,
                'scheduled_date', wo.scheduled_date,
                'estimated_duration', wo.estimated_duration,
                'status', wo.status,
                'priority', wo.priority,
                'address', 'N/A'
              )
            END
          ) FILTER (WHERE wo.work_order_id IS NOT NULL),
          '[]'::json
        ) as scheduled_work_orders
      FROM service_agents sa
      LEFT JOIN contacts c ON sa.contact_id = c.contact_id
      LEFT JOIN work_orders wo ON sa.agent_id = wo.assigned_agent_id 
        AND wo.scheduled_date BETWEEN $1 AND $2
        AND wo.status NOT IN ('completed', 'cancelled')
      LEFT JOIN accounts acc ON wo.account_id = acc.account_id
      WHERE ${whereClause}
      GROUP BY sa.agent_id, sa.employee_id, c.first_name, c.last_name, sa.status, sa.territory, sa.specializations, sa.certification_level
      ORDER BY sa.employee_id
    `;

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching all agents availability:', error);
      throw error;
    }
  }

  // Get unassigned work orders
  static async getUnassignedWorkOrders(options = {}) {
    const { priority, territory, limit = 50 } = options;

    try {
      // Check if the work_orders table exists and has the required columns
      await db.query('SELECT work_order_id, work_order_number, title, priority, status FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist or missing columns, returning mock data');
      // Return mock unassigned work orders for development
      return [
        {
          work_order_id: 'mock-unassigned-1',
          work_order_number: 'WO-2024-003',
          title: 'Emergency Heating Repair',
          description: 'Customer reports no heat in building',
          priority: 'emergency',
          status: 'new',
          service_type: 'HVAC',
          scheduled_date: null,
          estimated_duration: 180,
          created_date: new Date().toISOString(),
          company_name: 'Emergency Corp',
          account_type: 'commercial',
          address: '789 Emergency St',
          city: 'Downtown',
          state: 'CA'
        },
        {
          work_order_id: 'mock-unassigned-2',
          work_order_number: 'WO-2024-004',
          title: 'Routine Maintenance',
          description: 'Quarterly equipment inspection',
          priority: 'low',
          status: 'new',
          service_type: 'General Maintenance',
          scheduled_date: null,
          estimated_duration: 120,
          created_date: new Date().toISOString(),
          company_name: 'Regular Customer LLC',
          account_type: 'commercial',
          address: '321 Routine Ave',
          city: 'Suburbia',
          state: 'CA'
        }
      ];
    }

    let whereClause = "wo.assigned_agent_id IS NULL AND wo.status = 'new'";
    const params = [];
    let paramCount = 0;

    if (priority) {
      paramCount++;
      whereClause += ` AND wo.priority = $${paramCount}`;
      params.push(priority);
    }

    const query = `
      SELECT 
        wo.work_order_id,
        wo.work_order_number,
        wo.title,
        wo.description,
        wo.priority,
        wo.status,
        wo.service_type,
        wo.scheduled_date,
        wo.estimated_duration,
        wo.created_date,
        acc.company_name,
        acc.account_type,
        'N/A' as address,
        'N/A' as city,
        'N/A' as state
      FROM work_orders wo
      JOIN accounts acc ON wo.account_id = acc.account_id
      WHERE ${whereClause}
      ORDER BY 
        CASE wo.priority 
          WHEN 'emergency' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        wo.scheduled_date ASC NULLS LAST,
        wo.created_date ASC
      LIMIT $${paramCount + 1}
    `;

    params.push(limit);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching unassigned work orders:', error);
      throw error;
    }
  }

  // Assign work order to agent
  static async assignWorkOrder(workOrderId, agentId, scheduledDate, userId) {
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.error('Work orders table does not exist');
      throw new Error('Work orders functionality is not available');
    }

    const query = `
      UPDATE work_orders 
      SET 
        assigned_agent_id = $2,
        scheduled_date = $3,
        status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END,
        updated_by = $4,
        updated_date = NOW()
      WHERE work_order_id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [workOrderId, agentId, scheduledDate, userId]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const workOrder = result.rows[0];
      logger.info('Work order assigned:', { workOrderId, agentId, userId });
      
      // Send notification to agent
      await this.sendAssignmentNotification(workOrder, agentId);
      
      return workOrder;
    } catch (error) {
      logger.error('Error assigning work order:', error);
      throw error;
    }
  }

  // Bulk assign multiple work orders
  static async bulkAssignWorkOrders(assignments, userId) {
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.error('Work orders table does not exist');
      throw new Error('Work orders functionality is not available');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const assignment of assignments) {
        const { workOrderId, agentId, scheduledDate } = assignment;
        
        const query = `
          UPDATE work_orders 
          SET 
            assigned_agent_id = $2,
            scheduled_date = $3,
            status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END,
            updated_by = $4,
            updated_date = NOW()
          WHERE work_order_id = $1
          RETURNING *
        `;

        const result = await client.query(query, [workOrderId, agentId, scheduledDate, userId]);
        if (result.rows.length > 0) {
          const workOrder = result.rows[0];
          results.push(workOrder);
          
          // Send notification to agent (async, don't wait)
          this.sendAssignmentNotification(workOrder, agentId).catch(err => {
            logger.error('Failed to send bulk assignment notification:', err);
          });
        }
      }

      await client.query('COMMIT');
      logger.info('Bulk work order assignment completed:', { count: results.length, userId });
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in bulk assignment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get scheduling suggestions based on agent availability and work order requirements
  static async getSchedulingSuggestions(workOrderId) {
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist');
      return [];
    }

    const query = `
      WITH work_order_details AS (
        SELECT 
          wo.work_order_id,
          wo.service_type,
          wo.priority,
          wo.estimated_duration,
          wo.scheduled_date,
          acc.company_name,
          COALESCE(wo.street_address, '') as address
        FROM work_orders wo
        JOIN accounts acc ON wo.account_id = acc.account_id
        WHERE wo.work_order_id = $1
      ),
      agent_scores AS (
        SELECT 
          sa.agent_id,
          sa.employee_id,
          CONCAT(c.first_name, ' ', c.last_name) as agent_name,
          sa.specializations,
          sa.certification_level,
          sa.territory,
          -- Score based on specialization match
          CASE 
            WHEN wod.service_type = ANY(sa.specializations) THEN 3
            WHEN array_length(sa.specializations, 1) > 0 THEN 1
            ELSE 0
          END as specialization_score,
          -- Score based on certification level
          CASE sa.certification_level
            WHEN 'master' THEN 4
            WHEN 'supervisor' THEN 3
            WHEN 'senior' THEN 2
            WHEN 'junior' THEN 1
            ELSE 0
          END as certification_score,
          -- Count current workload
          COUNT(wo_assigned.work_order_id) as current_workload
        FROM service_agents sa
        LEFT JOIN contacts c ON sa.contact_id = c.contact_id
        LEFT JOIN work_orders wo_assigned ON sa.agent_id = wo_assigned.assigned_agent_id 
          AND wo_assigned.status IN ('assigned', 'in_progress')
        CROSS JOIN work_order_details wod
        WHERE sa.status = 'active'
        GROUP BY sa.agent_id, sa.employee_id, c.first_name, c.last_name, 
                 sa.specializations, sa.certification_level, sa.territory, 
                 wod.service_type
      )
      SELECT 
        agent_id,
        employee_id,
        agent_name,
        specializations,
        certification_level,
        territory,
        current_workload,
        (specialization_score + certification_score - (current_workload * 0.5)) as overall_score
      FROM agent_scores
      ORDER BY overall_score DESC, current_workload ASC
      LIMIT 5
    `;

    try {
      const result = await db.query(query, [workOrderId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting scheduling suggestions:', error);
      throw error;
    }
  }

  // Get schedule overview for a specific date
  static async getScheduleOverview(date) {
    try {
      await db.query('SELECT 1 FROM work_orders LIMIT 1');
    } catch (error) {
      logger.info('Work orders table does not exist, returning mock overview');
      return {
        date,
        total_work_orders: 4,
        assigned_work_orders: 2,
        unassigned_work_orders: 2,
        emergency_work_orders: 1,
        agents_scheduled: 2,
        agents_available: 3
      };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = `
      SELECT 
        COUNT(wo.work_order_id) as total_work_orders,
        COUNT(wo.assigned_agent_id) as assigned_work_orders,
        COUNT(*) FILTER (WHERE wo.assigned_agent_id IS NULL) as unassigned_work_orders,
        COUNT(*) FILTER (WHERE wo.priority = 'emergency') as emergency_work_orders,
        COUNT(DISTINCT wo.assigned_agent_id) FILTER (WHERE wo.assigned_agent_id IS NOT NULL) as agents_scheduled,
        (SELECT COUNT(*) FROM service_agents WHERE status = 'active') as total_active_agents
      FROM work_orders wo
      WHERE wo.scheduled_date BETWEEN $1 AND $2
        AND wo.status NOT IN ('completed', 'cancelled')
    `;

    try {
      const result = await db.query(query, [startOfDay.toISOString(), endOfDay.toISOString()]);
      const stats = result.rows[0];
      
      return {
        date,
        total_work_orders: parseInt(stats.total_work_orders) || 0,
        assigned_work_orders: parseInt(stats.assigned_work_orders) || 0,
        unassigned_work_orders: parseInt(stats.unassigned_work_orders) || 0,
        emergency_work_orders: parseInt(stats.emergency_work_orders) || 0,
        agents_scheduled: parseInt(stats.agents_scheduled) || 0,
        agents_available: parseInt(stats.total_active_agents) - parseInt(stats.agents_scheduled) || 0
      };
    } catch (error) {
      logger.error('Error getting schedule overview:', error);
      throw error;
    }
  }

  // Send assignment notification to agent
  static async sendAssignmentNotification(workOrder, agentId) {
    try {
      // Get agent contact information
      const agentQuery = `
        SELECT 
          sa.employee_id,
          CONCAT(c.first_name, ' ', c.last_name) as agent_name,
          c.email,
          c.phone
        FROM service_agents sa
        LEFT JOIN contacts c ON sa.contact_id = c.contact_id
        WHERE sa.agent_id = $1
      `;
      
      const agentResult = await db.query(agentQuery, [agentId]);
      if (agentResult.rows.length === 0) {
        logger.warn('Agent not found for notification:', agentId);
        return;
      }
      
      const agent = agentResult.rows[0];
      
      // Get account information for work order
      const accountQuery = `
        SELECT company_name, street_address, city, state, zip_code
        FROM accounts 
        WHERE account_id = $1
      `;
      
      const accountResult = await db.query(accountQuery, [workOrder.account_id]);
      const account = accountResult.rows[0] || {};
      
      // Format notification data
      const notificationData = {
        type: 'work_order_assignment',
        agent: {
          id: agentId,
          employee_id: agent.employee_id,
          name: agent.agent_name,
          email: agent.email,
          phone: agent.phone
        },
        work_order: {
          id: workOrder.work_order_id,
          number: workOrder.work_order_number,
          title: workOrder.title,
          description: workOrder.description,
          priority: workOrder.priority,
          service_type: workOrder.service_type,
          scheduled_date: workOrder.scheduled_date,
          estimated_duration: workOrder.estimated_duration,
          address: {
            street: workOrder.street_address || account.street_address,
            city: workOrder.city || account.city,
            state: workOrder.state || account.state,
            zip: workOrder.zip_code || account.zip_code
          }
        },
        account: {
          name: account.company_name
        },
        timestamp: new Date().toISOString()
      };
      
      // Log notification for development (in production, this would integrate with email/SMS services)
      if (process.env.NODE_ENV === 'development') {
        logger.info('NOTIFICATION - Work Order Assignment:', {
          to: agent.email || agent.phone,
          subject: `New Work Order Assignment: ${workOrder.work_order_number}`,
          data: notificationData
        });
      }
      
      // Store notification in database (could be used for in-app notifications)
      await this.storeNotification(notificationData);
      
      return notificationData;
    } catch (error) {
      logger.error('Error sending assignment notification:', error);
      // Don't throw error to avoid breaking the assignment process
    }
  }

  // Send schedule change notification
  static async sendScheduleChangeNotification(workOrder, agentId, changeType = 'update') {
    try {
      const agentQuery = `
        SELECT 
          sa.employee_id,
          CONCAT(c.first_name, ' ', c.last_name) as agent_name,
          c.email,
          c.phone
        FROM service_agents sa
        LEFT JOIN contacts c ON sa.contact_id = c.contact_id
        WHERE sa.agent_id = $1
      `;
      
      const agentResult = await db.query(agentQuery, [agentId]);
      if (agentResult.rows.length === 0) {
        logger.warn('Agent not found for schedule change notification:', agentId);
        return;
      }
      
      const agent = agentResult.rows[0];
      
      const notificationData = {
        type: 'schedule_change',
        change_type: changeType,
        agent: {
          id: agentId,
          employee_id: agent.employee_id,
          name: agent.agent_name,
          email: agent.email,
          phone: agent.phone
        },
        work_order: {
          id: workOrder.work_order_id,
          number: workOrder.work_order_number,
          title: workOrder.title,
          scheduled_date: workOrder.scheduled_date,
          priority: workOrder.priority
        },
        timestamp: new Date().toISOString()
      };
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('NOTIFICATION - Schedule Change:', {
          to: agent.email || agent.phone,
          subject: `Schedule ${changeType.toUpperCase()}: ${workOrder.work_order_number}`,
          data: notificationData
        });
      }
      
      await this.storeNotification(notificationData);
      
      return notificationData;
    } catch (error) {
      logger.error('Error sending schedule change notification:', error);
    }
  }

  // Store notification in database for tracking
  static async storeNotification(notificationData) {
    try {
      // Check if notifications table exists, create it if not
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        );
      `;
      
      const tableExists = await db.query(tableExistsQuery);
      
      if (!tableExists.rows[0].exists) {
        // Create notifications table
        const createTableQuery = `
          CREATE TABLE notifications (
            notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR(50) NOT NULL,
            recipient_type VARCHAR(20) NOT NULL DEFAULT 'agent',
            recipient_id UUID NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            data JSONB,
            status VARCHAR(20) DEFAULT 'pending',
            created_date TIMESTAMP DEFAULT NOW(),
            read_date TIMESTAMP,
            sent_date TIMESTAMP
          );
        `;
        
        await db.query(createTableQuery);
        logger.info('Created notifications table');
      }
      
      // Insert notification
      const insertQuery = `
        INSERT INTO notifications (
          type, recipient_type, recipient_id, title, message, data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING notification_id
      `;
      
      const title = notificationData.type === 'work_order_assignment' 
        ? `New Work Order: ${notificationData.work_order.number}`
        : `Schedule ${notificationData.change_type}: ${notificationData.work_order.number}`;
      
      const message = notificationData.type === 'work_order_assignment'
        ? `You have been assigned work order ${notificationData.work_order.number} for ${notificationData.account.name}`
        : `Your schedule has been updated for work order ${notificationData.work_order.number}`;
      
      const result = await db.query(insertQuery, [
        notificationData.type,
        'agent',
        notificationData.agent.id,
        title,
        message,
        JSON.stringify(notificationData),
        'sent'
      ]);
      
      logger.info('Notification stored:', { 
        notificationId: result.rows[0].notification_id,
        type: notificationData.type,
        agentId: notificationData.agent.id
      });
      
      return result.rows[0].notification_id;
    } catch (error) {
      logger.error('Error storing notification:', error);
    }
  }

  // Get notifications for an agent
  static async getAgentNotifications(agentId, options = {}) {
    const { limit = 20, unreadOnly = false } = options;
    
    try {
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        );
      `;
      
      const tableExists = await db.query(tableExistsQuery);
      if (!tableExists.rows[0].exists) {
        return [];
      }
      
      let whereClause = 'recipient_id = $1 AND recipient_type = \'agent\'';
      const params = [agentId];
      
      if (unreadOnly) {
        whereClause += ' AND read_date IS NULL';
      }
      
      const query = `
        SELECT 
          notification_id,
          type,
          title,
          message,
          data,
          status,
          created_date,
          read_date,
          sent_date
        FROM notifications
        WHERE ${whereClause}
        ORDER BY created_date DESC
        LIMIT $${params.length + 1}
      `;
      
      params.push(limit);
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting agent notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markNotificationRead(notificationId, agentId) {
    try {
      const query = `
        UPDATE notifications 
        SET read_date = NOW()
        WHERE notification_id = $1 AND recipient_id = $2 AND recipient_type = 'agent'
        RETURNING *
      `;
      
      const result = await db.query(query, [notificationId, agentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

module.exports = Schedule;