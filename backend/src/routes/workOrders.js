const express = require('express');
const { authenticate, requireFieldManager, requireFieldTechnician } = require('../middleware/auth');
const { validateWorkOrder, validateUUID, validatePagination, validateSearch } = require('../middleware/validation');
const WorkOrder = require('../models/WorkOrder');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all work orders
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
        priority: req.query.priority,
        assigned_agent_id: req.query.assigned_agent_id,
        account_id: req.query.account_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      // Field technicians can only see their own work orders
      if (req.user.groups.includes('field_technician') && 
          !req.user.groups.includes('field_manager') && 
          !req.user.groups.includes('platform_admin')) {
        options.assigned_agent_id = req.user.agent_id; // This would need to be set during auth
      }

      const result = await WorkOrder.findAll(options);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error fetching work orders:', error);
      next(error);
    }
  }
);

// Get work order by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          error: 'Work order not found'
        });
      }

      // Field technicians can only view their own work orders
      if (req.user.groups.includes('field_technician') && 
          !req.user.groups.includes('field_manager') && 
          !req.user.groups.includes('platform_admin') &&
          workOrder.assigned_agent_id !== req.user.agent_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: workOrder
      });

    } catch (error) {
      logger.error('Error fetching work order:', error);
      next(error);
    }
  }
);

// Create new work order
router.post('/',
  requireFieldManager,
  validateWorkOrder,
  async (req, res, next) => {
    try {
      const workOrder = await WorkOrder.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Work order created successfully',
        data: workOrder
      });

    } catch (error) {
      logger.error('Error creating work order:', error);
      next(error);
    }
  }
);

// Update work order
router.put('/:id',
  validateUUID('id'),
  async (req, res, next) => {
    try {
      // Check if user has permission to update this work order
      const existingWorkOrder = await WorkOrder.findById(req.params.id);
      
      if (!existingWorkOrder) {
        return res.status(404).json({
          success: false,
          error: 'Work order not found'
        });
      }

      // Field technicians can only update their own work orders and limited fields
      if (req.user.groups.includes('field_technician') && 
          !req.user.groups.includes('field_manager') && 
          !req.user.groups.includes('platform_admin')) {
        
        if (existingWorkOrder.assigned_agent_id !== req.user.agent_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }

        // Restrict fields that technicians can update
        const allowedFields = ['status', 'actual_start_time', 'actual_end_time', 'completion_date', 'notes'];
        const updateData = {};
        Object.keys(req.body).forEach(key => {
          if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
          }
        });
        req.body = updateData;
      }

      const workOrder = await WorkOrder.update(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'Work order updated successfully',
        data: workOrder
      });

    } catch (error) {
      logger.error('Error updating work order:', error);
      next(error);
    }
  }
);

// Delete work order
router.delete('/:id',
  requireFieldManager,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const workOrder = await WorkOrder.delete(req.params.id, req.user.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          error: 'Work order not found'
        });
      }

      res.json({
        success: true,
        message: 'Work order deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting work order:', error);
      next(error);
    }
  }
);

// Get work orders for a specific agent
router.get('/agent/:agentId',
  validateUUID('agentId'),
  async (req, res, next) => {
    try {
      const { agentId } = req.params;
      const { status } = req.query;

      // Field technicians can only see their own work orders
      if (req.user.groups.includes('field_technician') && 
          !req.user.groups.includes('field_manager') && 
          !req.user.groups.includes('platform_admin') &&
          agentId !== req.user.agent_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const workOrders = await WorkOrder.getByAgent(agentId, { status });

      res.json({
        success: true,
        data: workOrders
      });

    } catch (error) {
      logger.error('Error fetching work orders by agent:', error);
      next(error);
    }
  }
);

// Get work order statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await WorkOrder.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching work order stats:', error);
    next(error);
  }
});

// Update work order status (simplified endpoint for mobile)
router.patch('/:id/status',
  requireFieldTechnician,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const validStatuses = ['new', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const updateData = { status };
      if (notes) updateData.notes = notes;

      // Set timestamps based on status
      if (status === 'in_progress' && !updateData.actual_start_time) {
        updateData.actual_start_time = new Date().toISOString();
      } else if (status === 'completed') {
        if (!updateData.actual_end_time) {
          updateData.actual_end_time = new Date().toISOString();
        }
        if (!updateData.completion_date) {
          updateData.completion_date = new Date().toISOString();
        }
      }

      const workOrder = await WorkOrder.update(req.params.id, updateData, req.user.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          error: 'Work order not found'
        });
      }

      res.json({
        success: true,
        message: 'Work order status updated successfully',
        data: workOrder
      });

    } catch (error) {
      logger.error('Error updating work order status:', error);
      next(error);
    }
  }
);

module.exports = router;