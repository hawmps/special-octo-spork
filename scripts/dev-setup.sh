#!/bin/bash

# Field Service CRM - Development Setup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Field Service CRM - Development Setup${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo "Please start Docker and try again"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not available${NC}"
        echo "Please install Docker Compose"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites met${NC}"
}

# Setup environment file
setup_environment() {
    echo -e "${YELLOW}Setting up environment...${NC}"
    
    if [ ! -f ".env.local" ]; then
        echo "Creating .env.local from template..."
        cp .env.development .env.local
        echo -e "${GREEN}✅ Created .env.local${NC}"
        echo -e "${YELLOW}📝 Please review and customize .env.local as needed${NC}"
    else
        echo -e "${GREEN}✅ .env.local already exists${NC}"
    fi
}

# Build and start services
start_services() {
    echo -e "${YELLOW}Building and starting services...${NC}"
    
    # Use docker compose if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Build images
    echo "Building Docker images..."
    $COMPOSE_CMD build
    
    # Start core services (without nginx by default)
    echo "Starting services..."
    $COMPOSE_CMD up -d postgres redis minio mailhog adminer
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    for i in {1..30}; do
        if $COMPOSE_CMD exec -T postgres pg_isready -U postgres -d fieldservicecrm &> /dev/null; then
            echo -e "${GREEN}✅ Database is ready${NC}"
            break
        fi
        echo "Waiting for database... ($i/30)"
        sleep 2
    done
    
    # Start application services
    echo "Starting application services..."
    $COMPOSE_CMD up -d backend frontend
    
    echo -e "${GREEN}✅ All services started${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # Use docker compose if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Wait for backend to be ready
    echo "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            echo -e "${GREEN}✅ Backend is ready${NC}"
            break
        fi
        echo "Waiting for backend... ($i/30)"
        sleep 2
    done
    
    # Run migrations
    $COMPOSE_CMD exec backend npm run migrate
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Load sample data
load_sample_data() {
    echo -e "${YELLOW}Loading sample data...${NC}"
    
    # Use docker compose if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD exec backend npm run seed
    echo -e "${GREEN}✅ Sample data loaded${NC}"
}

# Display status and URLs
show_status() {
    echo ""
    echo -e "${GREEN}🎉 Development environment is ready!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service URLs:${NC}"
    echo "  🌐 Frontend (React App):     http://localhost:3000"
    echo "  🔧 Backend API:              http://localhost:3001"
    echo "  🔧 API Health Check:         http://localhost:3001/health"
    echo "  🗄️  Database Admin (Adminer): http://localhost:8080"
    echo "  📧 Email Testing (MailHog):  http://localhost:8025"
    echo "  💾 MinIO Console:            http://localhost:9001"
    echo "  🔍 MinIO API:                http://localhost:9000"
    echo ""
    echo -e "${BLUE}🔑 Development Login Credentials:${NC}"
    echo "  👑 Platform Admin:     admin@test.com / admin123"
    echo "  👨‍💼 Field Manager:       manager@test.com / manager123"
    echo "  🔧 Field Technician:   tech@test.com / tech123"
    echo ""
    echo -e "${BLUE}📊 Database Connection:${NC}"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: fieldservicecrm"
    echo "  Username: postgres"
    echo "  Password: dev_password_123"
    echo ""
    echo -e "${BLUE}🛠️  Development Commands:${NC}"
    echo "  View logs:           docker-compose logs -f"
    echo "  Stop services:       docker-compose down"
    echo "  Restart services:    docker-compose restart"
    echo "  Rebuild images:      docker-compose build --no-cache"
    echo "  Shell into backend:  docker-compose exec backend sh"
    echo "  Shell into frontend: docker-compose exec frontend sh"
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo "  - Backend has hot reload enabled with nodemon"
    echo "  - Frontend has hot reload enabled with React dev server"
    echo "  - Database data persists between restarts"
    echo "  - Use MailHog to test email functionality"
    echo "  - Use MinIO as local S3-compatible storage"
    echo "  - Development auth bypasses AWS Cognito for easy testing"
}

# Main execution
main() {
    case ${1:-start} in
        "start")
            check_prerequisites
            setup_environment
            start_services
            run_migrations
            load_sample_data
            show_status
            ;;
        "stop")
            echo -e "${YELLOW}Stopping services...${NC}"
            if docker compose version &> /dev/null; then
                docker compose down
            else
                docker-compose down
            fi
            echo -e "${GREEN}✅ Services stopped${NC}"
            ;;
        "restart")
            echo -e "${YELLOW}Restarting services...${NC}"
            if docker compose version &> /dev/null; then
                docker compose restart
            else
                docker-compose restart
            fi
            echo -e "${GREEN}✅ Services restarted${NC}"
            ;;
        "rebuild")
            echo -e "${YELLOW}Rebuilding and restarting services...${NC}"
            if docker compose version &> /dev/null; then
                docker compose down
                docker compose build --no-cache
                docker compose up -d
            else
                docker-compose down
                docker-compose build --no-cache
                docker-compose up -d
            fi
            echo -e "${GREEN}✅ Services rebuilt and started${NC}"
            ;;
        "logs")
            if docker compose version &> /dev/null; then
                docker compose logs -f
            else
                docker-compose logs -f
            fi
            ;;
        "clean")
            echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
            if docker compose version &> /dev/null; then
                docker compose down -v --remove-orphans
            else
                docker-compose down -v --remove-orphans
            fi
            docker system prune -f
            echo -e "${GREEN}✅ Cleanup completed${NC}"
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start    - Start development environment (default)"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  rebuild  - Rebuild images and restart services"
            echo "  logs     - Show logs from all services"
            echo "  clean    - Clean up all Docker resources"
            echo "  help     - Show this help message"
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo "Use '$0 help' to see available commands"
            exit 1
            ;;
    esac
}

main "$@"