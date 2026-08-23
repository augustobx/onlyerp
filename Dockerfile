# Etapa 1: Dependencias
FROM node:20-alpine AS deps
# libc6-compat y openssl son necesarios para algunos paquetes nativos y Prisma
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Etapa 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
# Copiamos las dependencias
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generamos el cliente de Prisma
RUN npx prisma generate
# Construimos la aplicación de Next.js
RUN npm run build

# Etapa 3: Runner (Producción)
FROM node:20-alpine AS runner
WORKDIR /app

# Definimos variables de entorno para producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instalamos openssl necesario para que Prisma funcione en producción
RUN apk add --no-cache openssl

# Creamos un usuario no root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos la salida standalone y los estáticos
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# REGLA ESTRICTA: Instalamos Prisma CLI de forma aislada para poder hacer migraciones sin arrastrar todo node_modules
RUN npm install prisma --no-save

# Aseguramos que la carpeta de prisma se copie para tener acceso a las migraciones/schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Ajustamos permisos para el usuario no root
RUN chown -R nextjs:nodejs /app

# Cambiamos al usuario no root
USER nextjs

# Exponemos únicamente el puerto interno requerido
EXPOSE 3000

# Script de inicio: Sincronizamos la BD (Prisma) y luego arrancamos la app (standalone server)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
