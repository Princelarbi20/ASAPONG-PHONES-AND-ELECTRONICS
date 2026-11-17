
FROM node:22-alpine

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY backend/ ./
COPY shared/ /app/shared/

EXPOSE 5000

CMD ["npm", "start"]
