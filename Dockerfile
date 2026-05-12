# ─── Backend Dockerfile (NestJS) ─────────────────────────────────────────────

# Stage 1: dependencies + build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Stage 2: production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Sağlık kontrolü: /api/v1 endpointine basit bir GET
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1 >/dev/null 2>&1 || exit 1

CMD ["node", "dist/main.js"]
