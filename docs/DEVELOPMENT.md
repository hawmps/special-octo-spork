# Field Service CRM - Development Guide

This guide helps you set up and run the Field Service CRM system locally for development and testing.

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)
- [Git](https://git-scm.com/)

### One-Command Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd field-service-crm

# Start the entire development environment
./scripts/dev-setup.sh
```

This will:
- ✅ Build all Docker images
- ✅ Start all required services (PostgreSQL, Redis, MinIO, MailHog)
- ✅ Run database migrations
- ✅ Load sample data
- ✅ Start the backend API and frontend app

## Services Overview

The development environment includes these services:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | React application with hot reload |
| **Backend API** | http://localhost:3001 | Node.js Express API with debugging |
| **Database Admin** | http://localhost:8080 | Adminer for PostgreSQL management |
| **Email Testing** | http://localhost:8025 | MailHog for email testing |
| **File Storage** | http://localhost:9001 | MinIO console (S3-compatible) |
| **PostgreSQL** | localhost:5432 | Database server |
| **Redis** | localhost:6379 | Caching and sessions |

## Development Commands

### Basic Commands
```bash
# Start development environment
./scripts/dev-setup.sh start

# Stop all services
./scripts/dev-setup.sh stop

# Restart services
./scripts/dev-setup.sh restart

# View real-time logs
./scripts/dev-setup.sh logs

# Rebuild images and restart
./scripts/dev-setup.sh rebuild

# Clean up all Docker resources
./scripts/dev-setup.sh clean
```

### Docker Compose Commands
```bash
# Start specific services
docker-compose up -d postgres redis

# View logs for specific service
docker-compose logs -f backend

# Execute commands in containers
docker-compose exec backend npm run migrate
docker-compose exec frontend npm test

# Shell access to containers
docker-compose exec backend sh
docker-compose exec frontend sh

# Scale services (if needed)
docker-compose up -d --scale backend=2
```

## Configuration

### Environment Variables
Copy and customize the environment file:
```bash
cp .env.development .env.local
```

Key configuration options:
```bash
# Database
DB_PASSWORD=dev_password_123
DB_HOST=localhost

# Authentication (development only)
JWT_SECRET=dev_jwt_secret_key_for_development_only

# AWS Services (optional for local dev)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
COGNITO_USER_POOL_ID=your_pool_id

# MinIO (local S3)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
```

### Hot Reload
Both frontend and backend support hot reload:

- **Frontend**: React dev server automatically reloads on file changes
- **Backend**: Nodemon restarts the server when source files change
- **Database**: Schema changes require running migrations

## Database Management

### Accessing the Database
1. **Adminer Web UI**: http://localhost:8080
   - Server: `postgres`
   - Username: `postgres`
   - Password: `dev_password_123`
   - Database: `fieldservicecrm`

2. **Command Line**:
   ```bash
   docker-compose exec postgres psql -U postgres -d fieldservicecrm
   ```

3. **External Tools**: Connect to `localhost:5432`

### Database Operations
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Load sample data
docker-compose exec backend npm run seed

# Backup database
docker-compose exec postgres pg_dump -U postgres fieldservicecrm > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres fieldservicecrm < backup.sql
```

## Development Workflow

### Making Code Changes

1. **Backend Changes**:
   - Edit files in `backend/src/`
   - Nodemon automatically restarts the server
   - Check logs: `docker-compose logs -f backend`

2. **Frontend Changes**:
   - Edit files in `frontend/src/`
   - React dev server automatically reloads the browser
   - Check logs: `docker-compose logs -f frontend`

3. **Database Changes**:
   - Create new migration files in `backend/migrations/`
   - Run: `docker-compose exec backend npm run migrate`

### Testing

```bash
# Run backend tests
docker-compose exec backend npm test

# Run frontend tests
docker-compose exec frontend npm test

# Run linting
docker-compose exec backend npm run lint
docker-compose exec frontend npm run lint

# Run tests with coverage
docker-compose exec backend npm run test:coverage
docker-compose exec frontend npm test -- --coverage
```

### Debugging

#### Backend Debugging
The backend runs with the Node.js debugger enabled on port 9229:

1. **VS Code**: Use the included debug configuration
2. **Chrome DevTools**: Navigate to `chrome://inspect`
3. **Command Line**: 
   ```bash
   docker-compose exec backend node --inspect-brk=0.0.0.0:9229 src/server.js
   ```

#### Frontend Debugging
- Use browser developer tools
- React Developer Tools extension
- Console logs and breakpoints

## File Storage (MinIO)

MinIO provides S3-compatible storage for local development:

### Access MinIO
- **Console**: http://localhost:9001
- **API**: http://localhost:9000
- **Credentials**: minioadmin / minioadmin123

### Creating Buckets
```bash
# Create bucket via API
curl -X PUT http://localhost:9000/dev-bucket \
  -H "Authorization: AWS4-HMAC-SHA256 ..."

# Or use the web console at http://localhost:9001
```

## Email Testing (MailHog)

MailHog captures emails sent by the application:

- **Web Interface**: http://localhost:8025
- **SMTP Server**: localhost:1025
- **Configuration**: Already set in `.env.development`

All emails sent by the application will appear in the MailHog interface.

## API Testing

### Using the API
```bash
# Health check
curl http://localhost:3001/health

# Get accounts (requires authentication)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/accounts

# Create account
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"company_name":"Test Company","account_type":"commercial"}' \
     http://localhost:3001/api/accounts
```

### API Documentation
- Swagger/OpenAPI docs: http://localhost:3001/api-docs (if configured)
- See [API.md](./API.md) for complete endpoint documentation

## Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Check what's using a port
   lsof -i :3000
   # Kill process using port
   kill -9 <PID>
   ```

2. **Database Connection Issues**:
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   # Restart database
   docker-compose restart postgres
   ```

3. **Permission Issues**:
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

4. **Docker Issues**:
   ```bash
   # Clean up Docker
   docker system prune -a
   # Restart Docker daemon
   sudo systemctl restart docker  # Linux
   # Restart Docker Desktop        # Mac/Windows
   ```

### Logs and Debugging
```bash
# View all logs
docker-compose logs

# Follow logs for specific service
docker-compose logs -f backend

# View container status
docker-compose ps

# Check container resource usage
docker stats
```

### Performance Optimization

1. **Docker Performance**:
   - Increase Docker memory allocation (4GB+ recommended)
   - Use Docker Desktop with WSL2 on Windows
   - Consider using Docker volumes for node_modules

2. **Development Performance**:
   - Use file watching optimizations
   - Exclude node_modules from file watching
   - Use bind mounts for source code only

## Production Simulation

To test production-like behavior locally:

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Run with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Use nginx reverse proxy
docker-compose --profile nginx up -d
```

## VS Code Integration

Recommended VS Code extensions:
- Docker
- PostgreSQL
- REST Client
- React snippets
- Node.js debugging

### Workspace Settings
```json
{
  "docker.defaultRegistryPath": "localhost:5000",
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/build/**": true,
    "**/dist/**": true
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Set up development environment: `./scripts/dev-setup.sh`
4. Make your changes
5. Test your changes: `npm test`
6. Submit a pull request

## Support

- Check logs: `docker-compose logs`
- Review documentation in `/docs`
- Check GitHub issues
- Contact the development team

Happy coding! 🚀