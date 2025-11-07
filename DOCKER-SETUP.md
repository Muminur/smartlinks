# Docker Setup Guide - TinyURL Clone

Complete guide for setting up and running the TinyURL Clone using Docker.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Environment](#development-environment)
4. [Production Deployment](#production-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Prerequisites

### Required Software
- **Docker** (v20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **Git** (for version control)

### System Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 5GB free
- **OS**: Linux, macOS, or Windows with WSL2

### Installation Instructions

#### macOS
```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop and verify
docker --version
docker-compose --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

#### Windows
1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Enable WSL2 backend
3. Restart your computer
4. Verify installation in PowerShell:
```powershell
docker --version
docker-compose --version
```

---

## Initial Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd shortlinks-app
```

### 2. Environment Configuration

#### Using Makefile (Recommended)
```bash
# Quick setup - creates all .env files
make setup
```

#### Manual Setup
```bash
# Root environment
cp .env.example .env

# Frontend environment
cp frontend/.env.local.example frontend/.env.local

# Backend environment
cp backend/.env.example backend/.env
```

### 3. Configure Environment Variables

Edit the `.env` file with your configuration:

```bash
# Open in your favorite editor
nano .env
# or
vim .env
# or
code .env
```

**Critical Variables to Change:**
```env
# Security - MUST CHANGE in production
JWT_SECRET=your-unique-secret-here
JWT_REFRESH_SECRET=your-unique-refresh-secret-here
MONGO_PASSWORD=your-strong-password-here
REDIS_PASSWORD=your-strong-password-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Generate Strong Secrets:**
```bash
# Generate JWT secrets
openssl rand -base64 64

# Generate 32-character alphanumeric
openssl rand -hex 32
```

---

## Development Environment

### Quick Start (Using Makefile)

```bash
# 1. Setup environment
make setup

# 2. Build images
make build

# 3. Start services
make up

# 4. View logs
make logs
```

### Manual Docker Commands

#### Build Images
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend

# Build without cache (fresh build)
docker-compose build --no-cache
```

#### Start Services
```bash
# Start all services in background
docker-compose up -d

# Start with live logs
docker-compose up

# Start specific services
docker-compose up -d mongodb redis backend
```

#### Monitor Services
```bash
# Check running services
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100 backend
```

#### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: Data loss!)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### Service URLs

Once running, access services at:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| Backend API | http://localhost:5000/api | Express.js API |
| API Docs | http://localhost:5000/api-docs | Swagger documentation |
| Nginx | http://localhost:80 | Reverse proxy |
| MongoDB | localhost:27017 | Database (use MongoDB Compass) |
| Redis | localhost:6379 | Cache (use Redis GUI) |

### Hot Reload (Development)

Hot reload is automatically enabled for:
- **Frontend**: Next.js Fast Refresh with Turbopack
- **Backend**: Nodemon watches for file changes

Files are mounted as volumes, so changes reflect immediately without rebuilding.

### Database Access

#### MongoDB
```bash
# Connect via Docker
docker-compose exec mongodb mongosh -u admin -p admin123

# Or use MongoDB Compass
# Connection string: mongodb://admin:admin123@localhost:27017/tinyurl?authSource=admin
```

#### Redis
```bash
# Connect via Docker
docker-compose exec redis redis-cli -a redis123

# Test connection
docker-compose exec redis redis-cli -a redis123 ping
```

### Running Commands Inside Containers

```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# Run npm commands
docker-compose exec backend npm run test
docker-compose exec frontend npm run lint

# Database migrations
docker-compose exec backend npm run migrate
```

---

## Production Deployment

### 1. Production Environment Setup

```bash
# Use production docker-compose
export COMPOSE_FILE=docker-compose.prod.yml

# Or use -f flag
docker-compose -f docker-compose.prod.yml <command>
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# 1. Update nginx.conf with your domain
# Uncomment HTTPS server block in docker/nginx/nginx.conf

# 2. Initialize SSL certificates
make ssl-init

# Or manually:
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com --agree-tos

# 3. Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### Option B: Custom SSL Certificates
```bash
# Place certificates in docker/nginx/ssl/
mkdir -p docker/nginx/ssl
cp /path/to/fullchain.pem docker/nginx/ssl/
cp /path/to/privkey.pem docker/nginx/ssl/
```

### 3. Production Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Build production images
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. Stop old containers
docker-compose -f docker-compose.prod.yml down

# 4. Start new containers
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify health
docker-compose -f docker-compose.prod.yml ps

# 6. Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Database Backup (Production)

```bash
# Create backup
docker-compose exec mongodb mongodump \
  -u admin -p ${MONGO_PASSWORD} \
  --authenticationDatabase admin \
  -o /backup/$(date +%Y%m%d)

# Copy backup to host
docker cp tinyurl-mongodb-prod:/backup ./backups

# Automate with cron
# Add to crontab: 0 2 * * * /path/to/backup-script.sh
```

### 5. Monitoring and Logs

```bash
# View resource usage
docker stats

# Production logs
docker-compose -f docker-compose.prod.yml logs -f

# Export logs
docker-compose -f docker-compose.prod.yml logs --no-color > logs.txt

# Log rotation is automatic (max 10MB, 3 files)
```

### 6. Zero-Downtime Updates

```bash
# 1. Build new images
docker-compose -f docker-compose.prod.yml build

# 2. Create new containers without stopping old ones
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend

# 3. Nginx will route to healthy containers
# 4. Old containers are automatically removed
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :5000
lsof -i :27017

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

#### 2. MongoDB Connection Failed
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Test connection
docker-compose exec mongodb mongosh -u admin -p admin123
```

#### 3. Redis Connection Failed
```bash
# Check Redis status
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli -a redis123 ping

# Check password
# Ensure REDIS_PASSWORD matches in all services
```

#### 4. Container Keeps Restarting
```bash
# Check logs for errors
docker-compose logs <service-name>

# Check exit code
docker-compose ps

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port conflicts
# - Out of memory
```

#### 5. Hot Reload Not Working
```bash
# Ensure polling is enabled
# In docker-compose.yml, check:
# Frontend: CHOKIDAR_USEPOLLING=true
# Backend: Use --legacy-watch flag in nodemon

# Restart containers
docker-compose restart backend frontend
```

#### 6. Out of Disk Space
```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove specific items
docker image prune
docker volume prune
docker container prune
```

### Debug Commands

```bash
# Inspect container
docker inspect tinyurl-backend

# Check container processes
docker-compose top

# Check container network
docker-compose exec backend ping mongodb
docker-compose exec backend ping redis

# View environment variables
docker-compose exec backend env

# Test service health
curl http://localhost:5000/health
curl http://localhost:3000/api/health
```

### Reset Everything

```bash
# Nuclear option - removes everything
make clean

# Or manually:
docker-compose down -v --rmi all --remove-orphans
docker system prune -af --volumes

# Then rebuild:
make build
make up
```

---

## Best Practices

### Development
1. **Use .dockerignore** to exclude node_modules and build files
2. **Mount volumes** for hot reload (already configured)
3. **Use named volumes** for persistent data
4. **Enable health checks** to catch issues early
5. **Keep images small** with multi-stage builds
6. **Use environment-specific** compose files

### Security
1. **Never commit .env** files to git
2. **Use strong passwords** and secrets
3. **Rotate secrets** regularly
4. **Run as non-root** user (already configured)
5. **Enable SSL/TLS** in production
6. **Keep images updated** with security patches
7. **Scan images** for vulnerabilities
   ```bash
   docker scan tinyurl-backend
   ```

### Performance
1. **Optimize image layers** to use Docker cache
2. **Use .dockerignore** to reduce context size
3. **Configure resource limits** to prevent OOM
4. **Enable logging rotation** (configured in prod)
5. **Monitor resource usage** with `docker stats`

### Production
1. **Always use docker-compose.prod.yml** in production
2. **Set restart: always** for critical services
3. **Enable monitoring** and health checks
4. **Implement backup strategy** for databases
5. **Use CI/CD** for automated deployments
6. **Keep production logs** for debugging
7. **Test updates** in staging first

---

## Additional Resources

### Official Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Docs](https://nextjs.org/docs/deployment)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

### Tools
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Portainer](https://www.portainer.io/) - Docker GUI
- [Lazydocker](https://github.com/jesseduffield/lazydocker) - Terminal UI
- [MongoDB Compass](https://www.mongodb.com/products/compass) - MongoDB GUI
- [Redis Insight](https://redis.com/redis-enterprise/redis-insight/) - Redis GUI

### Makefile Commands
See `Makefile` for all available commands:
```bash
make help
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review Docker logs: `make logs`
3. Check service health: `make health`
4. See troubleshooting section above
5. Create an issue in the repository

---

**Last Updated**: November 2025
