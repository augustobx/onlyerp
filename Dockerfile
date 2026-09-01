# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN --mount=type=secret,id=next_server_actions_encryption_key,required=true \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/next_server_actions_encryption_key)" npm run build

FROM node:20-alpine AS migrator

RUN apk add --no-cache openssl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 prisma
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps --chown=prisma:nodejs /app/node_modules ./node_modules
COPY --chown=prisma:nodejs package.json package-lock.json ./
COPY --chown=prisma:nodejs prisma ./prisma
USER prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl su-exec \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
EXPOSE 3000
CMD ["sh", "-c", "export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=\"$(cat /run/secrets/next_server_actions_encryption_key)\"; exec su-exec nextjs:nodejs node server.js"]
