const express = require('express');
const { authenticate, requireFieldManager } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');
const Schedule = require('../models/Schedule');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get agent availability for a date range
router.get('/agents/:agentId/availability',
  validateUUID('agentId'),
  async (req, res, next) => {
    try {
      const { agentId } = req.params;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: 'start_date and end_date are required'
        });
      }

      const availability = await Schedule.getAgentAvailability(agentId, start_date, end_date);

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

// Get all agents availability for a date range
router.get('/agents/availability',
  async (req, res, next) => {
    try {
      const { start_date, end_date, territory } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: 'start_date and end_date are required'
        });
      }

      const availability = await Schedule.getAllAgentsAvailability(start_date, end_date, territory);

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      logger.error('Error fetching agents availability:', error);
      next(error);
    }
  }
);

// Get unassigned work orders
router.get('/work-orders/unassigned',
  async (req, res, next) => {
    try {
      const { priority, territory, limit } = req.query;

      const workOrders = await Schedule.getUnassignedWorkOrders({
        priority,
        territory,
        limit: limit ? parseInt(limit) : undefined
      });

      res.json({
        success: true,
        data: workOrders
      });

    } catch (error) {
      logger.error('Error fetching unassigned work orders:', error);
      next(error);
    }
  }
);

// Assign work order to agent
router.post('/work-orders/:workOrderId/assign',
  requireFieldManager,
  validateUUID('workOrderId'),
  async (req, res, next) => {
    try {
      const { workOrderId } = req.params;
      const { agent_id, scheduled_date } = req.body;

      if (!agent_id) {
        return res.status(400).json({
          success: false,
          error: 'agent_id is required'
        });
      }

      const workOrder = await Schedule.assignWorkOrder(
        workOrderId,
        agent_id,
        scheduled_date,
        req.user.id
      );

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          error: 'Work order not found'
        });
      }

      res.json({
        success: true,
        message: 'Work order assigned successfully',
        data: workOrder
      });

    } catch (error) {
      logger.error('Error assigning work order:', error);
      next(error);
    }
  }
);

// Bulk assign work orders
router.post('/work-orders/bulk-assign',
  requireFieldManager,
  async (req, res, next) => {
    try {
      const { assignments } = req.body;

      if (!assignments || !Array.isArray(assignments)) {
        return res.status(400).json({
          success: false,
          error: 'assignments array is required'
        });
      }

      // Validate each assignment
      for (const assignment of assignments) {
        if (!assignment.workOrderId || !assignment.agentId) {
          return res.status(400).json({
            success: false,
            error: 'Each assignment must have workOrderId and agentId'
          });
        }
      }

      const results = await Schedule.bulkAssignWorkOrders(assignments, req.user.id);

      res.json({
        success: true,
        message: `${results.length} work orders assigned successfully`,
        data: results
      });

    } catch (error) {
      logger.error('Error in bulk assignment:', error);
      next(error);
    }
  }
);

// Get scheduling suggestions for a work order
router.get('/work-orders/:workOrderId/suggestions',
  validateUUID('workOrderId'),
  async (req, res, next) => {
    try {
      const { workOrderId } = req.params;

      const suggestions = await Schedule.getSchedulingSuggestions(workOrderId);

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      logger.error('Error getting scheduling suggestions:', error);
      next(error);
    }
  }
);

// Get schedule overview for a specific date
router.get('/overview',
  async (req, res, next) => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'date is required (YYYY-MM-DD format)'
        });
      }

      const overview = await Schedule.getScheduleOverview(date);

      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      logger.error('Error getting schedule overview:', error);
      next(error);
    }
  }
);

// Get schedule overview for multiple dates (week/month view)
router.get('/overview/range',
  async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: 'start_date and end_date are required'
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const overviews = [];

      // Generate overview for each day in the range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const overview = await Schedule.getScheduleOverview(dateStr);
        overviews.push(overview);
      }

      res.json({
        success: true,
        data: overviews
      });

    } catch (error) {
      logger.error('Error getting schedule overview range:', error);
      next(error);
    }
  }
);

// Get notifications for an agent
router.get('/agents/:agentId/notifications',
  validateUUID('agentId'),
  async (req, res, next) => {
    try {
      const { agentId } = req.params;
      const { limit, unread_only } = req.query;

      // Only agents can access their own notifications or field managers can access any
      if (req.user.id !== agentId && !req.user.groups?.includes('field_manager') && !req.user.groups?.includes('platform_admin')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access notifications'
        });
      }

      const notifications = await Schedule.getAgentNotifications(agentId, {
        limit: limit ? parseInt(limit) : undefined,
        unreadOnly: unread_only === 'true'
      });

      res.json({
        success: true,
        data: notifications
      });

    } catch (error) {
      logger.error('Error fetching agent notifications:', error);
      next(error);
    }
  }
);

// Mark notification as read
router.patch('/notifications/:notificationId/read',
  validateUUID('notificationId'),
  async (req, res, next) => {
    try {
      const { notificationId } = req.params;

      const notification = await Schedule.markNotificationRead(notificationId, req.user.id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });

    } catch (error) {
      logger.error('Error marking notification as read:', error);
      next(error);
    }
  }
);

// Send manual notification (for testing or manual alerts)
router.post('/notifications/send',
  requireFieldManager,
  async (req, res, next) => {
    try {
      const { agent_id, work_order_id, type = 'schedule_change', change_type = 'manual' } = req.body;

      if (!agent_id || !work_order_id) {
        return res.status(400).json({
          success: false,
          error: 'agent_id and work_order_id are required'
        });
      }

      // Get work order details
      const db = require('../config/database');
      const workOrderQuery = `
        SELECT * FROM work_orders WHERE work_order_id = $1
      `;
      
      const result = await db.query(workOrderQuery, [work_order_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Work order not found'
        });
      }

      const workOrder = result.rows[0];
      
      let notificationData;
      if (type === 'work_order_assignment') {
        notificationData = await Schedule.sendAssignmentNotification(workOrder, agent_id);
      } else {
        notificationData = await Schedule.sendScheduleChangeNotification(workOrder, agent_id, change_type);
      }

      res.json({
        success: true,
        message: 'Notification sent successfully',
        data: notificationData
      });

    } catch (error) {
      logger.error('Error sending manual notification:', error);
      next(error);
    }
  }
);

module.exports = router;