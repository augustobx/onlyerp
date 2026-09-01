INSERT INTO Sucursal (id, nombre, direccion, telefono, estado, createdAt) 
VALUES (1, 'Casa Central', 'San Pedro, Buenos Aires', '11-0000-0000', 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Deposito (id, nombre, sucursalId, estado, createdAt)
VALUES (1, 'Depósito Central', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO ListaPrecio (id, nombre, margen_defecto, createdAt, updatedAt)
VALUES (1, 'Lista General', 30.0, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO EmpresaConfig (id, razon_social, nombre_fantasia, cuit, condicion_iva, punto_venta, direccion, telefono, comision_base_global)
VALUES (1, 'Sanu Distribuidora S.A.', 'Sanu Distribuidora', '30-00000000-1', 'Responsable Inscripto', 1, 'San Pedro, Buenos Aires', '11-0000-0000', 5.0)
ON DUPLICATE KEY UPDATE razon_social=VALUES(razon_social);

INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
VALUES (1, 'Administrador', 'admin', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'ADMIN', '["VENTAS", "CAJA", "CLIENTES", "INVENTARIO", "HISTORIAL", "PRESUPUESTOS", "REPORTES", "CONFIGURACION"]', 1, 1, NOW())
ON DUPLICATE KEY UPDATE password=VALUES(password), activo=1;
