-- ============================================================================
-- SEED DATASET MAYORISTA COMPLETO PARA SANU DISTRIBUIDORA
-- ============================================================================

-- 1. SUCURSAL Y DEPÓSITOS
INSERT INTO Sucursal (id, nombre, direccion, telefono, estado, createdAt) 
VALUES (1, 'Casa Central San Pedro', 'Av. Mitre 1250, San Pedro', '03329-425566', 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Deposito (id, nombre, sucursalId, estado, createdAt)
VALUES (1, 'Depósito Central (Nave 1)', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Deposito (id, nombre, sucursalId, estado, createdAt)
VALUES (2, 'Depósito Pulmón / Tránsito', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- 2. LISTAS DE PRECIOS
INSERT INTO ListaPrecio (id, nombre, margen_defecto, createdAt, updatedAt)
VALUES (1, 'Lista Mostrador / Minorista', 35.0, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO ListaPrecio (id, nombre, margen_defecto, createdAt, updatedAt)
VALUES (2, 'Lista Mayorista Comercio (-15%)', 20.0, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO ListaPrecio (id, nombre, margen_defecto, createdAt, updatedAt)
VALUES (3, 'Lista Gran Distribuidor (-25%)', 12.0, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- 3. EMPRESA CONFIG
INSERT INTO EmpresaConfig (id, razon_social, nombre_fantasia, cuit, condicion_iva, punto_venta, direccion, telefono, comision_base_global, penalizacion_global, limite_desc_global, redondear_a_cinco)
VALUES (1, 'Sanu Distribuidora Mayorista S.A.', 'Sanu Distribuidora', '30-71829304-8', 'Responsable Inscripto', 1, 'Av. Mitre 1250, San Pedro, Buenos Aires', '03329-425566', 5.0, 2.0, 15.0, 1)
ON DUPLICATE KEY UPDATE razon_social=VALUES(razon_social);

-- 4. USUARIOS (Password '123456' hasheada PBKDF2: 5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3)
-- Admin
INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
VALUES (1, 'Administrador General', 'admin', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'ADMIN', '["VENTAS", "CAJA", "CLIENTES", "INVENTARIO", "HISTORIAL", "PRESUPUESTOS", "REPORTES", "CONFIGURACION"]', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password);

-- Preventistas
INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, comision_personalizada, limite_desc_vendedor, creadoEn)
VALUES (2, 'Carlos López (Preventista Norte)', 'carlos.lopez', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'VENDEDOR', '["VENTAS", "CLIENTES", "PRESUPUESTOS"]', 1, 1, 5.5, 12.0, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password);

INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, comision_personalizada, limite_desc_vendedor, creadoEn)
VALUES (3, 'Martín Pérez (Preventista Sur)', 'martin.perez', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'VENDEDOR', '["VENTAS", "CLIENTES", "PRESUPUESTOS"]', 1, 1, 6.0, 10.0, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password);

-- Choferes / Repartidores
INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
VALUES (4, 'Roberto Fernández (Chofer Camión 1)', 'roberto.chofer', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'VENDEDOR', '["VENTAS"]', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password);

INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
VALUES (5, 'Diego Morales (Chofer Sprinter)', 'diego.reparto', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'VENDEDOR', '["VENTAS"]', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password);

-- Cajero
INSERT INTO Usuario (id, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
VALUES (6, 'Juan Gómez (Cajero Turno Mañana)', 'juan.cajero', '5ec0645aad6b1ddb22510ad391b2a48b:b5e0cb98b62032f0f3e25cd3760730008c7247f29c0131c89b9455c70877441e3e963101727bedf1d888f1f2ff20060d5b69d0eb152a2c1900e0b18da985f3c3', 'CAJERO', '["VENTAS", "CAJA", "CLIENTES", "HISTORIAL"]', 1, 1, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password=VALUES(password);

-- 5. PROVEEDORES
INSERT INTO Proveedor (id, nombre, cuit, telefono, email, direccion, activo, aumento_porcentaje, creadoEn)
VALUES (1, 'Sinteplast S.A.', '30-50123456-9', '011-4712-9900', 'pedidos@sinteplast.com.ar', 'Av. Corrientes 4500, CABA', 1, 0, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Proveedor (id, nombre, cuit, telefono, email, direccion, activo, aumento_porcentaje, creadoEn)
VALUES (2, 'Alba Pinturas (AkzoNobel)', '30-50987654-3', '011-4899-1122', 'ventas@alba.com.ar', 'Ruta 9 Km 38, Garín', 1, 0, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Proveedor (id, nombre, cuit, telefono, email, direccion, activo, aumento_porcentaje, creadoEn)
VALUES (3, 'Plavicon Impermeabilizantes', '30-52345678-1', '011-4322-8877', 'distribuidores@plavicon.com', 'Panamericana Km 28, Don Torcuato', 1, 0, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Proveedor (id, nombre, cuit, telefono, email, direccion, activo, aumento_porcentaje, creadoEn)
VALUES (4, 'Distribuidora Ferretera del Litoral', '30-61234567-8', '0341-4567890', 'contacto@ferreteralitoral.com', 'Av. Circunvalación 1200, Rosario', 1, 0, NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- 6. MARCAS
INSERT INTO Marca (id, nombre, proveedorId, createdAt, updatedAt)
VALUES (1, 'Sinteplast', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Marca (id, nombre, proveedorId, createdAt, updatedAt)
VALUES (2, 'Alba', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Marca (id, nombre, proveedorId, createdAt, updatedAt)
VALUES (3, 'Plavicon', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Marca (id, nombre, proveedorId, createdAt, updatedAt)
VALUES (4, 'Norton Abrasivos', 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- 7. CATEGORÍAS
INSERT INTO Categoria (id, nombre, marcaId, createdAt, updatedAt)
VALUES (1, 'Látex Interior / Exterior', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Categoria (id, nombre, marcaId, createdAt, updatedAt)
VALUES (2, 'Esmaltes Sintéticos y Barnices', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Categoria (id, nombre, marcaId, createdAt, updatedAt)
VALUES (3, 'Impermeabilizantes y Fibrados', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Categoria (id, nombre, marcaId, createdAt, updatedAt)
VALUES (4, 'Pincelería, Rodillos y Herramientas', 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO Categoria (id, nombre, marcaId, createdAt, updatedAt)
VALUES (5, 'Diluyentes y Solventes', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- 8. PRODUCTOS
INSERT INTO Producto (id, codigo_articulo, codigo_barras, nombre_producto, proveedorId, marcaId, categoriaId, precio_costo, alicuota_iva, stock_minimo, punto_pedido, tiempo_reposicion_dias, tipo_medicion, moneda, createdAt, updatedAt)
VALUES 
(1, 'LAT-INT-20', '7791234000011', 'Látex Interior Profesional Blanco 20 Litros', 1, 1, 1, 35000.0, 21.0, 10, 15, 5, 'UNIDAD', 'ARS', NOW(), NOW()),
(2, 'LAT-EXT-20', '7791234000028', 'Látex Exterior Frente y Muros Blanco 20 Litros', 1, 1, 1, 42000.0, 21.0, 8, 12, 5, 'UNIDAD', 'ARS', NOW(), NOW()),
(3, 'ESM-SAT-04', '7791234000035', 'Esmalte Sintético Satinado Albalux Blanco 4 Litros', 2, 2, 2, 18500.0, 21.0, 12, 20, 7, 'UNIDAD', 'ARS', NOW(), NOW()),
(4, 'IMP-FIB-20', '7791234000042', 'Membrana Líquida Fibrada Plavicon Tech Fibrado 20 Kg', 3, 3, 3, 38000.0, 21.0, 6, 10, 4, 'UNIDAD', 'ARS', NOW(), NOW()),
(5, 'ROD-LAN-22', '7791234000059', 'Rodillo Profesional Lana Pelo Largo 22 cm', 4, 4, 4, 4500.0, 21.0, 20, 40, 3, 'UNIDAD', 'ARS', NOW(), NOW()),
(6, 'PIN-N20-CP', '7791234000066', 'Pincel Virola 1 N° 20 Cerda Rubia Pura', 4, 4, 4, 2100.0, 21.0, 30, 50, 3, 'UNIDAD', 'ARS', NOW(), NOW()),
(7, 'AGU-MIN-05', '7791234000073', 'Aguarrás Mineral Puro Desodorizado 5 Litros', 1, 1, 5, 8500.0, 21.0, 15, 25, 5, 'UNIDAD', 'ARS', NOW(), NOW()),
(8, 'FIJ-CON-04', '7791234000080', 'Fijador Sellador al Agua Concentrado 1 a 3 - 4 Litros', 1, 1, 1, 11000.0, 21.0, 10, 18, 5, 'UNIDAD', 'ARS', NOW(), NOW()),
(9, 'END-INT-20', '7791234000097', 'Enduido Plástico Interior al Agua 20 Kg', 2, 2, 1, 22000.0, 21.0, 8, 15, 6, 'UNIDAD', 'ARS', NOW(), NOW()),
(10, 'BAR-MAR-04', '7791234000103', 'Barniz Marino Filtro Solar Brillante 4 Litros', 2, 2, 2, 19500.0, 21.0, 5, 10, 6, 'UNIDAD', 'ARS', NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre_producto=VALUES(nombre_producto), precio_costo=VALUES(precio_costo);

-- 9. STOCK EN DEPÓSITO CENTRAL
INSERT INTO StockUbicacion (productoId, depositoId, cantidad)
VALUES 
(1, 1, 48.0),
(2, 1, 32.0),
(3, 1, 65.0),
(4, 1, 24.0),
(5, 1, 140.0),
(6, 1, 95.0),
(7, 1, 55.0),
(8, 1, 42.0),
(9, 1, 38.0),
(10, 1, 20.0)
ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad);

-- 10. ESCALAS DE PRECIO POR VOLUMEN
INSERT INTO ProductoEscalaPrecio (id, productoId, listaPrecioId, cantidad_minima, precio_unitario, descuento_porcentaje, createdAt, updatedAt)
VALUES 
(1, 1, NULL, 6, 44000.0, NULL, NOW(), NOW()),
(2, 1, NULL, 12, 41000.0, NULL, NOW(), NOW()),
(3, 2, NULL, 6, 53000.0, NULL, NOW(), NOW()),
(4, 2, NULL, 12, 49500.0, NULL, NOW(), NOW()),
(5, 3, NULL, 6, NULL, 8.0, NOW(), NOW()),
(6, 3, NULL, 12, NULL, 15.0, NOW(), NOW()),
(7, 4, NULL, 5, 47500.0, NULL, NOW(), NOW()),
(8, 4, NULL, 10, 44000.0, NULL, NOW(), NOW()),
(9, 5, NULL, 12, 5600.0, NULL, NOW(), NOW()),
(10, 5, NULL, 36, 5100.0, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE cantidad_minima=VALUES(cantidad_minima);

-- 11. CLIENTES MAYORISTAS Y DISTRIBUIDORES
INSERT INTO Cliente (id, nombre_razon_social, dni_cuit, condicion_iva, direccion, telefono, limite_credito, lista_default_id, createdAt, updatedAt)
VALUES 
(1, 'Pinturería del Centro S.R.L.', '30-71112233-4', 'RESPONSABLE_INSCRIPTO', 'Pellegrini 450, San Pedro', '03329-421122', 800000.0, 2, NOW(), NOW()),
(2, 'Ferretería Industrial El Progreso', '30-72223344-5', 'RESPONSABLE_INSCRIPTO', 'Av. 3 de Febrero 820, Baradero', '03329-482233', 500000.0, 2, NOW(), NOW()),
(3, 'Constructora San Pedro S.R.L.', '30-73334455-6', 'RESPONSABLE_INSCRIPTO', 'Ruta 191 Km 4.5, San Pedro', '03329-429988', 1500000.0, 3, NOW(), NOW()),
(4, 'Corralón & Materiales La Ribera', '30-74445566-7', 'RESPONSABLE_INSCRIPTO', 'Costanera Sur 110, Ramallo', '03407-422110', 1000000.0, 2, NOW(), NOW()),
(5, 'Juan Manuel Benítez (Pintor Profesional)', '20-32456789-2', 'CONSUMIDOR_FINAL', 'Gomendio 340, San Pedro', '03329-15554433', 150000.0, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE nombre_razon_social=VALUES(nombre_razon_social);

-- Movimientos de cuenta corriente iniciales
INSERT INTO MovimientoCuentaCorriente (id, clienteId, tipo, monto, metodo_pago, notas, fecha)
VALUES 
(1, 1, 'CARGO', 150000.0, 'CUENTA_CORRIENTE', 'Saldo inicial de apertura de cuenta corriente', NOW()),
(2, 2, 'CARGO', 85000.0, 'CUENTA_CORRIENTE', 'Saldo inicial de apertura de cuenta corriente', NOW()),
(3, 3, 'CARGO', 320000.0, 'CUENTA_CORRIENTE', 'Saldo inicial obra Hospital', NOW())
ON DUPLICATE KEY UPDATE monto=VALUES(monto);

-- 12. CAJA DIARIA
INSERT INTO CajaDiaria (id, fecha_apertura, saldo_inicial, estado, sucursalId)
VALUES (1, NOW(), 50000.0, 'ABIERTA', 1)
ON DUPLICATE KEY UPDATE estado='ABIERTA';

INSERT INTO MovimientoCaja (id, cajaId, tipo, metodo_pago, monto, descripcion, usuarioId, fecha)
VALUES 
(1, 1, 'APERTURA', 'CONTADO', 50000.0, 'Fondo de inicio de turno mañana', 6, NOW()),
(2, 1, 'INGRESO_MANUAL', 'CONTADO', 15000.0, 'Ingreso cambio chico (billetes $500 y $1000)', 6, NOW())
ON DUPLICATE KEY UPDATE monto=VALUES(monto);

-- 13. CARTERA DE VALORES (CHEQUES Y ECHEQS)
INSERT INTO Cheque (id, numero_cheque, banco, cuit_librador, nombre_librador, monto, fecha_emision, fecha_cobro, tipo, origen, estado, clienteId, notas, createdAt, updatedAt)
VALUES 
(1, '45812903', 'Banco Galicia', '30-71112233-4', 'Pinturería del Centro S.R.L.', 150000.0, NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 'FISICO', 'TERCERO_CLIENTE', 'EN_CARTERA', 1, 'Pago parcial factura CC #1029', NOW(), NOW()),
(2, '88120491', 'Banco Santander', '30-73334455-6', 'Constructora San Pedro S.R.L.', 320000.0, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 'ECHEQ', 'TERCERO_CLIENTE', 'EN_CARTERA', 3, 'eCheq diferido Obra Hospital', NOW(), NOW()),
(3, '12049281', 'Banco Nación', '30-72223344-5', 'Ferretería Industrial El Progreso', 85000.0, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'FISICO', 'TERCERO_CLIENTE', 'EN_CARTERA', 2, 'Cheque a 30 días', NOW(), NOW()),
(4, '99120482', 'Banco Macro', '30-71112233-4', 'Pinturería del Centro S.R.L.', 210000.0, NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY), 'ECHEQ', 'TERCERO_CLIENTE', 'ENDOSADO_PROVEEDOR', 1, 'Endosado a Sinteplast en pago de Orden Compra #881', NOW(), NOW())
ON DUPLICATE KEY UPDATE numero_cheque=VALUES(numero_cheque);

-- 14. PEDIDOS DE PREVENTA
INSERT INTO Pedido (id, numero, clienteId, usuarioId, repartidorId, listaPrecioId, estado, subtotal, descuento_global, total, metodo_pago, notas, createdAt, updatedAt)
VALUES 
(1, 101, 1, 2, 4, 2, 'ARMADO', 180000.0, 0, 180000.0, 'CONTADO', 'Entregar por la mañana antes de las 12hs', NOW(), NOW()),
(2, 102, 2, 2, 4, 2, 'ARMADO', 95000.0, 0, 95000.0, 'CUENTA_CORRIENTE', 'Cobrar flete bonificado', NOW(), NOW()),
(3, 103, 3, 3, 5, 3, 'LISTO_ENTREGA', 340000.0, 0, 340000.0, 'TRANSFERENCIA', 'Descargar en obrador central', NOW(), NOW()),
(4, 104, 5, 2, NULL, 1, 'PENDIENTE', 42000.0, 0, 42000.0, 'CONTADO', 'Pintor retira por depósito', NOW(), NOW())
ON DUPLICATE KEY UPDATE total=VALUES(total);

-- Detalles de pedidos
INSERT INTO DetallePedido (id, pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
VALUES 
(1, 1, 1, 3.0, 44000.0, 0, 44000.0, 132000.0),
(2, 1, 5, 8.0, 6000.0, 0, 6000.0, 48000.0),
(3, 2, 3, 4.0, 23750.0, 0, 23750.0, 95000.0),
(4, 3, 4, 6.0, 45000.0, 0, 45000.0, 270000.0),
(5, 3, 7, 7.0, 10000.0, 0, 10000.0, 70000.0),
(6, 4, 2, 1.0, 42000.0, 0, 42000.0, 42000.0)
ON DUPLICATE KEY UPDATE subtotal=VALUES(subtotal);

-- 15. HOJA DE RUTA LOGÍSTICA
INSERT INTO HojaDeRuta (id, numero, fecha_despacho, repartidorId, vehiculo, zona, estado, km_inicial, notas, createdAt, updatedAt)
VALUES 
(1, 1, NOW(), 4, 'Camión Ford 4000 (AA-123-BB)', 'Ruta 9 Norte / San Pedro - Baradero', 'EN_RUTA', 124500, 'Salida 08:30 hs. Regreso estimado 14:00 hs.', NOW(), NOW())
ON DUPLICATE KEY UPDATE estado='EN_RUTA';

INSERT INTO DetalleHojaDeRuta (id, hojaDeRutaId, pedidoId, orden_parada, estado_entrega, monto_cobrado, createdAt, updatedAt)
VALUES 
(1, 1, 1, 1, 'PENDIENTE', 0, NOW(), NOW()),
(2, 1, 2, 2, 'PENDIENTE', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE orden_parada=VALUES(orden_parada);

-- 16. LIQUIDACIÓN DE COMISIONES
INSERT INTO LiquidacionComision (id, usuarioId, mes, anio, total_ventas, total_cobranzas, porcentaje_comision, monto_comision, estado, notas, createdAt, updatedAt)
VALUES 
(1, 2, MONTH(NOW()), YEAR(NOW()), 480000.0, 350000.0, 5.5, 26400.0, 'PENDIENTE', 'Comisiones calculadas sobre facturación bruta del mes', NOW(), NOW()),
(2, 3, MONTH(NOW()), YEAR(NOW()), 620000.0, 500000.0, 6.0, 37200.0, 'PENDIENTE', 'Comisiones calculadas sobre facturación bruta del mes', NOW(), NOW())
ON DUPLICATE KEY UPDATE total_ventas=VALUES(total_ventas);

-- 17. SECUENCIAS
INSERT INTO SecuenciaPedido (id, numero_actual) VALUES (1, 104) ON DUPLICATE KEY UPDATE numero_actual=VALUES(numero_actual);
INSERT INTO SecuenciaHojaDeRuta (id, numero_actual) VALUES (1, 1) ON DUPLICATE KEY UPDATE numero_actual=VALUES(numero_actual);
INSERT INTO SecuenciaPresupuesto (id, numero_actual) VALUES (1, 10) ON DUPLICATE KEY UPDATE numero_actual=VALUES(numero_actual);
INSERT INTO SecuenciaFactura (id, tipo_comprobante, punto_venta, numero_actual) VALUES (1, 'FACTURA_A', 1, 10) ON DUPLICATE KEY UPDATE numero_actual=VALUES(numero_actual);
