# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Add crypto global for NestJS schedule module
ENV NODE_OPTIONS="--experimental-global-webcrypto"

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies for all stages
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

FROM base AS build-dependencies  
RUN npm ci && npm cache clean --force

# Build stage
FROM build-dependencies AS build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package.json ./

# Copy necessary configuration files
COPY --chown=nestjs:nodejs drizzle.config.ts ./
COPY --from=build --chown=nestjs:nodejs /app/src/database/schemas ./src/database/schemas
COPY --from=build --chown=nestjs:nodejs /app/src/mail/templates ./src/mail/templates

# Copy and set up start script
COPY --chown=nestjs:nodejs <<EOF /app/start-render.sh
#!/bin/sh
set -e

echo "🚀 Starting Render deployment..."

# Check if DATABASE_URL is available
if [ -z "\$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ Database URL configured"

# Push database schema directly
echo "📊 Pushing database schema..."
if npm run db:push; then
    echo "✅ Database schema pushed successfully"
else
    echo "❌ Database schema push failed"
    exit 1
fi

# Start the application
echo "🎯 Starting NestJS application..."
exec npm run start:prod
EOF

RUN chmod +x /app/start-render.sh

# Install wget for health checks
RUN apk add --no-cache wget

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["/app/start-render.sh"]