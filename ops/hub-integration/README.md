# Integración OnlyERP con NanoLabs Hub

El Hub administra el plano de plataforma mediante contratos autenticados, sin
acceso SQL de negocio. Se conservan el SuperAdmin nativo, MySQL 8.0.43, el tenant
histórico, identificadores, contraseñas, configuración AFIP y base legacy.

## Contratos

`GET /api/integrations/nanolabs/tenants` usa una credencial de lectura separada.
`GET|POST /api/integrations/nanolabs/management` usa Bearer más HMAC SHA-256.
Formato de firma: timestamp, método, path/query, actor y cuerpo, separados por
saltos de línea. Ventana de 60 segundos y cuerpo máximo de 32 KiB.

Activar en el web únicamente `HUB_INTEGRATION_ENABLED`, `HUB_INTEGRATION_TOKEN`,
`HUB_MANAGEMENT_ENABLED`, `HUB_MANAGEMENT_TOKEN`. Los tokens deben ser diferentes,
de al menos 32 bytes; no introducirlos en Git, migradores, bases o imágenes.

La administración requiere versión vigente y UUID idempotente. El recibo
`HubCommand` se confirma en la misma transacción SERIALIZABLE que el cambio. Se
almacena una huella HMAC del comando, actor, operación y resultado; no su cuerpo
ni contraseñas. El detalle y auditoría nunca exportan hashes o claves fiscales.

## Semántica nativa

- IDs enteros serializados como strings; slug histórico inmutable.
- Accesos por `Usuario.username`, no se inventa un correo de usuario.
- El período de membresía vive en `Tenant.fecha_alta/fecha_vencimiento`.
  Renovar modifica el vencimiento y no crea `SuscripcionSaaS`.
- `SuscripcionSaaS` registra cobros en ARS por mes/año. Registrar conserva acceso
  por defecto. Aplicar vencimiento exige mes actual, empresa activa/en prueba,
  fecha futura y no acortar el período. Reactivar se gestiona por separado.
- Módulos con overrides nativos; los arrays legacy siguen siendo aditivos.
  Heredar elimina exclusivamente la excepción solicitada. `WMS` se conserva
  como configuración histórica: no tiene una capacidad independiente ejecutable.
- Los 15 módulos publicados tienen guards de servidor en acciones/rutas. AFIP
  usa la configuración de la empresa autenticada. No emite comprobantes de QA.
- Límites de usuarios, sucursales y depósitos serializan nuevas altas por tenant.
- Cambiar acceso o revocar incrementa `Usuario.sessionVersion`. Tokens históricos
  sin versión equivalen a cero; no se cierran sesiones durante el despliegue.
- Los dominios existentes se muestran sin ofrecer cambios de DNS/TLS.

## Despliegue y rollback

Antes del cambio, dump completo de ambos esquemas, checksum, copia en PC y
restauración aislada con la imagen exacta de MySQL. Comprobar tablas, filas y
claves foráneas. Conservar imagen y composición efectivas de ambos servicios web.

Aplicar explícitamente `001-control-plane.sql` una sola vez, tras comprobar que
no existen la columna/tabla. Este cambio aditivo no ejecuta semillas ni el
migrador histórico. No ejecutar automáticamente migraciones pendientes que ya
pueden haber sido aplicadas manualmente; inspeccionar el esquema real.

Construir desde un commit limpio, preservar la clave Server Actions de build y
runtime, y recrear exclusivamente `web`, proyecto `onlyerp`, con `--no-deps
--no-build --pull never`. MySQL, volúmenes, redes y credenciales históricas se
conservan. Actualizar Hub mediante catálogo firmado y worker independiente.

Validar las escrituras en un clon sin red externa y HTTP nativo/Hub en escritorio
y móvil. La aceptación productiva es de lectura: no crear empresas, cobros ni
usuarios de prueba. Comprobar invariantes de datos y contenedores vecinos.

Rollback: recrear solo el servicio web con su imagen y manifiesto previos.
Conservar tabla y columna aditivas; nunca restaurar o vaciar la base para volver
de imagen. Deshabilitar la selección/token de este conector en el Hub si hiciera
falta y actualizar su catálogo firmado.

Validación local: `node --test scripts/hub-contract.test.cjs`,
`npx prisma generate`, `npx tsc --noEmit`, lint de archivos nuevos y build.
Las suites con mutaciones deben exigir DB/hostname de QA y autorización
`HUB_MANAGEMENT_TEST_ALLOW_MUTATIONS=isolated-only`.
