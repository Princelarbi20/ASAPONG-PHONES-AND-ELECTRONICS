FROM node:22-alpine

WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY backend/ ./
COPY shared/ /app/shared/

EXPOSE 10000

CMD ["npm", "start"]
