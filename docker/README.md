# Docker Configuration Guide

This directory contains all Docker-related configuration files for the TinyURL Clone project.

## Directory Structure

```
docker/
├── backend.Dockerfile      # Backend Express.js Dockerfile
├── frontend.Dockerfile     # Frontend Next.js 16 Dockerfile
├── nginx/
│   ├── nginx.conf         # Nginx reverse proxy configuration
│   └── ssl/               # SSL certificates directory (create manually)
└── README.md              # This file
```

## Quick Start

### Development Environment

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Environment

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

## Services

### 1. MongoDB (Port 27017)
- **Image**: mongo:7.0
- **Container Name**: tinyurl-mongodb
- **Data Persistence**: mongodb_data volume
- **Default Credentials**: admin/admin123 (change in production)

### 2. Redis (Port 6379)
- **Image**: redis:7-alpine
- **Container Name**: tinyurl-redis
- **Data Persistence**: redis_data volume
- **Default Password**: redis123 (change in production)

### 3. Backend API (Port 5000)
- **Container Name**: tinyurl-backend
- **Technology**: Express.js + TypeScript
- **Hot Reload**: Enabled in development
- **Health Check**: http://localhost:5000/health

### 4. Frontend (Port 3000)
- **Container Name**: tinyurl-frontend
- **Technology**: Next.js 16 with Turbopack
- **Hot Reload**: Enabled in development
- **Health Check**: http://localhost:3000/api/health

### 5. Nginx (Port 80/443)
- **Container Name**: tinyurl-nginx
- **Purpose**: Reverse proxy and load balancer
- **Routes**:
  - `/` → Frontend
  - `/api/*` → Backend
  - `/:slug` → Backend redirect

## Environment Variables

Before starting, copy the example environment files:

```bash
# Root .env file
cp .env.example .env

# Frontend environment
cp frontend/.env.local.example frontend/.env.local

# Backend environment
cp backend/.env.example backend/.env
```

Edit these files with your actual configuration values.

## Building Images

### Build all images
```bash
docker-compose build
```

### Build specific service
```bash
docker-compose build backend
docker-compose build frontend
```

### Build with no cache
```bash
docker-compose build --no-cache
```

## Common Commands

### View running containers
```bash
docker-compose ps
```

### Execute command in container
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123
```

### View service logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Restart services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

## Volume Management

### List volumes
```bash
docker volume ls
```

### Inspect volume
```bash
docker volume inspect shortlinks-app_mongodb_data
```

### Backup MongoDB data
```bash
docker-compose exec mongodb mongodump \
  -u admin -p admin123 --authenticationDatabase admin \
  -o /backup
```

### Remove volumes (WARNING: Data loss)
```bash
docker-compose down -v
```

## Network Configuration

### Inspect network
```bash
docker network inspect shortlinks-app_tinyurl-network
```

### View network details
```bash
docker-compose exec backend ping mongodb
docker-compose exec backend ping redis
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs [service-name]

# Check if port is in use
lsof -i :3000
lsof -i :5000
lsof -i :27017
```

### MongoDB connection issues
```bash
# Test MongoDB connection
docker-compose exec mongodb mongosh -u admin -p admin123

# Check MongoDB logs
docker-compose logs mongodb
```

### Redis connection issues
```bash
# Test Redis connection
docker-compose exec redis redis-cli -a redis123 ping

# Check Redis logs
docker-compose logs redis
```

### Hot reload not working
```bash
# Ensure polling is enabled in docker-compose.yml
# Frontend: CHOKIDAR_USEPOLLING=true
# Backend: Use nodemon with --legacy-watch
```

### Clear everything and start fresh
```bash
# Stop all containers
docker-compose down

# Remove all volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild and start
docker-compose build --no-cache
docker-compose up
```

## Production Deployment

### Prerequisites
1. SSL certificates in `docker/nginx/ssl/`
2. Production environment variables configured
3. Strong passwords for databases

### Deploy steps
```bash
# 1. Build production images
docker-compose -f docker-compose.prod.yml build

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Check health
docker-compose -f docker-compose.prod.yml ps

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### SSL Certificate Setup (Let's Encrypt)
```bash
# Initial certificate generation
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d your-domain.com -d www.your-domain.com \
  --email your-email@example.com --agree-tos --no-eff-email

# Renewal is automatic via the certbot container
```

## Performance Optimization

### Resource Limits (Add to docker-compose.yml)
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### MongoDB Optimization
- Enable indexes in production
- Configure replica set for high availability
- Regular backups

### Redis Optimization
- Configure maxmemory-policy
- Enable persistence (AOF or RDB)
- Monitor memory usage

## Monitoring

### View resource usage
```bash
docker stats
```

### Health checks
All services have health checks configured. Check status:
```bash
docker-compose ps
```

### Logs rotation
Production uses JSON file logging with rotation:
- Max size: 10MB
- Max files: 3

## Security Best Practices

1. **Change default passwords** in production
2. **Use secrets** for sensitive data (Docker Swarm/Kubernetes)
3. **Regular updates** of base images
4. **Run as non-root** user (already configured)
5. **Enable SSL/TLS** in production
6. **Configure firewall** rules
7. **Regular backups** of volumes

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Nginx Documentation](https://nginx.org/en/docs/)
