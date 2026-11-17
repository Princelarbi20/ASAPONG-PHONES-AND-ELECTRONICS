FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app