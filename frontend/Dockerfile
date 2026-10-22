# =============================================================================
# Multi-stage Dockerfile for ReactJS / Vite Frontend with Nginx
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Static Assets
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Support passing custom API Base URL at build time if needed
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package manifests first for dependency caching
COPY package*.json ./
RUN npm ci || npm install

# Copy source code and build production bundle
COPY . ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve Static Bundle via Nginx Web Server
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Remove default nginx configurations and static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom reverse proxy and SPA routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check to ensure Nginx is actively responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
