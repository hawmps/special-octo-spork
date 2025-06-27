const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation error:', { 
      url: req.url, 
      method: req.method, 
      errors: errors.array() 
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};

// Common validation rules
const validateUUID = (field) => param(field).isUUID().withMessage(`${field} must be a valid UUID`);

const validateEmail = (field) => body(field).isEmail().normalizeEmail().withMessage(`${field} must be a valid email`);

const validatePhone = (field) => body(field).optional().isMobilePhone('any').withMessage(`${field} must be a valid phone number`);

const validateDate = (field) => body(field).optional().isISO8601().toDate().withMessage(`${field} must be a valid date`);

const validateEnum = (field, values) => body(field).isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`);

// Account validation
const validateAccount = [
  body('company_name').trim().isLength({ min: 1, max: 255 }).withMessage('Company name is required and must be less than 255 characters'),
  body('account_type').isIn(['commercial', 'residential', 'industrial']).withMessage('Account type must be commercial, residential, or industrial'),
  validateEmail('email').optional(),
  validatePhone('phone').optional(),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
  handleValidationErrors
];

// Contact validation
const validateContact = [
  validateUUID('account_id'),
  body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required and must be less than 100 characters'),
  body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required and must be less than 100 characters'),
  validateEmail('email').optional(),
  validatePhone('phone').optional(),
  validatePhone('mobile_phone').optional(),
  body('role').optional().trim().isLength({ max: 100 }).withMessage('Role must be less than 100 characters'),
  body('is_primary').optional().isBoolean().withMessage('is_primary must be a boolean'),
  handleValidationErrors
];

// Work Order validation
const validateWorkOrder = [
  validateUUID('account_id'),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  validateEnum('priority', ['low', 'medium', 'high', 'emergency']).optional(),
  validateEnum('status', ['new', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
  validateDate('scheduled_date').optional(),
  body('estimated_duration').optional().isInt({ min: 1 }).withMessage('Estimated duration must be a positive integer'),
  handleValidationErrors
];

// Service Agent validation
const validateServiceAgent = [
  body('contact_id').isUUID().withMessage('contact_id must be a valid UUID'),
  body('employee_id').trim().isLength({ min: 1, max: 50 }).withMessage('Employee ID is required and must be less than 50 characters'),
  body('specializations').isArray().withMessage('Specializations must be an array'),
  validateEnum('certification_level', ['junior', 'senior', 'master', 'supervisor']).optional(),
  validateDate('hire_date'),
  body('territory').optional().trim().isLength({ max: 100 }).withMessage('Territory must be less than 100 characters'),
  body('hourly_rate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  handleValidationErrors
];

// Asset validation
const validateAsset = [
  body('account_id').isUUID().withMessage('account_id must be a valid UUID'),
  body('asset_type').trim().isLength({ min: 1, max: 100 }).withMessage('Asset type is required and must be less than 100 characters'),
  body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand must be less than 100 characters'),
  body('model').optional().trim().isLength({ max: 100 }).withMessage('Model must be less than 100 characters'),
  body('serial_number').optional().trim().isLength({ max: 100 }).withMessage('Serial number must be less than 100 characters'),
  validateDate('installation_date').optional(),
  validateDate('warranty_expiry').optional(),
  handleValidationErrors
];

// Opportunity validation
const validateOpportunity = [
  validateUUID('account_id'),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('estimated_value').optional().isFloat({ min: 0 }).withMessage('Estimated value must be a positive number'),
  body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
  validateEnum('stage', ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
  validateDate('expected_close_date').optional(),
  handleValidationErrors
];

// Part validation
const validatePart = [
  body('part_number').trim().isLength({ min: 1, max: 100 }).withMessage('Part number is required and must be less than 100 characters'),
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be less than 255 characters'),
  body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be less than 100 characters'),
  body('unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('quantity_on_hand').optional().isInt({ min: 0 }).withMessage('Quantity on hand must be a non-negative integer'),
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateSearch = [
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUUID,
  validateAccount,
  validateContact,
  validateWorkOrder,
  validateServiceAgent,
  validateAsset,
  validateOpportunity,
  validatePart,
  validatePagination,
  validateSearch
};