# Multi-stage build for TypeScript app with React frontend

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/backend ./src/backend
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.frontend.json ./
COPY src/frontend ./src/frontend
RUN npm run build:frontend

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy built backend from builder stage
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist/frontend ./dist/frontend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]
