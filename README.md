# Field Service CRM System

A comprehensive web-based CRM system specifically designed for field service technicians (HVAC, plumbing, electrical, etc.).

## Architecture

- **Backend**: Node.js with Express.js
- **Frontend**: React.js with TypeScript
- **Database**: PostgreSQL on AWS RDS
- **Infrastructure**: AWS with Terraform
- **Authentication**: AWS Cognito

## Project Structure

```
├── backend/           # Node.js API server
├── frontend/          # React.js web application
├── infrastructure/    # Terraform configurations
├── docs/             # Documentation
└── scripts/          # Build and deployment scripts
```

## Quick Start

1. **Infrastructure Setup**
   ```bash
   cd infrastructure/terraform/environments/dev
   terraform init
   terraform plan
   terraform apply
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Features

- Customer Management
- Work Order Scheduling
- Technician Dispatch
- Asset Tracking
- Mobile-Responsive Interface
- Real-time Updates
- Reporting & Analytics

## Security Features

- HTTPS/TLS encryption
- JWT authentication
- Role-based access control
- Data encryption at rest and in transit
- Input validation and sanitization
- Rate limiting
- Audit logging

## User Roles

- Platform Admin
- Field Manager
- Field Technician
- Customer Service
- Customer Portal User (future)