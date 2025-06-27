# Field Service CRM - Development Makefile

.PHONY: help start stop restart rebuild clean logs shell test lint install

# Default target
.DEFAULT_GOAL := help

# Docker Compose command (try docker compose first, fallback to docker-compose)
DOCKER_COMPOSE := $(shell which docker 2>/dev/null && docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "Field Service CRM Development Commands"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

check-docker: ## Check if Docker is available
	@which docker >/dev/null || (echo "$(RED)Docker not found. Please install Docker.$(NC)" && exit 1)
	@docker info >/dev/null 2>&1 || (echo "$(RED)Docker is not running. Please start Docker.$(NC)" && exit 1)

start: check-docker ## Start the development environment
	@echo "$(GREEN)Starting Field Service CRM development environment...$(NC)"
	@./scripts/dev-setup.sh start

stop: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)Restarting services...$(NC)"
	@$(DOCKER_COMPOSE) restart
	@echo "$(GREEN)Services restarted$(NC)"

rebuild: ## Rebuild images and restart services
	@echo "$(YELLOW)Rebuilding images...$(NC)"
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) build --no-cache
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services rebuilt and started$(NC)"

clean: ## Clean up Docker resources
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	@$(DOCKER_COMPOSE) down -v --remove-orphans
	@docker system prune -f
	@echo "$(GREEN)Cleanup completed$(NC)"

logs: ## Show logs from all services
	@$(DOCKER_COMPOSE) logs -f

logs-backend: ## Show backend logs
	@$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## Show frontend logs
	@$(DOCKER_COMPOSE) logs -f frontend

logs-db: ## Show database logs
	@$(DOCKER_COMPOSE) logs -f postgres

status: ## Show service status
	@$(DOCKER_COMPOSE) ps

shell-backend: ## Open shell in backend container
	@$(DOCKER_COMPOSE) exec backend sh

shell-frontend: ## Open shell in frontend container
	@$(DOCKER_COMPOSE) exec frontend sh

shell-db: ## Open PostgreSQL shell
	@$(DOCKER_COMPOSE) exec postgres psql -U postgres -d fieldservicecrm

test: ## Run all tests
	@echo "$(YELLOW)Running backend tests...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm test
	@echo "$(YELLOW)Running frontend tests...$(NC)"
	@$(DOCKER_COMPOSE) exec frontend npm test -- --watchAll=false

test-backend: ## Run backend tests only
	@$(DOCKER_COMPOSE) exec backend npm test

test-frontend: ## Run frontend tests only
	@$(DOCKER_COMPOSE) exec frontend npm test -- --watchAll=false

lint: ## Run linting on all code
	@echo "$(YELLOW)Linting backend...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm run lint
	@echo "$(YELLOW)Linting frontend...$(NC)"
	@$(DOCKER_COMPOSE) exec frontend npm run lint

lint-fix: ## Fix linting issues
	@echo "$(YELLOW)Fixing backend linting...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm run lint:fix
	@echo "$(YELLOW)Fixing frontend linting...$(NC)"
	@$(DOCKER_COMPOSE) exec frontend npm run lint:fix

install: ## Install dependencies in containers
	@echo "$(YELLOW)Installing backend dependencies...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm install
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
	@$(DOCKER_COMPOSE) exec frontend npm install

migrate: ## Run database migrations
	@echo "$(YELLOW)Running database migrations...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm run migrate
	@echo "$(GREEN)Migrations completed$(NC)"

seed: ## Load sample data
	@echo "$(YELLOW)Loading sample data...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm run seed
	@echo "$(GREEN)Sample data loaded$(NC)"

reset-db: ## Reset database (drop and recreate)
	@echo "$(RED)WARNING: This will destroy all data!$(NC)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	@$(DOCKER_COMPOSE) exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS fieldservicecrm;"
	@$(DOCKER_COMPOSE) exec postgres psql -U postgres -c "CREATE DATABASE fieldservicecrm;"
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "$(GREEN)Database reset completed$(NC)"

backup-db: ## Backup database to file
	@echo "$(YELLOW)Creating database backup...$(NC)"
	@mkdir -p backups
	@$(DOCKER_COMPOSE) exec postgres pg_dump -U postgres fieldservicecrm > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Database backup created in backups/$(NC)"

restore-db: ## Restore database from latest backup
	@echo "$(YELLOW)Restoring database from backup...$(NC)"
	@LATEST_BACKUP=$$(ls -t backups/*.sql | head -n1); \
	if [ -z "$$LATEST_BACKUP" ]; then \
		echo "$(RED)No backup files found in backups/$(NC)"; \
		exit 1; \
	fi; \
	echo "Restoring from: $$LATEST_BACKUP"; \
	$(DOCKER_COMPOSE) exec -T postgres psql -U postgres fieldservicecrm < "$$LATEST_BACKUP"
	@echo "$(GREEN)Database restored$(NC)"

open: ## Open application URLs in browser (macOS)
	@echo "$(GREEN)Opening application URLs...$(NC)"
	@open http://localhost:3000  # Frontend
	@open http://localhost:3001/health  # Backend health
	@open http://localhost:8080  # Database admin
	@open http://localhost:8025  # Email testing

health: ## Check health of all services
	@echo "$(YELLOW)Checking service health...$(NC)"
	@echo -n "Frontend: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 && echo " $(GREEN)✓$(NC)" || echo " $(RED)✗$(NC)"
	@echo -n "Backend:  "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health && echo " $(GREEN)✓$(NC)" || echo " $(RED)✗$(NC)"
	@echo -n "Database: "; $(DOCKER_COMPOSE) exec postgres pg_isready -U postgres -d fieldservicecrm >/dev/null 2>&1 && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "Redis:    "; $(DOCKER_COMPOSE) exec redis redis-cli ping >/dev/null 2>&1 && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"

creds: ## Show development login credentials
	@echo "$(GREEN)🔑 Development Login Credentials:$(NC)"
	@echo "  👑 Platform Admin:     admin@test.com / admin123"
	@echo "  👨‍💼 Field Manager:       manager@test.com / manager123"
	@echo "  🔧 Field Technician:   tech@test.com / tech123"
	@echo ""
	@echo "$(GREEN)📱 Application URL: http://localhost:3000$(NC)"

dev-tools: ## Start additional development tools (nginx proxy)
	@echo "$(YELLOW)Starting development tools...$(NC)"
	@$(DOCKER_COMPOSE) --profile nginx up -d nginx
	@echo "$(GREEN)Nginx proxy available at http://localhost:80$(NC)"

production: ## Build and test production images locally
	@echo "$(YELLOW)Building production images...$(NC)"
	@docker build -t crm-backend:prod ./backend
	@docker build -t crm-frontend:prod ./frontend
	@echo "$(GREEN)Production images built$(NC)"
	@echo "To test: docker run -p 3001:3001 crm-backend:prod"
	@echo "To test: docker run -p 3000:80 crm-frontend:prod"

deploy-dev: ## Deploy to development environment
	@echo "$(YELLOW)Deploying to development environment...$(NC)"
	@./scripts/deploy.sh dev

deploy-staging: ## Deploy to staging environment
	@echo "$(YELLOW)Deploying to staging environment...$(NC)"
	@./scripts/deploy.sh staging

deploy-prod: ## Deploy to production environment
	@echo "$(RED)WARNING: Deploying to production!$(NC)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	@./scripts/deploy.sh prod

setup-env: ## Setup environment file
	@if [ ! -f ".env.local" ]; then \
		cp .env.development .env.local; \
		echo "$(GREEN)Created .env.local from template$(NC)"; \
		echo "$(YELLOW)Please review and customize .env.local$(NC)"; \
	else \
		echo "$(GREEN).env.local already exists$(NC)"; \
	fi

docs: ## Generate and view documentation
	@echo "$(YELLOW)Documentation available:$(NC)"
	@echo "  API Documentation:    docs/API.md"
	@echo "  Deployment Guide:     docs/DEPLOYMENT.md"
	@echo "  Development Guide:    docs/DEVELOPMENT.md"
	@echo "  Main README:          README.md"

# Advanced targets
monitor: ## Show real-time container resource usage
	@docker stats

network: ## Show Docker network information
	@$(DOCKER_COMPOSE) exec backend ip addr show
	@echo ""
	@docker network ls

volumes: ## Show Docker volume information
	@docker volume ls | grep crm

update: ## Update all dependencies
	@echo "$(YELLOW)Updating backend dependencies...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm update
	@echo "$(YELLOW)Updating frontend dependencies...$(NC)"
	@$(DOCKER_COMPOSE) exec frontend npm update
	@echo "$(GREEN)Dependencies updated$(NC)"

security-scan: ## Run security audit
	@echo "$(YELLOW)Running security audit...$(NC)"
	@$(DOCKER_COMPOSE) exec backend npm audit
	@$(DOCKER_COMPOSE) exec frontend npm audit