# PLANNING.md - TinyURL Clone Project Planning Document

## 🎯 Project Vision

### Mission Statement
Build a production-ready, scalable URL shortening service that rivals TinyURL.com, offering tiered subscription plans, comprehensive analytics, custom branding, and enterprise-grade reliability.

### Core Values
- **Reliability**: 99.9% uptime guarantee for paid tiers
- **Performance**: Sub-100ms redirect latency
- **Scalability**: Support millions of URLs and billions of redirects
- **Security**: Enterprise-grade security and data protection
- **User Experience**: Intuitive interface requiring zero training

### Target Audience
1. **Free Users**: Individuals needing occasional link shortening
2. **Pro Users**: Content creators, marketers, small businesses
3. **Business Users**: Medium-sized companies, agencies
4. **Enterprise Users**: Large corporations, high-volume needs

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                        │
│                        (Nginx)                           │
└────────────────┬────────────────────┬───────────────────┘
                 │                    │
         ┌───────▼────────┐   ┌──────▼────────┐
         │   Next.js App   │   │  Express API  │
         │   (Frontend)    │   │   (Backend)   │
         │   Port 3000     │   │   Port 5000   │
         └───────┬─────────┘   └──────┬────────┘
                 │                    │
                 └────────┬───────────┘
                         │
                 ┌───────▼────────┐
                 │     Redis       │
                 │   (Cache &      │
                 │  Rate Limit)    │
                 └───────┬─────────┘
                         │
                 ┌───────▼────────┐
                 │    MongoDB      │
                 │   (Primary DB)  │
                 └─────────────────┘
```

### Microservices Breakdown
1. **Frontend Service** - Next.js application serving UI
2. **API Service** - Express.js handling business logic
3. **Redirect Service** - High-performance redirect handler
4. **Analytics Service** - Async analytics processing
5. **Notification Service** - Email and webhook handling

### Data Flow
```
User → Nginx → Frontend/API → Redis Cache → MongoDB
                    ↓
              Analytics Queue → Analytics Processor
                    ↓
              Notification Queue → Email Service
```

## 💻 Technology Stack

### Frontend Stack
```yaml
Framework: Next.js 16 (App Router with Turbopack)
Language: TypeScript 5.x
Styling: 
  - TailwindCSS 3.x
  - shadcn/ui components
  - Framer Motion (animations)
State Management: Zustand
Data Fetching: TanStack Query (React Query)
Forms: React Hook Form + Zod
Charts: Recharts
Maps: Leaflet
Authentication: NextAuth.js
Testing: Jest + React Testing Library
Build Tool: Turbopack (stable - default bundler)
```

### Backend Stack
```yaml
Runtime: Node.js 20 LTS
Framework: Express.js 4.x
Language: TypeScript 5.x
Database: MongoDB 7.x
ODM: Mongoose 8.x
Cache: Redis 7.x
Authentication: JWT (jsonwebtoken)
Validation: Joi / Zod
Password Hashing: Bcrypt
Rate Limiting: express-rate-limit + Redis
File Upload: Multer
Email: Nodemailer
Scheduled Jobs: node-cron
Testing: Jest + Supertest
API Docs: Swagger/OpenAPI
Logging: Winston
Monitoring: Morgan
```

### DevOps Stack
```yaml
Containerization: Docker
Orchestration: Docker Compose
Reverse Proxy: Nginx
CI/CD: GitHub Actions
VPS: IONOS (Ubuntu 22.04 LTS)
SSL: Let's Encrypt (Certbot)
Monitoring: Prometheus + Grafana
Logging: ELK Stack (optional)
Backup: MongoDB Atlas / Custom scripts
```

### Third-Party Services
```yaml
Payment: 2Checkout
OAuth Providers:
  - Google OAuth 2.0
  - GitHub OAuth
Email Service: 
  - SendGrid (production)
  - Gmail SMTP (development)
CDN: Cloudflare
Analytics: Google Analytics
Ads: Google AdSense
Error Tracking: Sentry (optional)
```

## 🛠️ Required Tools & Setup

### Development Environment
```bash
# Required Software
Node.js: v20.x LTS
npm: v10.x or yarn: v1.22.x
MongoDB: v7.x
Redis: v7.x
Docker: v24.x
Docker Compose: v2.x
Git: v2.x

# Code Editor
VS Code with extensions:
- ESLint
- Prettier
- TypeScript
- TailwindCSS IntelliSense
- MongoDB for VS Code
- Docker
- Thunder Client / Postman
```

### Global npm Packages
```bash
npm install -g typescript ts-node nodemon pm2 concurrently
```

### Project Dependencies

#### Frontend Package.json
```json
{
  "dependencies": {
    "next": "^16.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.4.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.3.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.0.0",
    "recharts": "^2.12.0",
    "leaflet": "^1.9.0",
    "react-leaflet": "^4.2.0",
    "next-auth": "^4.24.0",
    "axios": "^1.6.0",
    "date-fns": "^3.0.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.400.0",
    "@radix-ui/react-*": "latest"
  }
}
```

#### Backend Package.json
```json
{
  "dependencies": {
    "express": "^4.19.0",
    "typescript": "^5.4.0",
    "mongoose": "^8.3.0",
    "redis": "^4.6.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.0",
    "cors": "^2.8.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.2.0",
    "joi": "^17.13.0",
    "dotenv": "^16.4.0",
    "nodemailer": "^6.9.0",
    "node-cron": "^3.0.0",
    "multer": "^1.4.0",
    "morgan": "^1.10.0",
    "winston": "^3.13.0",
    "swagger-ui-express": "^5.0.0",
    "compression": "^1.7.0"
  }
}
```

## 📁 Project Structure

### Complete Directory Layout
```
tinyurl-clone/
├── frontend/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── (public)/           # Public pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── pricing/
│   │   ├── dashboard/          # Protected pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── links/
│   │   │   ├── analytics/
│   │   │   ├── domains/
│   │   │   └── settings/
│   │   ├── admin/              # Admin panel
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── forms/              # Form components
│   │   ├── charts/             # Chart components
│   │   └── layout/             # Layout components
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # API client
│   │   ├── utils.ts            # Helper functions
│   │   └── constants.ts        # Constants
│   ├── hooks/                  # Custom hooks
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript types
│   ├── styles/                 # Global styles
│   └── public/                 # Static assets
│
├── backend/
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── link.controller.ts
│   │   │   ├── analytics.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── models/             # Mongoose models
│   │   │   ├── user.model.ts
│   │   │   ├── link.model.ts
│   │   │   └── analytics.model.ts
│   │   ├── routes/             # Express routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── link.routes.ts
│   │   │   └── index.ts
│   │   ├── middleware/         # Custom middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── validation.ts
│   │   ├── services/           # Business logic
│   │   │   ├── link.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── email.service.ts
│   │   ├── utils/              # Utilities
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── logger.ts
│   │   ├── config/             # Configuration
│   │   │   ├── database.config.ts
│   │   │   └── app.config.ts
│   │   ├── jobs/               # Cron jobs
│   │   └── app.ts              # Main application
│   ├── tests/                  # Test files
│   └── docs/                   # API documentation
│
├── docker/
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   └── nginx/
│       └── nginx.conf
│
├── scripts/                    # Utility scripts
│   ├── setup.sh               # Initial setup
│   ├── deploy.sh              # Deployment script
│   └── backup.sh              # Backup script
│
├── .github/
│   └── workflows/             # GitHub Actions
│       ├── ci.yml
│       └── deploy.yml
│
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── .env.example               # Environment template
├── .gitignore
├── README.md                  # Setup instructions
├── CLAUDE.md                  # AI assistant guide
├── PLANNING.md                # This file
├── TASKS.md                   # Task tracking
└── PRD.md                     # Product requirements
```

## 🔒 Security Architecture

### Authentication Flow
```
1. User Registration
   → Validate input
   → Hash password (bcrypt, 10 rounds)
   → Create user record
   → Generate JWT token
   → Send verification email

2. User Login
   → Validate credentials
   → Check email verification
   → Generate JWT + Refresh token
   → Store refresh token in httpOnly cookie
   → Return access token

3. Protected Routes
   → Verify JWT token
   → Check token expiration
   → Validate user permissions
   → Process request
```

### Security Measures
- **Input Validation**: Joi/Zod schemas on all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization, CSP headers
- **CSRF Protection**: Token validation
- **Rate Limiting**: IP-based and user-based limits
- **Password Policy**: Minimum 8 chars, complexity requirements
- **Audit Logging**: Track all sensitive operations

## 📊 Database Design

### Collection Schemas

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  name: String,
  avatar: String,
  role: ['user', 'admin'],
  plan: {
    type: ['free', 'pro', 'business', 'enterprise'],
    startDate: Date,
    endDate: Date,
    autoRenew: Boolean
  },
  quota: {
    linksCreated: Number,
    linksLimit: Number,
    clicksTracked: Number,
    clicksLimit: Number,
    domainsUsed: Number,
    domainsLimit: Number
  },
  emailVerified: Boolean,
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  twoFactorSecret: String,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Links Collection
```javascript
{
  _id: ObjectId,
  slug: String (unique, indexed),
  originalUrl: String (indexed),
  shortUrl: String,
  userId: ObjectId (ref: Users, indexed),
  domain: String (default: 'short.link'),
  title: String,
  description: String,
  tags: [String],
  metadata: {
    ogTitle: String,
    ogDescription: String,
    ogImage: String
  },
  qrCode: String (base64),
  password: String (hashed, optional),
  expiresAt: Date (TTL index),
  maxClicks: Number,
  clicks: Number (default: 0),
  lastClickedAt: Date,
  isActive: Boolean (default: true),
  utm: {
    source: String,
    medium: String,
    campaign: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Analytics Collection
```javascript
{
  _id: ObjectId,
  linkId: ObjectId (ref: Links, indexed),
  userId: ObjectId (ref: Users, indexed),
  timestamp: Date (indexed),
  ip: String (hashed),
  location: {
    country: String,
    countryCode: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  device: {
    type: ['mobile', 'tablet', 'desktop'],
    brand: String,
    model: String
  },
  os: {
    name: String,
    version: String
  },
  browser: {
    name: String,
    version: String
  },
  referrer: {
    url: String,
    domain: String,
    type: ['direct', 'search', 'social', 'email', 'other']
  },
  utm: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String
  },
  createdAt: Date
}
```

### Database Indexes
```javascript
// Performance indexes
Links.createIndex({ slug: 1 }, { unique: true })
Links.createIndex({ userId: 1, createdAt: -1 })
Links.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

Analytics.createIndex({ linkId: 1, timestamp: -1 })
Analytics.createIndex({ userId: 1, timestamp: -1 })
Analytics.createIndex({ timestamp: 1 }, { expireAfterSeconds: 63072000 }) // 2 years

Users.createIndex({ email: 1 }, { unique: true })
Users.createIndex({ plan.type: 1 })
```

## 🚀 Deployment Strategy

### Environment Setup
```bash
# Development
NODE_ENV=development
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Staging
NODE_ENV=staging
API_URL=https://staging-api.shortlink.com
FRONTEND_URL=https://staging.shortlink.com

# Production
NODE_ENV=production
API_URL=https://api.shortlink.com
FRONTEND_URL=https://shortlink.com
```

### Docker Deployment
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend.Dockerfile
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

  mongodb:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  mongo-data:
  redis-data:
```

### IONOS VPS Deployment Steps
```bash
# 1. Server Setup
ssh root@your-server-ip
apt update && apt upgrade -y
apt install docker docker-compose nginx certbot python3-certbot-nginx

# 2. Clone Repository
git clone https://github.com/yourusername/tinyurl-clone.git
cd tinyurl-clone

# 3. Configure Environment
cp .env.example .env
nano .env # Edit with production values

# 4. SSL Certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 5. Build and Deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 6. Setup Monitoring
docker-compose logs -f
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          npm install
          npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to IONOS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/tinyurl-clone
            git pull origin main
            docker-compose -f docker-compose.prod.yml build
            docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Scaling Strategy

### Horizontal Scaling
1. **Load Balancing**: Multiple frontend/backend instances
2. **Database Replication**: MongoDB replica sets
3. **Redis Cluster**: Distributed caching
4. **CDN Integration**: Static asset delivery
5. **Microservices**: Separate redirect service

### Performance Optimization
1. **Caching Strategy**:
   - Redis for hot links (TTL: 1 hour)
   - CDN for static assets
   - Browser caching headers

2. **Database Optimization**:
   - Compound indexes
   - Query optimization
   - Connection pooling
   - Read replicas for analytics

3. **Code Optimization**:
   - Code splitting (Next.js)
   - Lazy loading
   - Image optimization
   - Minification

## 🎯 Milestones & Timeline

### Phase 1: Foundation (Weeks 1-2)
- Project setup and configuration
- Authentication system
- Basic link shortening
- Database models

### Phase 2: Core Features (Weeks 3-4)
- Link management CRUD
- Redirect functionality
- Basic analytics
- Dashboard UI

### Phase 3: Advanced Features (Weeks 5-6)
- Custom domains
- Payment integration
- Advanced analytics
- Admin panel

### Phase 4: Production (Weeks 7-8)
- Testing & QA
- Performance optimization
- Security audit
- Deployment

## 📝 Development Guidelines

### Code Quality Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- 80% minimum test coverage
- Code reviews required
- Documentation for complex logic

### Git Workflow
```bash
main → production branch
develop → integration branch
feature/* → feature branches
hotfix/* → urgent fixes
```

### Commit Convention
```
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: test additions
chore: maintenance
```

## 🚦 Success Metrics

### Technical KPIs
- Response time < 200ms (P95)
- Redirect latency < 100ms (P99)
- Uptime > 99.9%
- Error rate < 0.1%
- Test coverage > 80%

### Business KPIs
- User registration conversion > 10%
- Free to paid conversion > 5%
- Monthly active users growth > 20%
- Churn rate < 5%
- Customer satisfaction > 4.5/5

## 🔮 Future Enhancements

### Version 2.0 Features
- QR code generation
- Bulk import/export
- API SDKs (Python, Node.js)
- Webhook notifications
- A/B testing for links
- Browser extensions
- Mobile apps

### Technical Improvements
- GraphQL API
- WebSocket real-time analytics
- Kubernetes orchestration
- Multi-region deployment
- Machine learning for fraud detection

---

**Last Updated:** November 2025
**Next Review:** December 2025

This planning document serves as the technical blueprint for the TinyURL Clone project. All architectural decisions and technical choices should align with this plan.