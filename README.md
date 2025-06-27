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

### 🐳 **Local Development (Recommended)**
Get started in minutes with Docker:

```bash
# Clone the repository
git clone <your-repo-url>
cd field-service-crm

# Start the entire development environment
./scripts/dev-setup.sh

# Or use Make commands
make start
```

This will start:
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:3001  
- 🗄️ **Database Admin**: http://localhost:8080
- 📧 **Email Testing**: http://localhost:8025
- 💾 **File Storage**: http://localhost:9001

### ☁️ **Production Deployment**
Deploy to AWS with Terraform:

```bash
# Deploy to development environment
./scripts/deploy.sh dev

# Deploy to production
./scripts/deploy.sh prod
```

### 🛠️ **Manual Setup**
For traditional development setup:

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

## 🚀 **Development Commands**

```bash
# Start development environment
make start              # or ./scripts/dev-setup.sh

# View application logs  
make logs              # or docker-compose logs -f

# Run tests
make test              # Run all tests
make test-backend      # Backend tests only
make test-frontend     # Frontend tests only

# Database operations
make migrate           # Run database migrations
make seed              # Load sample data  
make backup-db         # Backup database
make shell-db          # Open database shell

# Code quality
make lint              # Run linting
make lint-fix          # Fix linting issues

# Container management
make stop              # Stop all services
make restart           # Restart services
make rebuild           # Rebuild and restart
make clean             # Clean up Docker resources

# View service status
make status            # Container status
make health            # Health check all services
make creds             # Show development login credentials
```

## 📚 **Documentation**

- 🛠️ **[Development Guide](docs/DEVELOPMENT.md)** - Local setup, development workflow, and authentication logging
- 🚀 **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions  
- 📖 **[API Documentation](docs/API.md)** - Complete API reference

### 🔑 **Quick Access**
- **Development Login**: Run `make creds` to see test user credentials
- **Authentication Logs**: See [Development Guide - Authentication Logs](docs/DEVELOPMENT.md#authentication-and-security-logs)
- **Troubleshooting**: See [Development Guide - Troubleshooting](docs/DEVELOPMENT.md#troubleshooting)