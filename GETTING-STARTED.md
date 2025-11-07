# Getting Started with Docker - TinyURL Clone

## Quick Start in 5 Steps

### Step 1: Prerequisites Check
```bash
# Verify Docker is installed and running
docker --version          # Should show v20.10+
docker-compose --version  # Should show v2.0+
docker ps                 # Should connect successfully
```

### Step 2: Environment Setup
```bash
# Option A: Use Makefile (Recommended)
make setup

# Option B: Manual setup
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
```

### Step 3: Configure Secrets (IMPORTANT!)
Edit `.env` file and change these values:

```bash
# Generate JWT secrets
openssl rand -base64 64

# Required changes in .env:
JWT_SECRET=<paste-generated-secret-here>
JWT_REFRESH_SECRET=<paste-another-generated-secret-here>
MONGO_PASSWORD=<choose-strong-password>
REDIS_PASSWORD=<choose-strong-password>

# Optional (for email & OAuth features):
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
```

### Step 4: Validate Setup (Optional but Recommended)
```bash
./scripts/validate-docker-setup.sh
```

### Step 5: Build and Run
```bash
make build    # Build all Docker images (first time: 5-10 min)
make up       # Start all services
make logs     # View logs (Ctrl+C to exit)
```

### Step 6: Access Your Application
Open your browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Docs**: http://localhost:5000/api-docs (if Swagger enabled)

---

## Next Steps

### Development Workflow
```bash
# Start services
make up

# View logs (follow mode)
make logs

# Stop services
make down

# Restart after changes
make restart

# Run tests
make test-backend
make test-frontend
```

### Useful Commands
```bash
# Access service shells
make shell-backend    # Backend container shell
make shell-frontend   # Frontend container shell
make shell-mongodb    # MongoDB shell
make shell-redis      # Redis CLI

# Check service status
make ps               # List running containers
make health           # Check service health

# Database operations
make backup-db        # Backup MongoDB
make restore-db       # Restore MongoDB
```

### Troubleshooting
```bash
# Port conflicts?
lsof -i :3000 && lsof -i :5000    # Find what's using ports
make down && make up               # Restart everything

# Database connection issues?
make logs-mongodb                  # Check MongoDB logs
make shell-mongodb                 # Test connection

# Start fresh?
make clean            # Remove everything
make build            # Rebuild
make up               # Start again
```

---

## Development Tips

### Hot Reload is Enabled
- **Frontend**: Edit files in `frontend/` - changes reflect immediately
- **Backend**: Edit files in `backend/src/` - server restarts automatically

### Database Access
```bash
# MongoDB (using Compass or CLI)
Connection: mongodb://admin:admin123@localhost:27017/tinyurl?authSource=admin

# Redis (using Redis GUI or CLI)
Connection: redis://localhost:6379
Password: redis123
```

### Environment Variables
```bash
# View all environment variables in a container
docker-compose exec backend env

# Edit environment variables
vim .env              # Root environment
vim frontend/.env.local   # Frontend
vim backend/.env          # Backend

# After editing, restart:
make restart
```

---

## Common Tasks

### Adding New Dependencies
```bash
# Frontend
docker-compose exec frontend npm install <package-name>

# Backend
docker-compose exec backend npm install <package-name>

# Then rebuild image
make build frontend
# or
make build backend
```

### Running Database Migrations
```bash
docker-compose exec backend npm run migrate
```

### Viewing Logs
```bash
# All services
make logs

# Specific service
make logs-backend
make logs-frontend
make logs-mongodb

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Clearing Data
```bash
# Clear all volumes (DATABASE WILL BE DELETED!)
make down-v

# Clear Docker cache
make prune
```

---

## Production Deployment

### Quick Production Setup
```bash
# 1. Configure production environment
cp .env.example .env.production
vim .env.production   # Set production values

# 2. Setup SSL certificates (optional)
make ssl-init

# 3. Build production images
make prod-build

# 4. Start production services
make prod-up

# 5. Check status
make prod-logs
```

### Production Checklist
- [ ] Changed all default passwords
- [ ] Generated strong JWT secrets
- [ ] Configured SSL/TLS
- [ ] Updated nginx.conf with domain
- [ ] Configured email service
- [ ] Setup monitoring
- [ ] Enabled database backups
- [ ] Tested all endpoints

---

## Available Documentation

| File | Description |
|------|-------------|
| **DOCKER-SETUP.md** | Complete Docker setup guide |
| **DOCKER-QUICK-REFERENCE.md** | Quick command reference |
| **DOCKER-FILES-SUMMARY.md** | Overview of all Docker files |
| **GETTING-STARTED.md** | This file - getting started guide |
| **docker/README.md** | Docker directory documentation |

---

## Need Help?

### Documentation
```bash
make help                          # Show all Makefile commands
docker-compose --help              # Docker Compose help
```

### Validation
```bash
./scripts/validate-docker-setup.sh # Validate your setup
```

### Debugging
```bash
docker-compose logs <service>      # View service logs
docker-compose ps                  # Check service status
docker stats                       # Resource usage
```

### Common Issues
1. **"Port already in use"**: Stop other services or change ports
2. **"Cannot connect to Docker daemon"**: Start Docker Desktop
3. **"Out of disk space"**: Run `make prune` to clean up
4. **"Container keeps restarting"**: Check logs with `make logs`

---

## What's Next?

1. **Explore the API**: http://localhost:5000/api-docs
2. **Setup OAuth**: Configure Google/GitHub in `.env`
3. **Customize**: Edit `docker-compose.yml` for your needs
4. **Deploy**: Follow production deployment steps
5. **Monitor**: Setup logging and monitoring services

---

**Happy Coding!** 🚀

For detailed documentation, see **DOCKER-SETUP.md**
