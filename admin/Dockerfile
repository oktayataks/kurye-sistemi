# ─── Frontend Dockerfile (Vite + React) ──────────────────────────────────────

# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# API URL'i build sırasında bake'le — docker-compose ARG ile geçer
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# Stage 2: nginx ile static serve
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
