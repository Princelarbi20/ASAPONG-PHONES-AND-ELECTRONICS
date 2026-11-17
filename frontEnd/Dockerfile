
FROM node:22-alpine AS build

WORKDIR /app/frontEnd

COPY frontEnd/package*.json ./

RUN npm ci

COPY frontEnd/ ./
COPY shared/ /app/shared/

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY --from=build /app/frontEnd/dist /usr/share/nginx/html

ENV PORT=10000
ENV API_PROXY_TARGET=http://backend:5000

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
