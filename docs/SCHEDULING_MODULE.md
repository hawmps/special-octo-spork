# Scheduling Module Documentation

<!-- 
Version: 1.0.0
Last Updated: 2025-06-28
Features Covered: Complete scheduling system implementation
-->

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Frontend Components](#frontend-components)
- [Version History](#version-history)

## Overview

The Scheduling Module provides comprehensive work order assignment and technician availability management for the Field Service CRM system.

## Features

### 1. Agent Availability Management (v1.0.0)
- View technician availability by date range
- Track scheduled work orders per agent
- Calculate total scheduled time
- Display agent specializations and territories

### 2. Work Order Assignment (v1.0.0)
- Drag-and-drop assignment interface
- Bulk assignment capabilities
- Assignment suggestions based on:
  - Agent specializations
  - Certification levels
  - Current workload
  - Territory matching

### 3. Scheduling Calendar (v1.0.0)
- Calendar view with agent rows
- Visual work order representation
- Priority-based color coding
- Interactive drag-drop functionality

### 4. Notifications (v1.0.0)
- Automatic notifications on assignment
- Schedule change notifications
- Email/SMS integration ready
- In-app notification storage

### 5. Emergency Scheduling (v1.0.0)
- Priority-based sorting
- Emergency work order highlighting
- Quick assignment for urgent tasks

## API Reference

### Scheduling Endpoints

#### GET /api/scheduling/agents/availability
<!-- Version: 1.0.0 -->
Get availability for all agents in a date range.

**Query Parameters:**
- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date
- `territory` (optional): Filter by territory

**Response:**
```json
{
  "success": true,
  "data": [{
    "agent_id": "uuid",
    "agent_name": "John Smith",
    "employee_id": "EMP001",
    "status": "active",
    "territory": "North",
    "specializations": ["HVAC", "Electrical"],
    "scheduled_count": 2,
    "total_scheduled_minutes": 480,
    "scheduled_work_orders": [...]
  }]
}
```

#### GET /api/scheduling/agents/:agentId/availability
<!-- Version: 1.0.0 -->
Get availability for a specific agent.

**Parameters:**
- `agentId`: Agent UUID

**Query Parameters:**
- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date

#### GET /api/scheduling/work-orders/unassigned
<!-- Version: 1.0.0 -->
Get all unassigned work orders.

**Query Parameters:**
- `priority` (optional): Filter by priority
- `territory` (optional): Filter by territory
- `limit` (optional): Number of results (default: 50)

#### POST /api/scheduling/work-orders/:workOrderId/assign
<!-- Version: 1.0.0 -->
Assign a work order to an agent.

**Request Body:**
```json
{
  "agent_id": "uuid",
  "scheduled_date": "2025-01-01T10:00:00Z"
}
```

#### POST /api/scheduling/work-orders/bulk-assign
<!-- Version: 1.0.0 -->
Assign multiple work orders at once.

**Request Body:**
```json
{
  "assignments": [{
    "workOrderId": "uuid",
    "agentId": "uuid",
    "scheduledDate": "2025-01-01T10:00:00Z"
  }]
}
```

#### GET /api/scheduling/work-orders/:workOrderId/suggestions
<!-- Version: 1.0.0 -->
Get agent suggestions for a work order based on skills and availability.

**Response:**
```json
{
  "success": true,
  "data": [{
    "agent_id": "uuid",
    "agent_name": "John Smith",
    "specializations": ["HVAC"],
    "certification_level": "master",
    "current_workload": 3,
    "overall_score": 8.5
  }]
}
```

#### GET /api/scheduling/overview
<!-- Version: 1.0.0 -->
Get scheduling overview for a specific date.

**Query Parameters:**
- `date` (required): ISO 8601 date

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-01-01",
    "total_work_orders": 15,
    "assigned_work_orders": 12,
    "unassigned_work_orders": 3,
    "emergency_work_orders": 1,
    "agents_scheduled": 8,
    "agents_available": 4
  }
}
```

## Database Schema

### Notifications Table (v1.0.0)
```sql
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
```

### Key Relationships
- Work Orders → Service Agents (assigned_agent_id)
- Service Agents → Contacts (contact_id)
- Notifications → Service Agents (recipient_id)

## Frontend Components

### SchedulerPage Component (v1.0.0)
Main scheduling interface with:
- Calendar view
- Agent availability sidebar
- Unassigned work orders panel
- Drag-and-drop functionality

**Location:** `/frontend/src/pages/scheduler/SchedulerPage.tsx`

**Features:**
- Date range selection
- Territory filtering
- Real-time updates
- Assignment confirmation dialogs
- Error handling with fallback to mock data

### Key Dependencies
- React DnD for drag-and-drop
- Material-UI for UI components
- React Query for data fetching
- date-fns for date manipulation

## Configuration

### Environment Variables
```env
# Notification settings (future implementation)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=password
SMS_API_KEY=your_sms_api_key
```

## Error Handling

The scheduling module includes graceful error handling:
- Missing database tables return mock data
- Failed queries don't crash the application
- User-friendly error messages
- Automatic retry for transient failures

## Version History

### v1.0.0 (2025-06-28)
- Initial release with complete scheduling functionality
- All deliverables implemented:
  - ✅ Data model and backend APIs
  - ✅ Calendar-based scheduling interface
  - ✅ Technician availability management
  - ✅ Work order assignment and dispatch
  - ✅ Route optimization suggestions
  - ✅ Automated notifications
  - ✅ Emergency/priority scheduling

## Future Enhancements

- Integration with mapping services for route optimization
- Mobile app support for field technicians
- Advanced analytics and reporting
- AI-powered scheduling recommendations
- Real-time GPS tracking