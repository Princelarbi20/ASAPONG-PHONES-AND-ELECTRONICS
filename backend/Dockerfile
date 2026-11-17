FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 10000

CMD ["npm", "start"]