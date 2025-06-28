# Field Service CRM API Documentation

<!-- 
Version: 1.1.0
Last Updated: 2025-06-28
Changes: Added scheduling endpoints section
-->

## Overview

The Field Service CRM API is a RESTful service built with Node.js and Express, providing comprehensive endpoints for managing field service operations.

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

The API uses AWS Cognito for authentication with JWT tokens.

### Headers

All authenticated requests must include:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Endpoints

#### POST /auth/signin
Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "field_manager",
      "groups": ["field_manager"]
    }
  }
}
```

#### POST /auth/signup
Create a new user account (admin only).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "field_technician"
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "user@example.com",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "field_manager",
    "groups": ["field_manager"],
    "enabled": true,
    "status": "CONFIRMED"
  }
}
```

## Account Management

### GET /accounts
List all accounts with optional filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search in company name or email
- `status` (string): Filter by status (active, inactive, suspended)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "account_id": "uuid",
      "company_name": "ABC Company",
      "account_type": "commercial",
      "billing_address": "123 Business St",
      "phone": "555-0123",
      "email": "contact@abc.com",
      "status": "active",
      "created_date": "2024-01-15T10:30:00Z",
      "contact_count": 3,
      "work_order_count": 15
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET /accounts/:id
Get account details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "account_id": "uuid",
    "company_name": "ABC Company",
    "account_type": "commercial",
    "billing_address": "123 Business St",
    "phone": "555-0123",
    "email": "contact@abc.com",
    "status": "active",
    "created_date": "2024-01-15T10:30:00Z",
    "contacts": [
      {
        "contact_id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@abc.com",
        "phone": "555-0124",
        "role": "Manager",
        "is_primary": true
      }
    ]
  }
}
```

### POST /accounts
Create a new account.

**Required Role:** customer_service, field_manager, or platform_admin

**Request Body:**
```json
{
  "company_name": "New Company LLC",
  "account_type": "commercial",
  "billing_address": "456 New Business Ave",
  "phone": "555-0125",
  "email": "info@newcompany.com",
  "website": "https://newcompany.com"
}
```

### PUT /accounts/:id
Update an existing account.

**Required Role:** customer_service, field_manager, or platform_admin

### DELETE /accounts/:id
Delete an account.

**Required Role:** customer_service, field_manager, or platform_admin

## Work Order Management

### GET /work-orders
List work orders with filtering and pagination.

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search in title, work order number, or company name
- `status`: Filter by status (new, assigned, in_progress, on_hold, completed, cancelled)
- `priority`: Filter by priority (low, medium, high, emergency)
- `assigned_agent_id`: Filter by assigned technician
- `account_id`: Filter by customer account
- `start_date`, `end_date`: Filter by scheduled date range

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "work_order_id": "uuid",
      "work_order_number": "WO-001234",
      "account_id": "uuid",
      "title": "HVAC Maintenance",
      "description": "Quarterly maintenance check",
      "priority": "medium",
      "status": "assigned",
      "service_type": "Maintenance",
      "scheduled_date": "2024-01-20T09:00:00Z",
      "estimated_duration": 120,
      "company_name": "ABC Company",
      "agent_name": "John Smith",
      "street_address": "123 Business St",
      "city": "Dallas",
      "state": "TX",
      "total_cost": 250.00
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "pages": 5
  }
}
```

### GET /work-orders/:id
Get detailed work order information.

**Response:**
```json
{
  "success": true,
  "data": {
    "work_order_id": "uuid",
    "work_order_number": "WO-001234",
    "title": "HVAC Maintenance",
    "description": "Quarterly maintenance check",
    "priority": "medium",
    "status": "assigned",
    "scheduled_date": "2024-01-20T09:00:00Z",
    "lines": [
      {
        "line_id": "uuid",
        "line_number": 1,
        "service_type": "Maintenance",
        "description": "Replace air filters",
        "estimated_hours": 0.5,
        "actual_hours": 0.5,
        "labor_cost": 37.50,
        "parts_cost": 25.00,
        "total_cost": 62.50
      }
    ],
    "attachments": [
      {
        "attachment_id": "uuid",
        "filename": "before_photo.jpg",
        "attachment_type": "photo",
        "s3_url": "https://s3.amazonaws.com/bucket/file.jpg",
        "created_date": "2024-01-20T10:15:00Z"
      }
    ]
  }
}
```

### POST /work-orders
Create a new work order.

**Required Role:** field_manager, customer_service, or platform_admin

**Request Body:**
```json
{
  "account_id": "uuid",
  "assigned_agent_id": "uuid",
  "title": "Emergency Repair",
  "description": "AC unit not cooling",
  "priority": "high",
  "service_type": "Repair",
  "scheduled_date": "2024-01-21T14:00:00Z",
  "estimated_duration": 180
}
```

### PUT /work-orders/:id
Update a work order.

**Request Body:**
```json
{
  "status": "in_progress",
  "actual_start_time": "2024-01-21T14:05:00Z",
  "notes": "Started diagnostic"
}
```

### PATCH /work-orders/:id/status
Update work order status (simplified endpoint for mobile).

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Work completed successfully"
}
```

## Service Agents

### GET /service-agents
List service agents.

**Query Parameters:**
- `status`: Filter by status (active, inactive, on_leave)
- `territory`: Filter by territory
- `specialization`: Filter by specialization

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "agent_id": "uuid",
      "employee_id": "EMP001",
      "full_name": "John Smith",
      "email": "john.smith@company.com",
      "phone": "555-0126",
      "specializations": ["HVAC", "Electrical"],
      "certification_level": "senior",
      "territory": "North Dallas",
      "hourly_rate": 65.00,
      "status": "active",
      "active_work_orders": 3
    }
  ]
}
```

### GET /service-agents/:id/availability
Get agent availability for a specific date.

**Query Parameters:**
- `date` (string): Date in YYYY-MM-DD format (default: today)

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-20",
    "scheduled_work_orders": [
      {
        "work_order_id": "uuid",
        "title": "HVAC Maintenance",
        "scheduled_date": "2024-01-20T09:00:00Z",
        "estimated_duration": 120,
        "status": "assigned"
      }
    ]
  }
}
```

## Assets

### GET /assets/account/:accountId
List assets for a specific account.

**Query Parameters:**
- `status`: Filter by status
- `asset_type`: Filter by asset type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "asset_id": "uuid",
      "asset_type": "HVAC System",
      "brand": "Carrier",
      "model": "50TCQ12",
      "serial_number": "CAR123456789",
      "installation_date": "2020-05-15",
      "warranty_expiry": "2025-05-15",
      "location_description": "Main Production Floor - Unit 1",
      "status": "active",
      "service_count": 8
    }
  ]
}
```

### GET /assets/:id
Get detailed asset information including service history.

## Parts Management

### GET /parts
List parts inventory.

**Query Parameters:**
- `category`: Filter by category
- `status`: Filter by status
- `search`: Search in part number or name
- `low_stock`: Show only low stock items (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "part_id": "uuid",
      "part_number": "FILTER-20X25X1",
      "name": "20x25x1 Air Filter",
      "category": "HVAC",
      "brand": "Generic",
      "unit_cost": 8.50,
      "unit_price": 15.00,
      "quantity_on_hand": 50,
      "reorder_level": 10,
      "status": "active",
      "needs_reorder": false
    }
  ]
}
```

### PATCH /parts/:id/inventory
Adjust part inventory.

**Required Role:** field_manager or platform_admin

**Request Body:**
```json
{
  "adjustment": -5,
  "reason": "Used in work order WO-001234"
}
```

## Opportunities

### GET /opportunities
List sales opportunities.

**Query Parameters:**
- `stage`: Filter by stage
- `account_id`: Filter by account
- `search`: Search in title or company name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "opportunity_id": "uuid",
      "account_id": "uuid",
      "title": "HVAC System Upgrade",
      "estimated_value": 150000.00,
      "probability": 75,
      "stage": "proposal",
      "expected_close_date": "2024-03-15",
      "company_name": "ABC Manufacturing",
      "weighted_value": 112500.00
    }
  ]
}
```

## Scheduling
<!-- Added: v1.0.0 (2025-06-28) -->

### GET /scheduling/agents/availability
Get availability for all agents in a date range.

**Query Parameters:**
- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date  
- `territory` (optional): Filter by territory

**Response:** See [Scheduling Module Documentation](./SCHEDULING_MODULE.md#get-apischedulingagentsavailability)

### GET /scheduling/agents/:agentId/availability
Get availability for a specific agent.

### GET /scheduling/work-orders/unassigned
Get all unassigned work orders.

### POST /scheduling/work-orders/:workOrderId/assign
Assign a work order to an agent.

### POST /scheduling/work-orders/bulk-assign
Assign multiple work orders at once.

### GET /scheduling/work-orders/:workOrderId/suggestions
Get agent suggestions for a work order.

### GET /scheduling/overview
Get scheduling overview for a specific date.

**Full documentation:** See [Scheduling Module Documentation](./SCHEDULING_MODULE.md)

## Reports

### GET /reports/dashboard
Get dashboard statistics.

**Required Role:** field_manager or platform_admin

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": {
      "total": 150,
      "active": 142,
      "new_this_month": 8
    },
    "workOrders": {
      "total": 1250,
      "new": 15,
      "assigned": 35,
      "in_progress": 28,
      "completed": 1150,
      "emergency": 3,
      "scheduled_this_week": 42
    },
    "serviceAgents": {
      "total": 25,
      "active": 23,
      "on_leave": 2
    },
    "revenue": {
      "total_revenue": 285000.00,
      "revenue_this_month": 24500.00,
      "revenue_this_week": 6200.00
    }
  }
}
```

### GET /reports/work-orders/performance
Get work order performance report.

**Query Parameters:**
- `start_date`, `end_date`: Date range
- `agent_id`: Filter by specific agent

### GET /reports/revenue
Get revenue report grouped by time period.

**Query Parameters:**
- `start_date`, `end_date`: Date range
- `group_by`: Group by day, week, month, or year

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP
- File upload endpoints: 10 requests per hour per IP

## Pagination

List endpoints support pagination with the following parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Field Validation

### Common Validation Rules

- Email fields: Must be valid email format
- Phone numbers: Must be valid phone number format
- UUIDs: Must be valid UUID v4 format
- Dates: Must be ISO 8601 format
- Required fields: Cannot be null or empty
- String length limits: As specified in database schema

### Account Validation
- `company_name`: Required, 1-255 characters
- `account_type`: Must be one of: commercial, residential, industrial
- `email`: Valid email format (optional)
- `phone`: Valid phone number format (optional)

### Work Order Validation
- `title`: Required, 1-255 characters
- `priority`: Must be one of: low, medium, high, emergency
- `status`: Must be one of: new, assigned, in_progress, on_hold, completed, cancelled
- `estimated_duration`: Positive integer (minutes)

### Contact Validation
- `first_name`, `last_name`: Required, 1-100 characters
- `email`: Valid email format (optional)
- `is_primary`: Boolean value

This API documentation provides a comprehensive guide for integrating with the Field Service CRM system. For additional details or support, refer to the source code or contact the development team.