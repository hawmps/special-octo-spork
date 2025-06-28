# Documentation Index

This index tracks all documentation files and their versions to enable efficient updates without consuming excessive context.

## Documentation Structure

### Core Documentation

| Document | Version | Last Updated | Description |
|----------|---------|--------------|-------------|
| [API.md](./API.md) | 1.1.0 | 2025-06-28 | Main API reference with scheduling endpoints added |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 1.0.0 | Original | Deployment and infrastructure documentation |
| [SCHEDULING_MODULE.md](./SCHEDULING_MODULE.md) | 1.0.0 | 2025-06-28 | Complete scheduling module documentation |

### Module Documentation

#### Scheduling Module (v1.0.0)
- **File:** [SCHEDULING_MODULE.md](./SCHEDULING_MODULE.md)
- **Sections:**
  - Overview
  - Features (Agent Availability, Work Order Assignment, Calendar, Notifications, Emergency Scheduling)
  - API Reference (7 endpoints)
  - Database Schema (notifications table)
  - Frontend Components (SchedulerPage)
  - Configuration
  - Error Handling

### Version History

#### 2025-06-28
- Created SCHEDULING_MODULE.md v1.0.0
- Updated API.md to v1.1.0 (added scheduling endpoints)
- Created this documentation index

## Versioning Strategy

Each documentation file includes version metadata in HTML comments:
```html
<!-- 
Version: X.Y.Z
Last Updated: YYYY-MM-DD
Features Covered: Brief description
-->
```

This allows quick identification of:
- What version of documentation you're reading
- When it was last updated
- What features it covers

## Quick Links

### By Feature
- **Authentication:** [API.md#authentication](./API.md#authentication)
- **Accounts:** [API.md#accounts](./API.md#accounts)
- **Work Orders:** [API.md#work-orders](./API.md#work-orders)
- **Scheduling:** [SCHEDULING_MODULE.md](./SCHEDULING_MODULE.md)
- **Service Agents:** [API.md#service-agents](./API.md#service-agents)
- **Assets:** [API.md#assets](./API.md#assets)
- **Parts:** [API.md#parts-management](./API.md#parts-management)
- **Reports:** [API.md#reports](./API.md#reports)

### By Component
- **Backend Routes:** See individual API sections
- **Database Schema:** [SCHEDULING_MODULE.md#database-schema](./SCHEDULING_MODULE.md#database-schema)
- **Frontend Components:** [SCHEDULING_MODULE.md#frontend-components](./SCHEDULING_MODULE.md#frontend-components)

## Maintenance Notes

When updating documentation:
1. Update the version number in the file's metadata comment
2. Update this index with the new version and date
3. Add a brief description of changes in the version history
4. Keep section headers consistent for easy linking