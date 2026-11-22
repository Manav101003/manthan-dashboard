# Multi-stage production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Build frontend bundle
RUN npm run build

# Production runtime stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create unprivileged user
USER node

# Copy built application and modules from builder
COPY --chown=node:node --from=builder /app ./

# Create directory for uploads with permissions
USER root
RUN mkdir -p /app/public/uploads/tests /app/public/uploads/qr && \
    chown -R node:node /app/public/uploads
USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server/server.js"]
