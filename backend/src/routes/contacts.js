const express = require('express');
const { authenticate, requireCustomerService } = require('../middleware/auth');
const { validateContact, validateUUID } = require('../middleware/validation');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all contacts for an account
router.get('/account/:accountId', 
  validateUUID('accountId'),
  async (req, res, next) => {
    try {
      const query = `
        SELECT * FROM contacts 
        WHERE account_id = $1 
        ORDER BY is_primary DESC, first_name ASC
      `;
      
      const result = await db.query(query, [req.params.accountId]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Error fetching contacts:', error);
      next(error);
    }
  }
);

// Get contact by ID
router.get('/:id', 
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const query = `
        SELECT c.*, a.company_name 
        FROM contacts c
        LEFT JOIN accounts a ON c.account_id = a.account_id
        WHERE c.contact_id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error fetching contact:', error);
      next(error);
    }
  }
);

// Create new contact
router.post('/',
  requireCustomerService,
  validateContact,
  async (req, res, next) => {
    try {
      const {
        account_id,
        first_name,
        last_name,
        email,
        phone,
        mobile_phone,
        role,
        is_primary = false
      } = req.body;

      const query = `
        INSERT INTO contacts (
          account_id, first_name, last_name, email, phone, mobile_phone, role, is_primary, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *
      `;

      const params = [account_id, first_name, last_name, email, phone, mobile_phone, role, is_primary, req.user.id];
      const result = await db.query(query, params);

      logger.info('Contact created:', { contactId: result.rows[0].contact_id, userId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error creating contact:', error);
      next(error);
    }
  }
);

// Update contact
router.put('/:id',
  requireCustomerService,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'mobile_phone', 'role', 'is_primary', 'status'];
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
        UPDATE contacts 
        SET ${updates.join(', ')}
        WHERE contact_id = $1
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }

      logger.info('Contact updated:', { contactId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Contact updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error updating contact:', error);
      next(error);
    }
  }
);

// Delete contact
router.delete('/:id',
  requireCustomerService,
  validateUUID('id'),
  async (req, res, next) => {
    try {
      const query = 'DELETE FROM contacts WHERE contact_id = $1 RETURNING *';
      const result = await db.query(query, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }

      logger.info('Contact deleted:', { contactId: req.params.id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting contact:', error);
      next(error);
    }
  }
);

module.exports = router;