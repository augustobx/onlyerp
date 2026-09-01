# ONLYERP SAAS — PRODUCTION DEPLOYMENT RUNBOOK
**NanoLabs Dedicated Debian Server (`/opt/apps/onlyerp`)**

Este documento detalla el procedimiento estándar y seguro para desplegar **OnlyERP** en el servidor dedicado Debian con Docker Compose y Nginx Proxy Manager, de acuerdo a las skills `nanolabs-saas-engineering` y `nanolabs-server-deploy`.

---

## 1. Topología del Sistema

- **Directorio de la app**: `/opt/apps/onlyerp`
- **Servicios**:
  - `onlyerp-db`: MySQL 8.0.43 (red interna `onlyerp_internal`, volumen `onlyerp_mysql_data`)
  - `onlyerp-web`: Next.js Standalone Runner (puerto `3000`, redes `onlyerp_internal` + `proxy`)
  - `onlyerp-migrator`: Prisma Migrate / Seed runner (perfil `tools`)
- **Red Proxy Externa**: `proxy` (compartida con Nginx Proxy Manager)
- **Dominio principal**: `onlyerp.site` (y `*.onlyerp.site` para subdominios de tenants)

---

## 2. Preparación en el Servidor Debian

### Paso 2.1 — Conectarse y Crear Directorios
```bash
ssh root@tu-servidor-debian

# Crear estructura estándar NanoLabs
mkdir -p /opt/apps/onlyerp/.secrets
cd /opt/apps/onlyerp
```

### Paso 2.2 — Subir / Clonar el Código
Copiar el contenido del proyecto (código limpio excluyendo `node_modules`, `.next`, `.git`) hacia `/opt/apps/onlyerp/`:
```bash
# Ejemplo con rsync desde local:
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' ./ root@tu-servidor-debian:/opt/apps/onlyerp/
```

### Paso 2.3 — Generar Secretos y Claves Criptográficas
```bash
cd /opt/apps/onlyerp

# 1. Generar clave para Next.js Server Actions Encryption Key
openssl rand -base64 32 > .secrets/next-server-actions.key
chmod 600 .secrets/next-server-actions.key

# 2. Generar contraseñas seguras para .env
DB_PASS=$(openssl rand -hex 16)
ROOT_PASS=$(openssl rand -hex 20)
SESS_SECRET=$(openssl rand -hex 32)
SUPER_SECRET=$(openssl rand -hex 32)

# 3. Crear archivo .env de producción
cat <<EOF > .env
MYSQL_DATABASE=onlyerp_db
MYSQL_USER=onlyerp_app
MYSQL_PASSWORD=${DB_PASS}
MYSQL_ROOT_PASSWORD=${ROOT_PASS}
DATABASE_URL=mysql://onlyerp_app:${DB_PASS}@db:3306/onlyerp_db

SESSION_SECRET=${SESS_SECRET}
SUPERADMIN_SESSION_SECRET=${SUPER_SECRET}
NEXT_PUBLIC_APP_URL=https://onlyerp.site
MOCK_AFIP=false
TZ=America/Argentina/Buenos_Aires
EOF

chmod 600 .env
```

---

## 3. Despliegue y Puesta en Marcha

### Paso 3.1 — Asegurar la Red Docker `proxy`
```bash
docker network create proxy 2>/dev/null || true
```

### Paso 3.2 — Construir y Levantar Base de Datos
```bash
docker compose pull db
docker compose up -d db

# Esperar a que la base de datos esté healthy
docker compose ps
```

### Paso 3.3 — Ejecutar Migraciones y Cargar Seed SaaS (Planes + SuperAdmin)
```bash
# Construir la imagen web / runner
docker compose build --no-cache web

# Ejecutar migraciones prisma
docker compose run --rm migrate npx prisma migrate deploy

# Ejecutar el seed maestro (Crea Planes Starter/Pro/Enterprise, SuperAdmin por defecto y Tenant Demo)
docker compose run --rm migrate npx tsx prisma/seed.ts
```

### Paso 3.4 — Levantar Servicio Web
```bash
docker compose up -d web

# Validar healthcheck
docker compose ps
docker compose logs -f web --tail=50
```

---

## 4. Configuración en Nginx Proxy Manager (NPM)

1. Ingresar a NPM: `http://<IP-DEL-SERVIDOR>:81`
2. Ir a **Proxy Hosts** -> **Add Proxy Host**:
   - **Domain Names**: `onlyerp.site`, `*.onlyerp.site` *(o los dominios y subdominios asignados)*
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `onlyerp-web`
   - **Forward Port**: `3000`
   - **Cache Assets**: Encendido
   - **Block Common Exploits**: Encendido
   - **Websockets Support**: Encendido
3. Pestaña **SSL**:
   - **SSL Certificate**: Request a new SSL Certificate (Let's Encrypt)
   - **Force SSL**: Encendido
   - **HTTP/2 Support**: Encendido
   - **HSTS Enabled**: Encendido
4. Guardar.

---

## 5. Accesos Iniciales

- **Panel SuperAdmin (Control Plane NanoLabs)**:
  - URL: `https://onlyerp.site/superadmin/login`
  - Usuario inicial por seed: `superadmin`
  - Password inicial por seed: `SuperAdmin2026!` *(cambiar inmediatamente tras el primer login)*
- **Tenant Demo**:
  - URL: `https://onlyerp.site/login`
  - Usuario: `admin`
  - Password: `adminpassword`

---

## 6. Procedimiento de Actualizaciones Futuras (Cero Downtime)

```bash
cd /opt/apps/onlyerp
git pull # o rsync de nuevos archivos
docker compose build web
docker compose run --rm migrate npx prisma migrate deploy
docker compose up -d --no-deps web
docker compose ps
```
