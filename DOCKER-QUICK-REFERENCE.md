# Docker Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Initial setup
make setup          # Create .env files
make build          # Build Docker images
make up             # Start all services
make logs           # View logs

# Or without Makefile:
docker-compose build
docker-compose up -d
docker-compose logs -f
```

## 📦 Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Nginx | http://localhost:80 |
| MongoDB | mongodb://admin:admin123@localhost:27017 |
| Redis | redis://localhost:6379 |

## 🔧 Common Commands

### Development
```bash
make up             # Start services
make down           # Stop services
make restart        # Restart services
make logs           # View all logs
make logs-backend   # Backend logs only
make ps             # List containers
make health         # Check health
```

### Shell Access
```bash
make shell-backend    # Backend shell
make shell-frontend   # Frontend shell
make shell-mongodb    # MongoDB shell
make shell-redis      # Redis CLI
```

### Database
```bash
make backup-db      # Backup MongoDB
make restore-db     # Restore MongoDB
```

### Production
```bash
make prod-build     # Build production images
make prod-up        # Start production
make prod-down      # Stop production
make ssl-init       # Setup SSL certificates
```

### Cleanup
```bash
make down-v         # Stop and remove volumes
make clean          # Remove everything
make prune          # Clean unused resources
```

## 🔍 Debugging

```bash
# View logs
docker-compose logs backend
docker-compose logs -f --tail=100 frontend

# Check status
docker-compose ps

# Inspect container
docker inspect tinyurl-backend

# Test connectivity
docker-compose exec backend ping mongodb
docker-compose exec backend curl http://localhost:5000/health

# Resource usage
docker stats
```

## 📋 Environment Files

```
.env                    # Root environment
frontend/.env.local     # Frontend environment
backend/.env            # Backend environment
```

## ⚠️ Troubleshooting

### Port conflicts
```bash
lsof -i :3000
kill -9 <PID>
```

### MongoDB issues
```bash
docker-compose restart mongodb
docker-compose logs mongodb
```

### Reset everything
```bash
make clean
make build
make up
```

## 📚 Help

```bash
make help           # Show all commands
docker-compose --help
```

## 🔐 Security Checklist

- [ ] Change default passwords in .env
- [ ] Generate strong JWT secrets
- [ ] Configure SSL in production
- [ ] Never commit .env files
- [ ] Regular backups of MongoDB

## 📊 Monitoring

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Health checks
make health
curl http://localhost:5000/health
```

---

**For detailed documentation, see DOCKER-SETUP.md**
