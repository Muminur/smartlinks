# Multi-stage build for Express.js Backend
FROM node:20-alpine AS base

# Install dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Development stage
FROM base AS dev
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose port 5000
EXPOSE 5000

# Set environment to development
ENV NODE_ENV=development

# Enable nodemon for hot reload
CMD ["npm", "run", "dev"]

# Builder stage for production
FROM base AS builder
WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript if applicable
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy built application or source files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built files if they exist, otherwise copy source
COPY --from=builder /app/dist ./dist 2>/dev/null || COPY --from=builder /app/src ./src

# Create logs directory
RUN mkdir -p /app/logs && chown -R expressjs:nodejs /app

# Switch to non-root user
USER expressjs

EXPOSE 5000

ENV PORT=5000

# Start the application
CMD ["npm", "start"]
