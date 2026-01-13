# Multi-stage build for React + Express app

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend dependencies
FROM node:18-alpine AS backend
WORKDIR /app
COPY package*.json ./
COPY server.js ./
RUN npm install --production

# Stage 3: Production with nginx
FROM nginx:alpine

# Install Node.js for backend
RUN apk add --update nodejs npm

# Copy backend
COPY --from=backend /app /app

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy built React app to nginx
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script inline
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'cd /app && DATA_DIR=/app/data node server.js &' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80 3000

# Start both services
CMD ["/start.sh"]
