
# 1. Use Node.js
FROM node:20-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy frontend source code
COPY . .

# 6. Expose Vite port
EXPOSE 5173

# 7. Start Vite and allow external access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
