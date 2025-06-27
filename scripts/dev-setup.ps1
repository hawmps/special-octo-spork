# Field Service CRM - Development Setup Script (Windows PowerShell)
param(
    [string]$Command = "start"
)

# Colors for output (PowerShell)
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$NC = "`e[0m"  # No Color

Write-Host "${Blue}🚀 Field Service CRM - Development Setup${NC}"
Write-Host ""

# Check prerequisites
function Test-Prerequisites {
    Write-Host "${Yellow}Checking prerequisites...${NC}"
    
    # Check if Docker is installed and running
    try {
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            Write-Host "${Red}❌ Docker is not installed${NC}"
            Write-Host "Please install Docker Desktop: https://docs.docker.com/desktop/windows/"
            exit 1
        }
    }
    catch {
        Write-Host "${Red}❌ Docker is not installed${NC}"
        Write-Host "Please install Docker Desktop: https://docs.docker.com/desktop/windows/"
        exit 1
    }
    
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "${Red}❌ Docker is not running${NC}"
            Write-Host "Please start Docker Desktop and try again"
            exit 1
        }
    }
    catch {
        Write-Host "${Red}❌ Docker is not running${NC}"
        Write-Host "Please start Docker Desktop and try again"
        exit 1
    }
    
    # Check if Docker Compose is available
    try {
        docker compose version 2>$null | Out-Null
        $composeCmd = "docker compose"
    }
    catch {
        try {
            docker-compose --version 2>$null | Out-Null
            $composeCmd = "docker-compose"
        }
        catch {
            Write-Host "${Red}❌ Docker Compose is not available${NC}"
            Write-Host "Please install Docker Compose"
            exit 1
        }
    }
    
    Write-Host "${Green}✅ Prerequisites met${NC}"
    return $composeCmd
}

# Setup environment file
function Set-Environment {
    Write-Host "${Yellow}Setting up environment...${NC}"
    
    if (-not (Test-Path ".env.local")) {
        Write-Host "Creating .env.local from template..."
        Copy-Item ".env.development" ".env.local"
        Write-Host "${Green}✅ Created .env.local${NC}"
        Write-Host "${Yellow}📝 Please review and customize .env.local as needed${NC}"
    }
    else {
        Write-Host "${Green}✅ .env.local already exists${NC}"
    }
}

# Build and start services
function Start-Services {
    param([string]$ComposeCmd)
    
    Write-Host "${Yellow}Building and starting services...${NC}"
    
    # Build images
    Write-Host "Building Docker images..."
    & $ComposeCmd.Split() build
    
    # Start core services (without nginx by default)
    Write-Host "Starting services..."
    & $ComposeCmd.Split() up -d postgres redis minio mailhog adminer
    
    # Wait for database to be ready
    Write-Host "Waiting for database to be ready..."
    $maxAttempts = 30
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            & $ComposeCmd.Split() exec -T postgres pg_isready -U postgres -d fieldservicecrm 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "${Green}✅ Database is ready${NC}"
                break
            }
        }
        catch {
            # Continue waiting
        }
        Write-Host "Waiting for database... ($i/$maxAttempts)"
        Start-Sleep -Seconds 2
    }
    
    # Start application services
    Write-Host "Starting application services..."
    & $ComposeCmd.Split() up -d backend frontend
    
    Write-Host "${Green}✅ All services started${NC}"
}

# Run database migrations
function Start-Migrations {
    param([string]$ComposeCmd)
    
    Write-Host "${Yellow}Running database migrations...${NC}"
    
    # Wait for backend to be ready
    Write-Host "Waiting for backend to be ready..."
    $maxAttempts = 30
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 2>$null
            if ($response.StatusCode -eq 200) {
                Write-Host "${Green}✅ Backend is ready${NC}"
                break
            }
        }
        catch {
            # Continue waiting
        }
        Write-Host "Waiting for backend... ($i/$maxAttempts)"
        Start-Sleep -Seconds 2
    }
    
    # Run migrations
    & $ComposeCmd.Split() exec backend npm run migrate
    Write-Host "${Green}✅ Database migrations completed${NC}"
}

# Load sample data
function Start-SampleData {
    param([string]$ComposeCmd)
    
    Write-Host "${Yellow}Loading sample data...${NC}"
    & $ComposeCmd.Split() exec backend npm run seed
    Write-Host "${Green}✅ Sample data loaded${NC}"
}

# Display status and URLs
function Show-Status {
    Write-Host ""
    Write-Host "${Green}🎉 Development environment is ready!${NC}"
    Write-Host ""
    Write-Host "${Blue}📋 Service URLs:${NC}"
    Write-Host "  🌐 Frontend (React App):     http://localhost:3000"
    Write-Host "  🔧 Backend API:              http://localhost:3001"
    Write-Host "  🔧 API Health Check:         http://localhost:3001/health"
    Write-Host "  🗄️  Database Admin (Adminer): http://localhost:8080"
    Write-Host "  📧 Email Testing (MailHog):  http://localhost:8025"
    Write-Host "  💾 MinIO Console:            http://localhost:9001"
    Write-Host "  🔍 MinIO API:                http://localhost:9000"
    Write-Host ""
    Write-Host "${Blue}🔑 Development Login Credentials:${NC}"
    Write-Host "  👑 Platform Admin:     admin@test.com / admin123"
    Write-Host "  👨‍💼 Field Manager:       manager@test.com / manager123"
    Write-Host "  🔧 Field Technician:   tech@test.com / tech123"
    Write-Host ""
    Write-Host "${Blue}📊 Database Connection:${NC}"
    Write-Host "  Host: localhost"
    Write-Host "  Port: 5432"
    Write-Host "  Database: fieldservicecrm"
    Write-Host "  Username: postgres"
    Write-Host "  Password: dev_password_123"
    Write-Host ""
    Write-Host "${Blue}🛠️  Development Commands:${NC}"
    Write-Host "  View logs:           docker compose logs -f"
    Write-Host "  Stop services:       docker compose down"
    Write-Host "  Restart services:    docker compose restart"
    Write-Host "  Rebuild images:      docker compose build --no-cache"
    Write-Host "  Shell into backend:  docker compose exec backend sh"
    Write-Host "  Shell into frontend: docker compose exec frontend sh"
    Write-Host ""
    Write-Host "${Yellow}💡 Tips:${NC}"
    Write-Host "  - Backend has hot reload enabled with nodemon"
    Write-Host "  - Frontend has hot reload enabled with React dev server"
    Write-Host "  - Database data persists between restarts"
    Write-Host "  - Use MailHog to test email functionality"
    Write-Host "  - Use MinIO as local S3-compatible storage"
    Write-Host "  - Development auth bypasses AWS Cognito for easy testing"
    Write-Host "  - Use PowerShell script: .\scripts\dev-setup.ps1 <command>"
}

# Main execution
switch ($Command.ToLower()) {
    "start" {
        $composeCmd = Test-Prerequisites
        Set-Environment
        Start-Services -ComposeCmd $composeCmd
        Start-Migrations -ComposeCmd $composeCmd
        Start-SampleData -ComposeCmd $composeCmd
        Show-Status
    }
    "stop" {
        Write-Host "${Yellow}Stopping services...${NC}"
        $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            try {
                docker compose version 2>$null | Out-Null
                "docker compose"
            }
            catch {
                "docker-compose"
            }
        }
        & $composeCmd.Split() down
        Write-Host "${Green}✅ Services stopped${NC}"
    }
    "restart" {
        Write-Host "${Yellow}Restarting services...${NC}"
        $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            try {
                docker compose version 2>$null | Out-Null
                "docker compose"
            }
            catch {
                "docker-compose"
            }
        }
        & $composeCmd.Split() restart
        Write-Host "${Green}✅ Services restarted${NC}"
    }
    "rebuild" {
        Write-Host "${Yellow}Rebuilding and restarting services...${NC}"
        $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            try {
                docker compose version 2>$null | Out-Null
                "docker compose"
            }
            catch {
                "docker-compose"
            }
        }
        & $composeCmd.Split() down
        & $composeCmd.Split() build --no-cache
        & $composeCmd.Split() up -d
        Write-Host "${Green}✅ Services rebuilt and started${NC}"
    }
    "logs" {
        $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            try {
                docker compose version 2>$null | Out-Null
                "docker compose"
            }
            catch {
                "docker-compose"
            }
        }
        & $composeCmd.Split() logs -f
    }
    "clean" {
        Write-Host "${Yellow}Cleaning up Docker resources...${NC}"
        $composeCmd = if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            try {
                docker compose version 2>$null | Out-Null
                "docker compose"
            }
            catch {
                "docker-compose"
            }
        }
        & $composeCmd.Split() down -v --remove-orphans
        docker system prune -f
        Write-Host "${Green}✅ Cleanup completed${NC}"
    }
    default {
        Write-Host "${Red}❌ Unknown command: $Command${NC}"
        Write-Host "Usage: .\scripts\dev-setup.ps1 [command]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  start    - Start development environment (default)"
        Write-Host "  stop     - Stop all services"
        Write-Host "  restart  - Restart all services"
        Write-Host "  rebuild  - Rebuild images and restart services"
        Write-Host "  logs     - Show logs from all services"
        Write-Host "  clean    - Clean up all Docker resources"
        exit 1
    }
}