# CLAUDE.md - AI Assistant Guide for TinyURL Clone Project

## 🎯 Session Start Protocol
**IMPORTANT:** Always read PLANNING.md at the start of every new conversation, check TASKS.md before starting your work, mark completed tasks to TASKS.md immediately, and add newly discovered tasks to TASKS.md when found.

## 📋 Project Overview
You are working on a production-ready TinyURL.com clone - a link shortening platform with multi-tier subscriptions, analytics, and enterprise features. This is a full-stack web application using Next.js, Express, MongoDB, and Docker.

## 🏗️ Project Structure
```
tinyurl-clone/
├── frontend/          # Next.js 16 application
├── backend/           # Express.js API server
├── docker-compose.yml # Container orchestration
├── nginx.conf        # Reverse proxy config
├── CLAUDE.md         # This file - AI assistant guide
├── PLANNING.md       # Project vision & architecture
├── TASKS.md          # Task tracking & milestones
└── PRD.md           # Product Requirements Document
```

## 💻 Development Workflow

### 1. Starting a Session
```bash
# First, always check project status
cat PLANNING.md
cat TASKS.md

# Check current branch
git branch

# Check for uncommitted changes
git status

# DO NOT WRITE CLAUDE CODED when you push to github
git commit -m "YOUR COMMIT MESSAGE, DO NOT WRITE ANYTHING CLAUDE HERE"
git push origin master
```

### 2. Before Writing Code
- Review relevant sections in PRD.md
- Check TASKS.md for current milestone
- Identify dependencies between tasks
- Plan the implementation approach

### 3. While Coding
- Follow the established patterns in existing code
- Write tests alongside features
- Update documentation as you go
- Commit frequently with descriptive messages

### 4. After Completing Tasks
- Mark tasks as complete in TASKS.md with ✅
- Add any newly discovered tasks
- Update progress notes
- Commit all changes , DO NOT WRITE CLAUDE CODED IN THE COMMIT MESSAGE
- DO NOT WRITE CLAUDE CODED IN THE COMMIT MESSAGE
- DO NOT WRITE CLAUDE CODED IN THE COMMIT MESSAGE
- DO NOT WRITE CLAUDE CODED IN THE COMMIT MESSAGE
- DO NOT WRITE CLAUDE CODED IN THE COMMIT MESSAGE
- DO NOT ADD CLAUDE AS CONTRIBUTORS


## 🛠️ Tech Stack Quick Reference

### Frontend (Next.js 16)
```typescript
// Use App Router patterns with Turbopack (stable, default bundler)
// Next.js 16 Key Features:
// - Turbopack as stable default bundler (50%+ faster development)
// - Cache Components with Partial Pre-Rendering (PPR)
// - React 19 Server Components support
// - Next.js DevTools MCP for AI-assisted debugging
// - proxy.ts replaces middleware for network boundary clarity

app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/
│   ├── layout.tsx
│   └── page.tsx
└── api/
    └── route.ts
```

### Backend (Express + TypeScript)
```typescript
// Controller pattern
export const shortenUrl = async (req: Request, res: Response) => {
  try {
    // Implementation
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Database (MongoDB + Mongoose)
```typescript
// Schema definition pattern
const LinkSchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true, index: true },
  originalUrl: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clicks: { type: Number, default: 0 }
}, { timestamps: true });
```

## 📝 Coding Conventions

### TypeScript
- Use strict mode
- Define interfaces for all data structures
- Avoid `any` type
- Use async/await over promises

### API Responses
```typescript
// Success
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Git Commits
```bash
# Use conventional commits
feat: add link shortening endpoint
fix: resolve redirect loop issue
docs: update API documentation
test: add analytics controller tests
refactor: simplify auth middleware
```

### Environment Variables
- Never commit .env files
- Always update .env.example
- Use strong typing for env vars
- Validate all env vars on startup

## 🔐 Security Checklist
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] JWT tokens properly configured
- [ ] Passwords hashed with bcrypt
- [ ] CORS properly configured
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] HTTPS only in production

## 🧪 Testing Requirements

### Unit Tests
- Minimum 80% coverage
- Test all utilities and helpers
- Mock external dependencies
- Use descriptive test names

### Integration Tests
- Test complete API flows
- Include auth in test scenarios
- Test error cases
- Validate response formats

### E2E Tests (Cypress)
- Critical user journeys
- Cross-browser testing
- Mobile responsive testing
- Performance benchmarks

## 📊 Database Models Reference

### Core Models
1. **User** - Authentication & profile
2. **Link** - Shortened URLs
3. **Analytics** - Click tracking
4. **Domain** - Custom domains
5. **Plan** - Subscription tiers
6. **Payment** - Transaction records

### Relationships
- User → many Links
- Link → many Analytics
- User → one Plan
- User → many Domains
- User → many Payments

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Backup strategy defined

### Docker Commands
```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service]

# Stop services
docker-compose down

# Clean volumes
docker-compose down -v
```

## 🔄 API Endpoints Priority

### Phase 1 - Core (Must Have)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/links/shorten
- GET /:slug (redirect)

### Phase 2 - Management
- GET /api/links
- PUT /api/links/:id
- DELETE /api/links/:id
- GET /api/analytics/:linkId

### Phase 3 - Advanced
- POST /api/domains
- POST /api/payments/upgrade
- GET /api/admin/*

## 🎨 UI Component Patterns

### Form Handling
```tsx
// Use react-hook-form + zod
const schema = z.object({
  url: z.string().url(),
  customSlug: z.string().optional()
});

const form = useForm({
  resolver: zodResolver(schema)
});
```

### State Management
```tsx
// Use Zustand for global state
const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null })
}));
```

### API Calls
```tsx
// Use SWR or TanStack Query
const { data, error, isLoading } = useSWR(
  '/api/links',
  fetcher
);
```

## 🐛 Common Issues & Solutions

### Issue: MongoDB Connection Timeout
```bash
# Check MongoDB is running
docker-compose ps
# Restart MongoDB
docker-compose restart mongo
```

### Issue: Port Already in Use
```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 [PID]
```

### Issue: Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Resources & Documentation

### External Docs
- [Next.js 16 Docs](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/guide)
- [MongoDB Manual](https://docs.mongodb.com/manual)
- [TailwindCSS](https://tailwindcss.com/docs)
- [2Checkout API](https://knowledgecenter.2checkout.com/API)

### Internal Docs
- PRD.md - Complete product requirements
- PLANNING.md - Architecture & vision
- TASKS.md - Current progress & todos
- README.md - Setup instructions

## 🔔 Important Notes

1. **Performance First**: Always consider performance implications
2. **Security Always**: Never compromise on security
3. **User Experience**: Keep UI responsive and intuitive
4. **Code Quality**: Maintain clean, readable code
5. **Documentation**: Update docs with code changes

## 🎯 Success Metrics to Track
- Page load time < 2s
- API response < 200ms
- Redirect latency < 100ms
- 99.9% uptime
- Zero security breaches

---

## 📅 Session History

### Session 1 - November 7, 2025 - MILESTONE 1 Complete
**Status:** ✅ Complete | **Duration:** Full session | **Tasks:** 53/53

**Setup & Configuration:**
- Initialized Git repository with comprehensive .gitignore
- Created project folder structure (frontend/, backend/, docker/, scripts/, .github/workflows/)
- Configured development and production environments

**Frontend (Next.js 16):**
- Initialized Next.js 16 with TypeScript, App Router, Turbopack (stable bundler)
- Installed dependencies: @tanstack/react-query, zustand, react-hook-form, zod, framer-motion, next-auth, axios
- Configured TailwindCSS 4, ESLint, Prettier
- Created folder structure: app/(auth)/, app/dashboard/, components/ui/, lib/, hooks/, stores/, types/
- Built landing page with URL shortener input
- Configured axios instance with interceptors
- Setup Zustand auth store with persistence
- Created TypeScript interfaces for User, Link, Analytics

**Backend (Express.js):**
- Initialized Node.js 20 with TypeScript, Express 4.x
- Installed dependencies: mongoose, redis, jsonwebtoken, bcryptjs, cors, helmet, express-rate-limit, joi, nodemailer, winston, compression
- Created folder structure: controllers/, models/, routes/, middleware/, services/, utils/, config/, jobs/
- Configured app.ts with security middleware (Helmet, CORS, compression, rate limiting)
- Setup MongoDB connection with error handling
- Setup Redis client with singleton pattern
- Implemented environment variable validation
- Created error handling system with custom error classes
- Setup Winston logger with file/console transports
- Configured rate limiters (general, auth, link creation)
- Built health check endpoints (/api/health, /api/ready, /api/live)

**Docker Configuration:**
- Created docker-compose.yml (development) with services: mongodb, redis, backend, frontend, nginx
- Created docker-compose.prod.yml (production) with health checks, log rotation, certbot
- Built multi-stage Dockerfiles for frontend (Next.js 16/Turbopack) and backend (Express/TypeScript)
- Configured nginx.conf with reverse proxy, rate limiting, gzip, WebSocket support, SSL/TLS ready
- Created Makefile with 40+ commands for Docker operations
- Setup persistent volumes for mongodb_data, redis_data, logs, uploads, SSL certificates

**Database Models (Mongoose 8.x):**
- user.model.ts: Authentication schema with bcrypt hashing, JWT token methods, plan/quota tracking, email verification, password reset tokens (234 lines)
- link.model.ts: URL shortening schema with slug validation, expiration (TTL), max clicks, password protection, QR code, UTM tracking, click increment methods (276 lines)
- analytics.model.ts: Click tracking with IP hashing (SHA-256), geolocation, device/OS/browser detection, referrer tracking, 2-year TTL index, date-range query methods (287 lines)
- domain.model.ts: Custom domain management with DNS verification (A/CNAME/TXT records), SSL tracking, verification tokens (238 lines)
- plan.model.ts: Subscription tiers (free/pro/business/enterprise) with feature flags, limits, billing cycles, capability check methods (274 lines)
- payment.model.ts: Transaction tracking with multi-gateway support (2Checkout/Stripe/PayPal), refund processing, invoice generation, revenue calculation (382 lines)
- Implemented 25+ strategic indexes (unique, compound, TTL)
- Total: 1,700+ lines of production-ready model code

**Authentication System:**
- auth.service.ts: Register, login, logout, email verification, password reset, refresh token mechanism (393 lines)
- email.service.ts: Nodemailer integration with HTML templates for verification, password reset, welcome emails (285 lines)
- auth.controller.ts: 10 controllers (register, login, logout, verify email, forgot/reset password, refresh token, get current user, change password) (387 lines)
- auth.middleware.ts: JWT verification, role-based access control (RBAC), email verification check, ownership validation (206 lines)
- auth.validation.ts: Joi schemas for all auth endpoints with strong password requirements (152 lines)
- auth.routes.ts: All auth routes with rate limiting (5 req/15min) and validation (149 lines)
- Configured JWT: access tokens (15min), refresh tokens (7 days, httpOnly cookies)
- Implemented bcrypt password hashing (10 rounds)

**Environment Configuration:**
- Created .env.example (100+ variables): JWT secrets, MongoDB, Redis, OAuth (Google/GitHub), email (SMTP), 2Checkout, feature flags
- Created frontend/.env.local.example: Next.js config, NextAuth, analytics (Google Analytics), ads (AdSense)
- Created backend/.env.example: Database, Redis, JWT, OAuth, email, payments, logging, monitoring

**Documentation:**
- DOCKER-SETUP.md: Complete Docker setup and deployment guide (12 KB)
- DOCKER-QUICK-REFERENCE.md: Quick reference card for common commands (2.7 KB)
- DOCKER-FILES-SUMMARY.md: Architecture overview (9 KB)
- GETTING-STARTED.md: Step-by-step getting started guide (5.5 KB)
- AUTH_SETUP.md: Complete authentication API reference (550+ lines)
- README.md files for frontend, backend, docker directories
- Model documentation with usage examples

**Testing Setup:**
- Jest configured with ts-jest for backend
- React Testing Library for frontend
- Sample health check tests
- Coverage thresholds: 70%

**Code Quality:**
- ESLint v9 configured for both projects
- Prettier configured with consistent formatting
- TypeScript strict mode enabled
- All code passes linting and type checking

**Key Metrics:**
- Total files created: 150+
- Total lines of code: 10,000+
- Frontend dependencies: 13 production, 8 dev
- Backend dependencies: 16 production, 15 dev
- Database indexes: 25+
- API endpoints: 13 (10 auth + 3 health)
- Docker services: 6 (mongodb, redis, backend, frontend, nginx, certbot)

**Next Milestone:** MILESTONE 2 - Core Link Management (link shortening, redirect system, CRUD operations)

---

**Remember:** This is a production-ready application. Every decision should consider scalability, security, and user experience. When in doubt, refer to the PRD.md for requirements and PLANNING.md for architectural decisions.