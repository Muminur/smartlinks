# ==============================================
# TinyURL Clone - Makefile
# Quick commands for Docker and development
# ==============================================

.PHONY: help build up down restart logs ps clean test install

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)TinyURL Clone - Available Commands$(NC)"
	@echo ""
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'

## setup: Initial project setup
setup:
	@echo "$(GREEN)Setting up project...$(NC)"
	@cp .env.example .env 2>/dev/null || echo ".env already exists"
	@cp frontend/.env.local.example frontend/.env.local 2>/dev/null || echo "frontend/.env.local already exists"
	@cp backend/.env.example backend/.env 2>/dev/null || echo "backend/.env already exists"
	@mkdir -p docker/nginx/ssl
	@echo "$(GREEN)Setup complete! Please edit .env files with your configuration.$(NC)"

## install: Install dependencies for frontend and backend
install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@cd frontend && npm install
	@cd backend && npm install
	@echo "$(GREEN)Dependencies installed!$(NC)"

## build: Build all Docker images
build:
	@echo "$(GREEN)Building Docker images...$(NC)"
	@docker-compose build
	@echo "$(GREEN)Build complete!$(NC)"

## build-nc: Build all Docker images without cache
build-nc:
	@echo "$(GREEN)Building Docker images (no cache)...$(NC)"
	@docker-compose build --no-cache
	@echo "$(GREEN)Build complete!$(NC)"

## up: Start all services in detached mode
up:
	@echo "$(GREEN)Starting services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:5000$(NC)"
	@echo "$(YELLOW)Nginx: http://localhost:80$(NC)"

## dev: Start all services with logs
dev:
	@echo "$(GREEN)Starting services in development mode...$(NC)"
	@docker-compose up

## down: Stop all services
down:
	@echo "$(RED)Stopping services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)Services stopped!$(NC)"

## down-v: Stop all services and remove volumes
down-v:
	@echo "$(RED)Stopping services and removing volumes...$(NC)"
	@docker-compose down -v
	@echo "$(GREEN)Services stopped and volumes removed!$(NC)"

## restart: Restart all services
restart: down up
	@echo "$(GREEN)Services restarted!$(NC)"

## logs: View logs from all services
logs:
	@docker-compose logs -f

## logs-backend: View backend logs
logs-backend:
	@docker-compose logs -f backend

## logs-frontend: View frontend logs
logs-frontend:
	@docker-compose logs -f frontend

## logs-mongodb: View MongoDB logs
logs-mongodb:
	@docker-compose logs -f mongodb

## logs-redis: View Redis logs
logs-redis:
	@docker-compose logs -f redis

## logs-nginx: View Nginx logs
logs-nginx:
	@docker-compose logs -f nginx

## ps: List all running containers
ps:
	@docker-compose ps

## stats: Show container resource usage
stats:
	@docker stats

## shell-backend: Open shell in backend container
shell-backend:
	@docker-compose exec backend sh

## shell-frontend: Open shell in frontend container
shell-frontend:
	@docker-compose exec frontend sh

## shell-mongodb: Open MongoDB shell
shell-mongodb:
	@docker-compose exec mongodb mongosh -u admin -p admin123

## shell-redis: Open Redis CLI
shell-redis:
	@docker-compose exec redis redis-cli -a redis123

## test-backend: Run backend tests
test-backend:
	@echo "$(GREEN)Running backend tests...$(NC)"
	@docker-compose exec backend npm test

## test-frontend: Run frontend tests
test-frontend:
	@echo "$(GREEN)Running frontend tests...$(NC)"
	@docker-compose exec frontend npm test

## lint-backend: Lint backend code
lint-backend:
	@echo "$(GREEN)Linting backend code...$(NC)"
	@docker-compose exec backend npm run lint

## lint-frontend: Lint frontend code
lint-frontend:
	@echo "$(GREEN)Linting frontend code...$(NC)"
	@docker-compose exec frontend npm run lint

## clean: Clean up containers, images, and volumes
clean:
	@echo "$(RED)Cleaning up Docker resources...$(NC)"
	@docker-compose down -v --rmi all --remove-orphans
	@echo "$(GREEN)Cleanup complete!$(NC)"

## prune: Remove all unused Docker resources
prune:
	@echo "$(RED)Pruning unused Docker resources...$(NC)"
	@docker system prune -af --volumes
	@echo "$(GREEN)Prune complete!$(NC)"

## backup-db: Backup MongoDB database
backup-db:
	@echo "$(GREEN)Backing up MongoDB...$(NC)"
	@docker-compose exec mongodb mongodump -u admin -p admin123 --authenticationDatabase admin -o /backup
	@echo "$(GREEN)Backup complete! Check MongoDB container /backup directory$(NC)"

## restore-db: Restore MongoDB database
restore-db:
	@echo "$(GREEN)Restoring MongoDB...$(NC)"
	@docker-compose exec mongodb mongorestore -u admin -p admin123 --authenticationDatabase admin /backup
	@echo "$(GREEN)Restore complete!$(NC)"

## health: Check health of all services
health:
	@echo "$(GREEN)Checking service health...$(NC)"
	@curl -f http://localhost:5000/health || echo "$(RED)Backend unhealthy$(NC)"
	@curl -f http://localhost:3000/api/health || echo "$(RED)Frontend unhealthy$(NC)"
	@curl -f http://localhost:80/health || echo "$(RED)Nginx unhealthy$(NC)"
	@echo "$(GREEN)Health check complete!$(NC)"

## prod-build: Build production images
prod-build:
	@echo "$(GREEN)Building production images...$(NC)"
	@docker-compose -f docker-compose.prod.yml build
	@echo "$(GREEN)Production build complete!$(NC)"

## prod-up: Start production services
prod-up:
	@echo "$(GREEN)Starting production services...$(NC)"
	@docker-compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)Production services started!$(NC)"

## prod-down: Stop production services
prod-down:
	@echo "$(RED)Stopping production services...$(NC)"
	@docker-compose -f docker-compose.prod.yml down
	@echo "$(GREEN)Production services stopped!$(NC)"

## prod-logs: View production logs
prod-logs:
	@docker-compose -f docker-compose.prod.yml logs -f

## ssl-init: Initialize SSL certificates with Let's Encrypt
ssl-init:
	@echo "$(GREEN)Initializing SSL certificates...$(NC)"
	@docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
		--webroot --webroot-path=/var/www/certbot \
		-d your-domain.com -d www.your-domain.com \
		--email your-email@example.com --agree-tos --no-eff-email
	@echo "$(GREEN)SSL certificates initialized!$(NC)"

## ssl-renew: Renew SSL certificates
ssl-renew:
	@echo "$(GREEN)Renewing SSL certificates...$(NC)"
	@docker-compose -f docker-compose.prod.yml run --rm certbot renew
	@docker-compose -f docker-compose.prod.yml restart nginx
	@echo "$(GREEN)SSL certificates renewed!$(NC)"

## network: Show Docker network information
network:
	@docker network inspect shortlinks-app_tinyurl-network

## volumes: Show Docker volumes
volumes:
	@docker volume ls | grep shortlinks

## update: Update all Docker images
update:
	@echo "$(GREEN)Updating Docker images...$(NC)"
	@docker-compose pull
	@echo "$(GREEN)Images updated!$(NC)"
