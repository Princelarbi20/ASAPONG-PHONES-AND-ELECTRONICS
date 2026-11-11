
# Production Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Expose backend port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
