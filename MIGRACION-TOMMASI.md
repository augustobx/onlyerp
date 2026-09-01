# Migración de Tommasi al dedicado

## Arquitectura definitiva

- Aplicación: `/opt/apps/tommasi`
- Backups: `/opt/backups/tommasi`
- Servicio web: `web:3000`, conectado a `proxy` y `tommasi_internal`
- MySQL: servicio privado `db:3306`, volumen `tommasi_mysql_data`
- Migraciones: servicio manual `migrate`, profile `tools`

La base inicial se construye sin seeds ni datos de demostración. El esquema productivo
histórico no se considera migrado hasta restaurar y validar el dump del origen.

## Restauración histórica pendiente

1. Recuperar un dump consistente con `_prisma_migrations`, triggers, rutinas y eventos.
2. Registrar versión de MySQL, revisión desplegada y checksum del dump.
3. Verificar el dump en una MySQL aislada y comparar su esquema con `prisma/schema.prisma`.
4. Recuperar el `SESSION_SECRET` y las credenciales AFIP históricas antes del corte.
5. Crear un backup verificado del destino inmediatamente antes de restaurar.
6. Restaurar únicamente con autorización explícita y la aplicación sin escrituras.
7. Si el esquema restaurado ya equivale al bootstrap actual, marcar la migración
   `20260901050000_bootstrap_current_schema` como aplicada sólo después de verificar el diff;
   no ejecutarla a ciegas sobre datos históricos.
8. Validar conteos, IDs, relaciones, stock, usuarios, ventas, caja, configuración y AFIP.
9. Ejecutar únicamente migraciones realmente pendientes y conservar el origen para rollback.

Nunca usar `prisma migrate reset`, `prisma db push`, borrar el volumen ni ejecutar seeds.
