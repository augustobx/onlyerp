const fs = require('fs');
const path = require('path');

console.log("Generando script SQL de seed masivo para tenant tendecosis (tenantId = 2)...");

// Hashes calculados con PBKDF2 sha512 (100k iteraciones) para password '123456'
const PASSWORD_123456_HASH = '7509deac9c051843b4e35e1aa56ad80e:86b194342c2becd1cac2e22ae02f6057116ca9d13fb981e84152e8e58dfe19213499c68f2b21f470e04063bc1a43212634ff75f153fdfbdb667b5640b5696f33';

let sql = `-- ============================================================================
-- SEED DATASET COMPLETO Y MASIVO PARA TENANT: TENDECOSIS (TENDECO MAYORISTA)
-- TENANT ID: 2
-- REGLA CRÍTICA: NO TOCAR NINGÚN OTRO TENANT (SOLO TENANT ID = 2)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- 0. VALIDACIÓN DE SEGURIDAD ESTRICTA
SELECT id, slug, nombre FROM Tenant WHERE id = 2 AND slug = 'tendecosis';

-- 1. ACTUALIZAR TENANT 2 A PLAN ENTERPRISE COMPLETO Y FECHA DE PRUEBA 2 SEMANAS
UPDATE Tenant SET
  nombre = 'Tendeco Distribuidora',
  cuit = '30-71649201-4',
  direccion = 'Av. Circunvalación 4520, Rosario, Santa Fe',
  telefono = '0341-4899200',
  email = 'contacto@tendeco.com.ar',
  estado = 'PRUEBA',
  fecha_vencimiento = '2026-11-30 23:59:59',
  modulos_override = NULL,
  updatedAt = NOW()
WHERE id = 2;

-- 2. LIMPIEZA DE REGISTROS PREVIOS INCORRECTOS O HUÉRFANOS DE TENANT 2
DELETE FROM CompraImpuesto WHERE compraId IN (SELECT id FROM Compra WHERE tenantId = 2);
DELETE FROM Compra WHERE tenantId = 2;

-- 3. EMPRESA CONFIG PARA TENANT 2
INSERT INTO EmpresaConfig (
  id, tenantId, razon_social, nombre_fantasia, cuit, inicio_actividad, condicion_iva,
  punto_venta, modo_produccion_afip, direccion, telefono, redes_sociales,
  comision_base_global, penalizacion_global, limite_desc_global,
  redondear_a_cinco, aplicar_iva_en_precios, permitir_stock_negativo, facturar_al_entregar,
  createdAt, updatedAt
) VALUES (
  2, 2, 'Tendeco Distribuidora Mayorista S.A.', 'Tendeco Mayorista', '30-71649201-4', '01/03/2021', 'Responsable Inscripto',
  1, 0, 'Av. Circunvalación 4520, Rosario, Santa Fe', '0341-4899200', '@tendeco.distribuidora',
  5.0, 1.5, 15.0,
  1, 0, 0, 1,
  NOW(), NOW()
) ON DUPLICATE KEY UPDATE
  razon_social = VALUES(razon_social),
  nombre_fantasia = VALUES(nombre_fantasia),
  cuit = VALUES(cuit),
  direccion = VALUES(direccion),
  telefono = VALUES(telefono),
  redes_sociales = VALUES(redes_sociales),
  comision_base_global = VALUES(comision_base_global),
  facturar_al_entregar = VALUES(facturar_al_entregar),
  updatedAt = NOW();

-- 4. SUCURSALES (TENANT 2)
UPDATE Sucursal SET
  nombre = 'Casa Central Logística Rosario',
  direccion = 'Av. Circunvalación 4520, Rosario',
  telefono = '0341-4899200',
  estado = 1
WHERE tenantId = 2 AND id = 2;

INSERT INTO Sucursal (tenantId, nombre, direccion, telefono, estado, createdAt)
SELECT 2, 'Sucursal Comercial Centro', 'San Martín 1420, Rosario', '0341-4221144', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Sucursal WHERE tenantId = 2 AND nombre = 'Sucursal Comercial Centro');

SET @sucursal_central = 2;
SET @sucursal_centro = (SELECT id FROM Sucursal WHERE tenantId = 2 AND nombre = 'Sucursal Comercial Centro' LIMIT 1);

-- 5. DEPÓSITOS (TENANT 2)
UPDATE Deposito SET
  nombre = 'Depósito Central (Nave A - Pallets)',
  sucursalId = @sucursal_central,
  estado = 1
WHERE tenantId = 2 AND id = 2;

INSERT INTO Deposito (tenantId, nombre, sucursalId, estado, createdAt)
SELECT 2, 'Depósito Pulmón / Picking Fraccionado', @sucursal_central, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Deposito WHERE tenantId = 2 AND nombre = 'Depósito Pulmón / Picking Fraccionado');

INSERT INTO Deposito (tenantId, nombre, sucursalId, estado, createdAt)
SELECT 2, 'Depósito Mostrador Centro', @sucursal_centro, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Deposito WHERE tenantId = 2 AND nombre = 'Depósito Mostrador Centro');

SET @depo_central = 2;
SET @depo_pulmon = (SELECT id FROM Deposito WHERE tenantId = 2 AND nombre = 'Depósito Pulmón / Picking Fraccionado' LIMIT 1);
SET @depo_centro = (SELECT id FROM Deposito WHERE tenantId = 2 AND nombre = 'Depósito Mostrador Centro' LIMIT 1);

-- 6. LISTAS DE PRECIOS (TENANT 2)
UPDATE ListaPrecio SET
  nombre = 'Lista Mayorista Estándar',
  margen_defecto = 25.0,
  updatedAt = NOW()
WHERE tenantId = 2 AND id = 7;

INSERT INTO ListaPrecio (tenantId, nombre, margen_defecto, createdAt, updatedAt)
SELECT 2, 'Lista Gran Distribuidor (-15%)', 15.0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM ListaPrecio WHERE tenantId = 2 AND nombre = 'Lista Gran Distribuidor (-15%)');

INSERT INTO ListaPrecio (tenantId, nombre, margen_defecto, createdAt, updatedAt)
SELECT 2, 'Lista Kioscos y Comercios Cercanía (+10%)', 35.0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM ListaPrecio WHERE tenantId = 2 AND nombre = 'Lista Kioscos y Comercios Cercanía (+10%)');

INSERT INTO ListaPrecio (tenantId, nombre, margen_defecto, createdAt, updatedAt)
SELECT 2, 'Lista Cuentas Especiales / Cadenas', 18.0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM ListaPrecio WHERE tenantId = 2 AND nombre = 'Lista Cuentas Especiales / Cadenas');

SET @lista_mayorista = 7;
SET @lista_distribuidor = (SELECT id FROM ListaPrecio WHERE tenantId = 2 AND nombre = 'Lista Gran Distribuidor (-15%)' LIMIT 1);
SET @lista_kioscos = (SELECT id FROM ListaPrecio WHERE tenantId = 2 AND nombre = 'Lista Kioscos y Comercios Cercanía (+10%)' LIMIT 1);
SET @lista_cadenas = (SELECT id FROM ListaPrecio WHERE tenantId = 2 AND nombre = 'Lista Cuentas Especiales / Cadenas' LIMIT 1);

-- 7. USUARIOS (TENANT 2)
-- Actualizar permisos completos de los usuarios existentes administrador y augusto
UPDATE Usuario SET
  rol = 'ADMIN',
  permisos = '["VENTAS","COMPRAS","INVENTARIO","CLIENTES","PROVEEDORES","LISTAS_PRECIO","PRESUPUESTOS","CAJA","CUENTAS_CORRIENTES","LOGISTICA","CHEQUES","COMISIONES","AFIP","PORTAL_B2B","VENDEDORES_PWA"]',
  activo = 1,
  sucursalId = @sucursal_central
WHERE tenantId = 2 AND id = 14;

UPDATE Usuario SET
  rol = 'MIXTO',
  permisos = '["VENTAS","COMPRAS","INVENTARIO","CLIENTES","PROVEEDORES","LISTAS_PRECIO","PRESUPUESTOS","CAJA","CUENTAS_CORRIENTES","LOGISTICA","CHEQUES","COMISIONES"]',
  activo = 1,
  sucursalId = @sucursal_central
WHERE tenantId = 2 AND id = 15;

-- Usuarios adicionales para pruebas funcionales de roles (Password: 123456)
INSERT INTO Usuario (tenantId, nombre, username, password, rol, permisos, activo, comision_personalizada, limite_desc_vendedor, sucursalId, telefono, creadoEn)
SELECT 2, 'Carlos López (Preventista Norte)', 'carlos.vendedor', '${PASSWORD_123456_HASH}', 'VENDEDOR', '["VENTAS", "CLIENTES", "PRESUPUESTOS"]', 1, 5.5, 12.0, @sucursal_central, '0341-155112233', NOW()
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE tenantId = 2 AND username = 'carlos.vendedor');

INSERT INTO Usuario (tenantId, nombre, username, password, rol, permisos, activo, comision_personalizada, limite_desc_vendedor, sucursalId, telefono, creadoEn)
SELECT 2, 'Lucas Benítez (Preventista Sur)', 'lucas.preventa', '${PASSWORD_123456_HASH}', 'VENDEDOR', '["VENTAS", "CLIENTES", "PRESUPUESTOS"]', 1, 5.0, 10.0, @sucursal_central, '0341-155445566', NOW()
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE tenantId = 2 AND username = 'lucas.preventa');

INSERT INTO Usuario (tenantId, nombre, username, password, rol, permisos, activo, sucursalId, telefono, creadoEn)
SELECT 2, 'Roberto Fernández (Chofer Camión 1)', 'roberto.chofer', '${PASSWORD_123456_HASH}', 'VENDEDOR', '["VENTAS", "LOGISTICA"]', 1, @sucursal_central, '0341-155778899', NOW()
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE tenantId = 2 AND username = 'roberto.chofer');

INSERT INTO Usuario (tenantId, nombre, username, password, rol, permisos, activo, sucursalId, telefono, creadoEn)
SELECT 2, 'Diego Morales (Chofer Furgón 2)', 'diego.reparto', '${PASSWORD_123456_HASH}', 'VENDEDOR', '["VENTAS", "LOGISTICA"]', 1, @sucursal_central, '0341-155990011', NOW()
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE tenantId = 2 AND username = 'diego.reparto');

INSERT INTO Usuario (tenantId, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
SELECT 2, 'Valeria Gómez (Caja Turno Mañana)', 'valeria.caja', '${PASSWORD_123456_HASH}', 'CAJERO', '["VENTAS", "CAJA", "CLIENTES", "HISTORIAL"]', 1, @sucursal_central, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE tenantId = 2 AND username = 'valeria.caja');

INSERT INTO Usuario (tenantId, nombre, username, password, rol, permisos, activo, sucursalId, creadoEn)
SELECT 2, 'Martín Rodríguez (Encargado WMS)', 'martin.deposito', '${PASSWORD_123456_HASH}', 'ADMIN', '["INVENTARIO", "WMS", "COMPRAS", "LOGISTICA"]', 1, @sucursal_central, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE tenantId = 2 AND username = 'martin.deposito');

SET @user_admin = 14;
SET @user_augusto = 15;
SET @user_carlos = (SELECT id FROM Usuario WHERE tenantId = 2 AND username = 'carlos.vendedor' LIMIT 1);
SET @user_lucas = (SELECT id FROM Usuario WHERE tenantId = 2 AND username = 'lucas.preventa' LIMIT 1);
SET @user_roberto = (SELECT id FROM Usuario WHERE tenantId = 2 AND username = 'roberto.chofer' LIMIT 1);
SET @user_diego = (SELECT id FROM Usuario WHERE tenantId = 2 AND username = 'diego.reparto' LIMIT 1);
SET @user_valeria = (SELECT id FROM Usuario WHERE tenantId = 2 AND username = 'valeria.caja' LIMIT 1);

-- 8. PROVEEDORES (TENANT 2)
`;

// Proveedores
const proveedores = [
  { nombre: "Cervecería y Maltería Quilmes S.A.", cuit: "30-50349487-5", tel: "0800-222-7845", email: "ventas@quilmes.com.ar", dir: "Av. 12 de Octubre y Gran Canaria, Quilmes", aumento: 0 },
  { nombre: "Arcor S.A.I.C.", cuit: "30-50279317-8", tel: "0800-333-2726", email: "distribuidores@arcor.com", dir: "Chacabuco 1160, Córdoba", aumento: 0 },
  { nombre: "Molinos Río de la Plata S.A.", cuit: "30-50018844-0", tel: "0800-555-6654", email: "pedidos@molinos.com.ar", dir: "Uruguay 4075, Victoria, Bs. As.", aumento: 0 },
  { nombre: "Unilever de Argentina S.A.", cuit: "30-50111248-9", tel: "0800-888-8645", email: "atencion@unilever.com", dir: "Fraga 1163, CABA", aumento: 0 },
  { nombre: "Mondelez Argentina S.A.", cuit: "30-50125432-1", tel: "0800-222-6663", email: "contacto@mondelezinternational.com", dir: "Av. San Martín 2000, Pacheco", aumento: 0 },
  { nombre: "Mastellone Hnos S.A. (La Serenísima)", cuit: "30-50041235-8", tel: "0800-777-5273", email: "ventas@laserenisima.com.ar", dir: "Almirante Brown 957, Gral. Rodríguez", aumento: 0 },
  { nombre: "Distribuidora Bebidas del Paraná", cuit: "30-68994512-3", tel: "0341-4552233", email: "pedidos@bebidasparana.com", dir: "Ovidio Lagos 5200, Rosario", aumento: 0 }
];

proveedores.forEach((p) => {
  sql += `
INSERT INTO Proveedor (tenantId, nombre, cuit, telefono, email, direccion, activo, aumento_porcentaje, creadoEn)
SELECT 2, '${p.nombre}', '${p.cuit}', '${p.tel}', '${p.email}', '${p.dir}', 1, ${p.aumento}, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Proveedor WHERE tenantId = 2 AND nombre = '${p.nombre}');
`;
});

sql += `
SET @prov_quilmes = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Cervecería%' LIMIT 1);
SET @prov_arcor = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Arcor%' LIMIT 1);
SET @prov_molinos = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Molinos%' LIMIT 1);
SET @prov_unilever = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Unilever%' LIMIT 1);
SET @prov_mondelez = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Mondelez%' LIMIT 1);
SET @prov_mastellone = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Mastellone%' LIMIT 1);
SET @prov_parana = (SELECT id FROM Proveedor WHERE tenantId = 2 AND nombre LIKE 'Distribuidora Bebidas%' LIMIT 1);

-- 9. MARCAS (TENANT 2)
`;

const marcas = [
  { nombre: "Quilmes", provVar: "@prov_quilmes" },
  { nombre: "Brahma", provVar: "@prov_quilmes" },
  { nombre: "Stella Artois", provVar: "@prov_quilmes" },
  { nombre: "Gatorade", provVar: "@prov_quilmes" },
  { nombre: "Arcor", provVar: "@prov_arcor" },
  { nombre: "Bagley", provVar: "@prov_arcor" },
  { nombre: "Bon o Bon", provVar: "@prov_arcor" },
  { nombre: "Matarazzo", provVar: "@prov_molinos" },
  { nombre: "Cocinero", provVar: "@prov_molinos" },
  { nombre: "Lucchetti", provVar: "@prov_molinos" },
  { nombre: "Granja del Sol", provVar: "@prov_molinos" },
  { nombre: "Ala", provVar: "@prov_unilever" },
  { nombre: "Skip", provVar: "@prov_unilever" },
  { nombre: "Cif", provVar: "@prov_unilever" },
  { nombre: "Rexona", provVar: "@prov_unilever" },
  { nombre: "Dove", provVar: "@prov_unilever" },
  { nombre: "Oreo", provVar: "@prov_mondelez" },
  { nombre: "Milka", provVar: "@prov_mondelez" },
  { nombre: "Terrabusi", provVar: "@prov_mondelez" },
  { nombre: "La Serenísima", provVar: "@prov_mastellone" },
  { nombre: "Danone", provVar: "@prov_mastellone" }
];

marcas.forEach(m => {
  sql += `
INSERT INTO Marca (tenantId, nombre, proveedorId, aumento_porcentaje, createdAt, updatedAt)
SELECT 2, '${m.nombre}', ${m.provVar}, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Marca WHERE tenantId = 2 AND nombre = '${m.nombre}');
`;
});

sql += `
-- 10. CATEGORÍAS (TENANT 2)
`;

const categorias = [
  { nombre: "Cervezas y Bebidas con Alcohol", marca: "Quilmes" },
  { nombre: "Aguas, Gaseosas y Energizantes", marca: "Gatorade" },
  { nombre: "Pastas Secas y Legumbres", marca: "Matarazzo" },
  { nombre: "Aceites, Harinas y Aderezos", marca: "Cocinero" },
  { nombre: "Galletitas Dulces y Saladas", marca: "Bagley" },
  { nombre: "Chocolates, Alfajores y Golosinas", marca: "Milka" },
  { nombre: "Cuidado de la Ropa y Lavado", marca: "Ala" },
  { nombre: "Limpieza Superficies y Desinfección", marca: "Cif" },
  { nombre: "Higiene Personal y Desodorantes", marca: "Rexona" },
  { nombre: "Lácteos, Leches y Quesos", marca: "La Serenísima" }
];

categorias.forEach(c => {
  sql += `
INSERT INTO Categoria (tenantId, nombre, marcaId, aumento_porcentaje, createdAt, updatedAt)
SELECT 2, '${c.nombre}', (SELECT id FROM Marca WHERE tenantId = 2 AND nombre = '${c.marca}' LIMIT 1), 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Categoria WHERE tenantId = 2 AND nombre = '${c.nombre}');
`;
});

sql += `
-- Asignar variables de categorías
SET @cat_cervezas = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Cervezas%' LIMIT 1);
SET @cat_bebidas = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Aguas%' LIMIT 1);
SET @cat_pastas = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Pastas%' LIMIT 1);
SET @cat_aceites = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Aceites%' LIMIT 1);
SET @cat_galletitas = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Galletitas%' LIMIT 1);
SET @cat_golosinas = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Chocolates%' LIMIT 1);
SET @cat_lavado = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Cuidado de la Ropa%' LIMIT 1);
SET @cat_limpieza = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Limpieza Superficies%' LIMIT 1);
SET @cat_higiene = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Higiene Personal%' LIMIT 1);
SET @cat_lacteos = (SELECT id FROM Categoria WHERE tenantId = 2 AND nombre LIKE 'Lácteos%' LIMIT 1);

-- 11. PRODUCTOS (TENANT 2)
`;

const productos = [
  // Cervezas
  { cod: "CER-QUI-473", ean: "7791234500018", nom: "Cerveza Quilmes Clásica Lata 473cc (Pack x24)", provVar: "@prov_quilmes", marca: "Quilmes", catVar: "@cat_cervezas", costo: 28500, iva: 21.0, med: "PACK", stockMin: 20, ptoPed: 35, stockNave: 180, stockPulmon: 60, lote: "L-QUI-2026-11", vto: "2027-08-15" },
  { cod: "CER-BRA-473", ean: "7791234500025", nom: "Cerveza Brahma Chopp Lata 473cc (Pack x24)", provVar: "@prov_quilmes", marca: "Brahma", catVar: "@cat_cervezas", costo: 26800, iva: 21.0, med: "PACK", stockMin: 15, ptoPed: 30, stockNave: 140, stockPulmon: 40, lote: "L-BRA-2026-10", vto: "2027-07-20" },
  { cod: "CER-STE-LATA", ean: "7791234500032", nom: "Cerveza Stella Artois Lata 473cc (Pack x24)", provVar: "@prov_quilmes", marca: "Stella Artois", catVar: "@cat_cervezas", costo: 36000, iva: 21.0, med: "PACK", stockMin: 10, ptoPed: 20, stockNave: 95, stockPulmon: 25, lote: "L-STE-2026-09", vto: "2027-09-10" },
  { cod: "CER-QUI-1L", ean: "7791234500049", nom: "Cerveza Quilmes Clásica Retornable 1L (Cajón x12)", provVar: "@prov_quilmes", marca: "Quilmes", catVar: "@cat_cervezas", costo: 19500, iva: 21.0, med: "CAJA", stockMin: 30, ptoPed: 50, stockNave: 220, stockPulmon: 80, lote: "L-QUI-1L-08", vto: "2027-05-30" },

  // Aguas e Isotónicas
  { cod: "GAT-MAN-500", ean: "7791234500056", nom: "Gatorade Manzana Pet 500cc (Pack x6)", provVar: "@prov_quilmes", marca: "Gatorade", catVar: "@cat_bebidas", costo: 7200, iva: 21.0, med: "PACK", stockMin: 15, ptoPed: 25, stockNave: 110, stockPulmon: 45, lote: "L-GAT-M-2026", vto: "2027-04-12" },
  { cod: "GAT-COL-500", ean: "7791234500063", nom: "Gatorade Cool Blue Pet 500cc (Pack x6)", provVar: "@prov_quilmes", marca: "Gatorade", catVar: "@cat_bebidas", costo: 7200, iva: 21.0, med: "PACK", stockMin: 15, ptoPed: 25, stockNave: 125, stockPulmon: 50, lote: "L-GAT-CB-2026", vto: "2027-04-18" },

  // Almacén / Aceites / Pastas
  { cod: "ACE-COC-15L", ean: "7791234500070", nom: "Aceite de Girasol Cocinero 1.5L (Caja x12)", provVar: "@prov_molinos", marca: "Cocinero", catVar: "@cat_aceites", costo: 27600, iva: 21.0, med: "CAJA", stockMin: 20, ptoPed: 40, stockNave: 160, stockPulmon: 55, lote: "L-COC-15-2026", vto: "2027-11-20" },
  { cod: "ACE-COC-900", ean: "7791234500087", nom: "Aceite de Girasol Cocinero 900cc (Caja x15)", provVar: "@prov_molinos", marca: "Cocinero", catVar: "@cat_aceites", costo: 23200, iva: 21.0, med: "CAJA", stockMin: 25, ptoPed: 45, stockNave: 190, stockPulmon: 70, lote: "L-COC-90-2026", vto: "2027-11-25" },
  { cod: "FID-MAT-TAL", ean: "7791234500094", nom: "Fideos Matarazzo Tallarín 500g (Fardo x20)", provVar: "@prov_molinos", marca: "Matarazzo", catVar: "@cat_pastas", costo: 18400, iva: 21.0, med: "PACK", stockMin: 30, ptoPed: 60, stockNave: 250, stockPulmon: 90, lote: "L-MAT-TAL-26", vto: "2028-01-10" },
  { cod: "FID-MAT-TIR", ean: "7791234500100", nom: "Fideos Matarazzo Tirabuzón 500g (Fardo x20)", provVar: "@prov_molinos", marca: "Matarazzo", catVar: "@cat_pastas", costo: 18400, iva: 21.0, med: "PACK", stockMin: 30, ptoPed: 60, stockNave: 240, stockPulmon: 85, lote: "L-MAT-TIR-26", vto: "2028-01-15" },
  { cod: "HAR-LUC-000", ean: "7791234500117", nom: "Harina Lucchetti 000 1Kg (Fardo x10)", provVar: "@prov_molinos", marca: "Lucchetti", catVar: "@cat_aceites", costo: 8900, iva: 10.5, med: "PACK", stockMin: 40, ptoPed: 80, stockNave: 320, stockPulmon: 120, lote: "L-LUC-HAR-26", vto: "2027-06-30" },

  // Galletitas y Snacks
  { cod: "GAL-BAG-CHO", ean: "7791234500124", nom: "Galletitas Chocolinas Bagley 250g (Caja x24)", provVar: "@prov_arcor", marca: "Bagley", catVar: "@cat_galletitas", costo: 24500, iva: 21.0, med: "CAJA", stockMin: 15, ptoPed: 30, stockNave: 130, stockPulmon: 45, lote: "L-CHO-250-26", vto: "2027-05-15" },
  { cod: "GAL-BAG-CRI", ean: "7791234500131", nom: "Galletitas Criollitas Clásicas 3x100g (Caja x20)", provVar: "@prov_arcor", marca: "Bagley", catVar: "@cat_galletitas", costo: 19800, iva: 21.0, med: "CAJA", stockMin: 20, ptoPed: 40, stockNave: 175, stockPulmon: 60, lote: "L-CRI-300-26", vto: "2027-06-10" },
  { cod: "GAL-ORE-ORI", ean: "7791234500148", nom: "Galletitas Oreo Original 118g (Caja x36)", provVar: "@prov_mondelez", marca: "Oreo", catVar: "@cat_galletitas", costo: 31200, iva: 21.0, med: "CAJA", stockMin: 12, ptoPed: 25, stockNave: 115, stockPulmon: 40, lote: "L-ORE-118-26", vto: "2027-08-22" },
  { cod: "GAL-TER-SUR", ean: "7791234500155", nom: "Galletitas Variedad Terrabusi 390g (Caja x18)", provVar: "@prov_mondelez", marca: "Terrabusi", catVar: "@cat_galletitas", costo: 22800, iva: 21.0, med: "CAJA", stockMin: 15, ptoPed: 30, stockNave: 140, stockPulmon: 50, lote: "L-VAR-390-26", vto: "2027-04-18" },

  // Golosinas y Chocolates
  { cod: "BON-LECH-X30", ean: "7791234500162", nom: "Bombones Bon o Bon Leche (Caja Display x30)", provVar: "@prov_arcor", marca: "Bon o Bon", catVar: "@cat_golosinas", costo: 11400, iva: 21.0, med: "CAJA", stockMin: 25, ptoPed: 50, stockNave: 210, stockPulmon: 80, lote: "L-BOB-LEC-26", vto: "2027-09-30" },
  { cod: "BON-BLAN-X30", ean: "7791234500179", nom: "Bombones Bon o Bon Blanco (Caja Display x30)", provVar: "@prov_arcor", marca: "Bon o Bon", catVar: "@cat_golosinas", costo: 11400, iva: 21.0, med: "CAJA", stockMin: 20, ptoPed: 40, stockNave: 180, stockPulmon: 65, lote: "L-BOB-BLA-26", vto: "2027-09-30" },
  { cod: "CHO-MIL-LEG", ean: "7791234500186", nom: "Chocolate Milka Leger Leche 100g (Display x16)", provVar: "@prov_mondelez", marca: "Milka", catVar: "@cat_golosinas", costo: 23500, iva: 21.0, med: "CAJA", stockMin: 15, ptoPed: 30, stockNave: 140, stockPulmon: 50, lote: "L-MIL-LEG-26", vto: "2027-10-15" },
  { cod: "ALF-TER-TOR", ean: "7791234500193", nom: "Alfajor Terrabusi Torta Triple (Caja x24)", provVar: "@prov_mondelez", marca: "Terrabusi", catVar: "@cat_golosinas", costo: 16800, iva: 21.0, med: "CAJA", stockMin: 30, ptoPed: 60, stockNave: 260, stockPulmon: 95, lote: "L-TER-TOR-26", vto: "2027-03-25" },

  // Limpieza del Hogar
  { cod: "JAB-ALA-EFE", ean: "7791234500209", nom: "Jabón Líquido Ala Ecolavado 3 Litros (Bidón)", provVar: "@prov_unilever", marca: "Ala", catVar: "@cat_lavado", costo: 6800, iva: 21.0, med: "UNIDAD", stockMin: 40, ptoPed: 80, stockNave: 350, stockPulmon: 130, lote: "L-ALA-3L-26", vto: "2028-11-01" },
  { cod: "JAB-SKI-INT", ean: "7791234500216", nom: "Jabón Líquido Skip Intelligent 3 Litros (Bidón)", provVar: "@prov_unilever", marca: "Skip", catVar: "@cat_lavado", costo: 10400, iva: 21.0, med: "UNIDAD", stockMin: 30, ptoPed: 60, stockNave: 280, stockPulmon: 90, lote: "L-SKI-3L-26", vto: "2028-11-10" },
  { cod: "CIF-CREM-750", ean: "7791234500223", nom: "Limpiador Cremoso Cif Blanco 750g (Caja x12)", provVar: "@prov_unilever", marca: "Cif", catVar: "@cat_limpieza", costo: 18900, iva: 21.0, med: "CAJA", stockMin: 20, ptoPed: 40, stockNave: 190, stockPulmon: 70, lote: "L-CIF-750-26", vto: "2028-09-15" },
  { cod: "CIF-GAT-ANT", ean: "7791234500230", nom: "Cif Gatillo Antigrasa 500ml (Caja x12)", provVar: "@prov_unilever", marca: "Cif", catVar: "@cat_limpieza", costo: 17200, iva: 21.0, med: "CAJA", stockMin: 15, ptoPed: 30, stockNave: 150, stockPulmon: 50, lote: "L-CIF-GAT-26", vto: "2028-10-05" },

  // Higiene Personal
  { cod: "DES-REX-MEN", ean: "7791234500247", nom: "Desodorante Antitranspirante Rexona Men V8 Aerosol 150ml (Caja x12)", provVar: "@prov_unilever", marca: "Rexona", catVar: "@cat_higiene", costo: 24600, iva: 21.0, med: "CAJA", stockMin: 20, ptoPed: 40, stockNave: 170, stockPulmon: 60, lote: "L-REX-V8-26", vto: "2028-06-20" },
  { cod: "JAB-DOV-ORI", ean: "7791234500254", nom: "Jabón de Tocador Dove Original 90g (Pack x3 x8u - 24 unidades)", provVar: "@prov_unilever", marca: "Dove", catVar: "@cat_higiene", costo: 21400, iva: 21.0, med: "PACK", stockMin: 15, ptoPed: 35, stockNave: 160, stockPulmon: 55, lote: "L-DOV-ORI-26", vto: "2028-08-30" },

  // Lácteos y Quesos
  { cod: "LEC-SER-ENT", ean: "7791234500261", nom: "Leche La Serenísima Entera UAT 1L (Caja x12)", provVar: "@prov_mastellone", marca: "La Serenísima", catVar: "@cat_lacteos", costo: 14800, iva: 21.0, med: "CAJA", stockMin: 50, ptoPed: 100, stockNave: 450, stockPulmon: 160, lote: "L-SER-ENT-26", vto: "2027-02-28" },
  { cod: "LEC-SER-DES", ean: "7791234500278", nom: "Leche La Serenísima Descremada UAT 1L (Caja x12)", provVar: "@prov_mastellone", marca: "La Serenísima", catVar: "@cat_lacteos", costo: 14800, iva: 21.0, med: "CAJA", stockMin: 40, ptoPed: 80, stockNave: 380, stockPulmon: 130, lote: "L-SER-DES-26", vto: "2027-02-28" },
  { cod: "DUL-SER-COL", ean: "7791234500285", nom: "Dulce de Leche Colonial La Serenísima 400g (Bandeja x12)", provVar: "@prov_mastellone", marca: "La Serenísima", catVar: "@cat_lacteos", costo: 22600, iva: 21.0, med: "CAJA", stockMin: 20, ptoPed: 40, stockNave: 190, stockPulmon: 70, lote: "L-DUL-COL-26", vto: "2027-05-10" },
  { cod: "MAN-SER-200", ean: "7791234500292", nom: "Manteca La Serenísima Calidad Extra 200g (Caja x20)", provVar: "@prov_mastellone", marca: "La Serenísima", catVar: "@cat_lacteos", costo: 34500, iva: 21.0, med: "CAJA", stockMin: 15, ptoPed: 30, stockNave: 120, stockPulmon: 45, lote: "L-MAN-200-26", vto: "2027-03-15" },
  { cod: "QUE-SER-CRE", ean: "7791234500308", nom: "Queso Cremoso La Serenísima Horma (~4 Kg)", provVar: "@prov_mastellone", marca: "La Serenísima", catVar: "@cat_lacteos", costo: 26000, iva: 21.0, med: "KILO", stockMin: 10, ptoPed: 20, stockNave: 80, stockPulmon: 30, lote: "L-QUE-CRE-26", vto: "2027-04-05" }
];

productos.forEach(p => {
  sql += `
INSERT INTO Producto (
  tenantId, codigo_articulo, codigo_barras, fecha_ingreso, nombre_producto,
  proveedorId, marcaId, categoriaId, alicuota_iva, precio_costo, descuento_proveedor,
  stock_recomendado, tipo_medicion, moneda, stock_minimo, punto_pedido, tiempo_reposicion_dias,
  createdAt, updatedAt
) SELECT
  2, '${p.cod}', '${p.ean}', NOW(), '${p.nom}',
  ${p.provVar}, (SELECT id FROM Marca WHERE tenantId = 2 AND nombre = '${p.marca}' LIMIT 1),
  ${p.catVar}, ${p.iva}, ${p.costo}, 0,
  ${p.stockNave + p.stockPulmon}, '${p.med}', 'ARS', ${p.stockMin}, ${p.ptoPed}, 5,
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${p.cod}');
`;
});

sql += `
-- 12. STOCK EN DEPÓSITOS Y LOTES (TENANT 2)
`;

productos.forEach(p => {
  sql += `
-- Stock en Depósito Central
INSERT INTO StockUbicacion (productoId, depositoId, cantidad)
SELECT id, @depo_central, ${p.stockNave} FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${p.cod}'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

-- Stock en Depósito Pulmón
INSERT INTO StockUbicacion (productoId, depositoId, cantidad)
SELECT id, @depo_pulmon, ${p.stockPulmon} FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${p.cod}'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

-- Lote WMS
INSERT INTO LoteStock (productoId, depositoId, numero_lote, fecha_vencimiento, cantidad, createdAt, updatedAt)
SELECT id, @depo_central, '${p.lote}', '${p.vto} 00:00:00', ${p.stockNave}, NOW(), NOW()
FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${p.cod}'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

-- Historial Inventario Alta Inicial
INSERT INTO HistorialInventario (tenantId, productoId, tipo_registro, stock_anterior, stock_nuevo, cantidad_agregada, precio_anterior, precio_nuevo, fecha, usuarioId)
SELECT 2, id, 'ALTA_INICIAL', 0, ${p.stockNave + p.stockPulmon}, ${p.stockNave + p.stockPulmon}, 0, ${p.costo}, NOW() - INTERVAL 15 DAY, @user_admin
FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${p.cod}'
LIMIT 1;

-- Historial Precios
INSERT INTO HistorialPrecio (tenantId, productoId, precio_costo_anterior, precio_costo_nuevo, porcentaje_cambio, motivo, fecha)
SELECT 2, id, ${Math.round(p.costo * 0.93)}, ${p.costo}, 7.5, 'Actualización lista mensual proveedor', NOW() - INTERVAL 10 DAY
FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${p.cod}'
LIMIT 1;
`;
});

sql += `
-- 13. ESCALAS DE PRECIO POR VOLUMEN (TENANT 2)
`;

const escalas = [
  { cod: "CER-QUI-473", min: 10, dto: 5.0 },
  { cod: "CER-QUI-473", min: 25, dto: 10.0 },
  { cod: "CER-BRA-473", min: 10, dto: 5.0 },
  { cod: "CER-BRA-473", min: 25, dto: 10.0 },
  { cod: "ACE-COC-15L", min: 10, dto: 6.0 },
  { cod: "ACE-COC-15L", min: 20, dto: 12.0 },
  { cod: "FID-MAT-TAL", min: 15, dto: 8.0 },
  { cod: "BON-LECH-X30", min: 10, dto: 7.0 },
  { cod: "JAB-ALA-EFE", min: 12, dto: 8.5 },
  { cod: "LEC-SER-ENT", min: 20, dto: 5.0 },
  { cod: "LEC-SER-ENT", min: 50, dto: 9.0 }
];

escalas.forEach(e => {
  sql += `
INSERT INTO ProductoEscalaPrecio (productoId, listaPrecioId, cantidad_minima, precio_unitario, descuento_porcentaje, createdAt, updatedAt)
SELECT id, @lista_mayorista, ${e.min}, NULL, ${e.dto}, NOW(), NOW()
FROM Producto WHERE tenantId = 2 AND codigo_articulo = '${e.cod}'
ON DUPLICATE KEY UPDATE descuento_porcentaje = VALUES(descuento_porcentaje);
`;
});

sql += `
-- 14. COMBOS Y PROMOCIONES (TENANT 2)
INSERT INTO Combo (tenantId, nombre, descripcion, precio_combo, descuento_porcentaje, activo, createdAt, updatedAt)
SELECT 2, 'Promo Fin de Semana: Cerveza + Alfajores', 'Pack 2 Cervezas Quilmes x24 + 1 Caja Terrabusi Torta x24', 68000, 8.5, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Combo WHERE tenantId = 2 AND nombre = 'Promo Fin de Semana: Cerveza + Alfajores');

INSERT INTO Combo (tenantId, nombre, descripcion, precio_combo, descuento_porcentaje, activo, createdAt, updatedAt)
SELECT 2, 'Combo Almacén Básico Comercio', '2 Cajas Aceite Cocinero 1.5L + 2 Fardos Fideos Matarazzo Tallarín', 84000, 10.0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Combo WHERE tenantId = 2 AND nombre = 'Combo Almacén Básico Comercio');

INSERT INTO Combo (tenantId, nombre, descripcion, precio_combo, descuento_porcentaje, activo, createdAt, updatedAt)
SELECT 2, 'Combo Limpieza e Higiene Hogar', '2 Bidones Ala Líquido 3L + 1 Caja Cif Blanco Cremoso', 30500, 7.0, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Combo WHERE tenantId = 2 AND nombre = 'Combo Limpieza e Higiene Hogar');

SET @combo_cerveza = (SELECT id FROM Combo WHERE tenantId = 2 AND nombre LIKE 'Promo Fin de Semana%' LIMIT 1);
SET @combo_almacen = (SELECT id FROM Combo WHERE tenantId = 2 AND nombre LIKE 'Combo Almacén Básico%' LIMIT 1);
SET @combo_limpieza = (SELECT id FROM Combo WHERE tenantId = 2 AND nombre LIKE 'Combo Limpieza%' LIMIT 1);

-- ComboItems
INSERT INTO ComboItem (comboId, productoId, cantidad)
SELECT @combo_cerveza, id, 2 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

INSERT INTO ComboItem (comboId, productoId, cantidad)
SELECT @combo_cerveza, id, 1 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ALF-TER-TOR'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

INSERT INTO ComboItem (comboId, productoId, cantidad)
SELECT @combo_almacen, id, 2 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ACE-COC-15L'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

INSERT INTO ComboItem (comboId, productoId, cantidad)
SELECT @combo_almacen, id, 2 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'FID-MAT-TAL'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

INSERT INTO ComboItem (comboId, productoId, cantidad)
SELECT @combo_limpieza, id, 2 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'JAB-ALA-EFE'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

INSERT INTO ComboItem (comboId, productoId, cantidad)
SELECT @combo_limpieza, id, 1 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CIF-CREM-750'
ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad);

-- 15. CLIENTES (TENANT 2)
`;

const clientes = [
  // Supermercados y Autoservicios
  { nom: "Supermercado Los Hermanos S.R.L.", cuit: "30-71445566-8", iva: "RESPONSABLE_INSCRIPTO", dir: "Av. Alberdi 850, Rosario", tel: "0341-4381199", comp: "FACTURA_A", cred: 3500000, listaVar: "@lista_cadenas" },
  { nom: "Autoservicio Avenida de San Martín", cuit: "30-72556677-9", iva: "RESPONSABLE_INSCRIPTO", dir: "Av. San Martín 3420, Rosario", tel: "0341-4662288", comp: "FACTURA_A", cred: 2200000, listaVar: "@lista_mayorista" },
  { nom: "La Gran Parada Autoservicio Express", cuit: "30-73667788-0", iva: "RESPONSABLE_INSCRIPTO", dir: "Pellegrini 1780, Rosario", tel: "0341-4823344", comp: "FACTURA_A", cred: 1800000, listaVar: "@lista_mayorista" },
  { nom: "Supermercado Oriental Chen", cuit: "30-74778899-1", iva: "RESPONSABLE_INSCRIPTO", dir: "Córdoba 2950, Rosario", tel: "0341-4395566", comp: "FACTURA_A", cred: 4000000, listaVar: "@lista_distribuidor" },

  // Kioscos y Maxikioscos
  { nom: "Maxikiosco 24hs San Martín", cuit: "20-33445566-7", iva: "MONOTRIBUTO", dir: "San Martín 1120, Rosario", tel: "0341-155223344", comp: "FACTURA_B", cred: 800000, listaVar: "@lista_kioscos" },
  { nom: "Kiosco El Sol de Pichincha", cuit: "27-34556677-8", iva: "MONOTRIBUTO", dir: "Alvear 240, Rosario", tel: "0341-155334455", comp: "FACTURA_B", cred: 600000, listaVar: "@lista_kioscos" },
  { nom: "Kiosco La Terminal Central", cuit: "20-31223344-5", iva: "MONOTRIBUTO", dir: "Cafferata 702, Rosario", tel: "0341-155445566", comp: "FACTURA_B", cred: 750000, listaVar: "@lista_kioscos" },
  { nom: "Maxikiosco Estación Norte", cuit: "23-35667788-4", iva: "MONOTRIBUTO", dir: "Rondeau 1410, Rosario", tel: "0341-155556677", comp: "FACTURA_B", cred: 900000, listaVar: "@lista_kioscos" },

  // Almacenes y Despensas
  { nom: "Almacén Don Tito", cuit: "20-28112233-6", iva: "MONOTRIBUTO", dir: "Mendoza 4500, Rosario", tel: "0341-4561122", comp: "FACTURA_B", cred: 950000, listaVar: "@lista_mayorista" },
  { nom: "Despensa y Fiambrería Santa Rita", cuit: "27-29334455-2", iva: "MONOTRIBUTO", dir: "Paraguay 2100, Rosario", tel: "0341-4812233", comp: "FACTURA_B", cred: 850000, listaVar: "@lista_mayorista" },
  { nom: "Minimarket Barrio Parque", cuit: "20-36778899-1", iva: "MONOTRIBUTO", dir: "27 de Febrero 3200, Rosario", tel: "0341-4328899", comp: "FACTURA_B", cred: 1100000, listaVar: "@lista_mayorista" },

  // Bares y Gastronómicos
  { nom: "Pizzería y Cervecería Popular", cuit: "30-75889900-2", iva: "RESPONSABLE_INSCRIPTO", dir: "Jujuy 2240, Rosario", tel: "0341-4491122", comp: "FACTURA_A", cred: 2500000, listaVar: "@lista_mayorista" },
  { nom: "Bar & Restó El Puente", cuit: "30-76990011-3", iva: "RESPONSABLE_INSCRIPTO", dir: "Wheelwright 1600, Rosario", tel: "0341-4482233", comp: "FACTURA_A", cred: 2800000, listaVar: "@lista_mayorista" },

  // Consumidores Finales
  { nom: "Juan Carlos Pérez", cuit: "20-25667788-3", iva: "CONSUMIDOR_FINAL", dir: "España 840 4° B, Rosario", tel: "0341-156112233", comp: "COMPROBANTE_X", cred: 150000, listaVar: "@lista_kioscos" },
  { nom: "María Laura Romero", cuit: "27-32112233-9", iva: "CONSUMIDOR_FINAL", dir: "Oroño 1150 2° A, Rosario", tel: "0341-156334455", comp: "COMPROBANTE_X", cred: 200000, listaVar: "@lista_kioscos" }
];

clientes.forEach(c => {
  sql += `
INSERT INTO Cliente (
  tenantId, nombre_razon_social, dni_cuit, condicion_iva, direccion, telefono,
  comprobante_default, limite_credito, dias_aviso_deuda, lista_default_id, createdAt, updatedAt
) SELECT
  2, '${c.nom}', '${c.cuit}', '${c.iva}', '${c.dir}', '${c.tel}',
  '${c.comp}', ${c.cred}, 30, ${c.listaVar}, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM Cliente WHERE tenantId = 2 AND dni_cuit = '${c.cuit}');
`;
});

sql += `
-- Variables de clientes para operaciones
SET @cli_hermanos = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Supermercado Los Hermanos%' LIMIT 1);
SET @cli_avenida = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Autoservicio Avenida%' LIMIT 1);
SET @cli_oriental = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Supermercado Oriental%' LIMIT 1);
SET @cli_kiosco24 = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Maxikiosco 24hs%' LIMIT 1);
SET @cli_elsol = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Kiosco El Sol%' LIMIT 1);
SET @cli_tito = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Almacén Don Tito%' LIMIT 1);
SET @cli_pizzeria = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Pizzería y Cervecería%' LIMIT 1);
SET @cli_juancarlos = (SELECT id FROM Cliente WHERE tenantId = 2 AND nombre_razon_social LIKE 'Juan Carlos Pérez%' LIMIT 1);

-- 16. CUENTAS CORRIENTES (MOVIMIENTOS CC EN TENANT 2)
INSERT INTO MovimientoCuentaCorriente (tenantId, clienteId, usuarioId, tipo, monto, descuento_pago, metodo_pago, fecha, notas)
SELECT 2, @cli_hermanos, @user_carlos, 'CARGO', 1250000, 0, 'CUENTA_CORRIENTE', NOW() - INTERVAL 12 DAY, 'Factura A #0001-00000101 (Entrega semanal bebidas y almacén)'
WHERE NOT EXISTS (SELECT 1 FROM MovimientoCuentaCorriente WHERE tenantId = 2 AND clienteId = @cli_hermanos AND monto = 1250000);

INSERT INTO MovimientoCuentaCorriente (tenantId, clienteId, usuarioId, tipo, monto, descuento_pago, metodo_pago, fecha, notas)
SELECT 2, @cli_hermanos, @user_valeria, 'ABONO', 750000, 0, 'TRANSFERENCIA', NOW() - INTERVAL 5 DAY, 'Cobro parcial transferencia Banco Macro ref #448912'
WHERE NOT EXISTS (SELECT 1 FROM MovimientoCuentaCorriente WHERE tenantId = 2 AND clienteId = @cli_hermanos AND tipo = 'ABONO' AND monto = 750000);

INSERT INTO MovimientoCuentaCorriente (tenantId, clienteId, usuarioId, tipo, monto, descuento_pago, metodo_pago, fecha, notas)
SELECT 2, @cli_avenida, @user_carlos, 'CARGO', 680000, 0, 'CUENTA_CORRIENTE', NOW() - INTERVAL 9 DAY, 'Factura A #0001-00000102 (Fardos fideos y aceites)'
WHERE NOT EXISTS (SELECT 1 FROM MovimientoCuentaCorriente WHERE tenantId = 2 AND clienteId = @cli_avenida AND monto = 680000);

INSERT INTO MovimientoCuentaCorriente (tenantId, clienteId, usuarioId, tipo, monto, descuento_pago, metodo_pago, fecha, notas)
SELECT 2, @cli_oriental, @user_lucas, 'CARGO', 2400000, 0, 'CUENTA_CORRIENTE', NOW() - INTERVAL 7 DAY, 'Factura A #0001-00000103 (Pallet completo cervezas y lácteos)'
WHERE NOT EXISTS (SELECT 1 FROM MovimientoCuentaCorriente WHERE tenantId = 2 AND clienteId = @cli_oriental AND monto = 2400000);

INSERT INTO MovimientoCuentaCorriente (tenantId, clienteId, usuarioId, tipo, monto, descuento_pago, metodo_pago, fecha, notas)
SELECT 2, @cli_oriental, @user_valeria, 'ABONO', 1000000, 0, 'CHEQUE', NOW() - INTERVAL 3 DAY, 'Entrega eCheq Santander #88120491 a 15 días'
WHERE NOT EXISTS (SELECT 1 FROM MovimientoCuentaCorriente WHERE tenantId = 2 AND clienteId = @cli_oriental AND tipo = 'ABONO' AND monto = 1000000);

INSERT INTO MovimientoCuentaCorriente (tenantId, clienteId, usuarioId, tipo, monto, descuento_pago, metodo_pago, fecha, notas)
SELECT 2, @cli_pizzeria, @user_carlos, 'CARGO', 940000, 0, 'CUENTA_CORRIENTE', NOW() - INTERVAL 4 DAY, 'Factura A #0001-00000104 (Bebidas y hormas de queso)'
WHERE NOT EXISTS (SELECT 1 FROM MovimientoCuentaCorriente WHERE tenantId = 2 AND clienteId = @cli_pizzeria AND monto = 940000);

-- 17. CAJA DIARIA Y MOVIMIENTOS (TENANT 2)
-- Caja de anteayer (cerrada)
INSERT INTO CajaDiaria (tenantId, fecha_apertura, fecha_cierre, saldo_inicial, saldo_esperado, saldo_real, diferencia, ganancia, estado, sucursalId)
SELECT 2, NOW() - INTERVAL 2 DAY, (NOW() - INTERVAL 2 DAY) + INTERVAL 9 HOUR, 100000, 680000, 680000, 0, 165000, 'CERRADA', @sucursal_central
WHERE NOT EXISTS (SELECT 1 FROM CajaDiaria WHERE tenantId = 2 AND estado = 'CERRADA' AND saldo_inicial = 100000);

-- Caja de ayer (cerrada)
INSERT INTO CajaDiaria (tenantId, fecha_apertura, fecha_cierre, saldo_inicial, saldo_esperado, saldo_real, diferencia, ganancia, estado, sucursalId)
SELECT 2, NOW() - INTERVAL 1 DAY, (NOW() - INTERVAL 1 DAY) + INTERVAL 9 HOUR, 120000, 845000, 845000, 0, 210000, 'CERRADA', @sucursal_central
WHERE NOT EXISTS (SELECT 1 FROM CajaDiaria WHERE tenantId = 2 AND estado = 'CERRADA' AND saldo_inicial = 120000);

-- Caja de hoy (ABIERTA)
INSERT INTO CajaDiaria (tenantId, fecha_apertura, saldo_inicial, estado, sucursalId)
SELECT 2, NOW() - INTERVAL 4 HOUR, 150000, 'ABIERTA', @sucursal_central
WHERE NOT EXISTS (SELECT 1 FROM CajaDiaria WHERE tenantId = 2 AND estado = 'ABIERTA');

SET @caja_hoy = (SELECT id FROM CajaDiaria WHERE tenantId = 2 AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1);

-- Movimientos en la caja de hoy
INSERT INTO MovimientoCaja (cajaId, tipo, metodo_pago, monto, descripcion, usuarioId, fecha)
VALUES
(@caja_hoy, 'APERTURA', 'CONTADO', 150000, 'Fondo de apertura caja central turno mañana', @user_valeria, NOW() - INTERVAL 4 HOUR),
(@caja_hoy, 'INGRESO_MANUAL', 'CONTADO', 35000, 'Ingreso cambio chico (billetes $500 y $1000)', @user_valeria, NOW() - INTERVAL 3 HOUR),
(@caja_hoy, 'VENTA', 'CONTADO', 98500, 'Cobro venta mostrador ticket X #1201', @user_valeria, NOW() - INTERVAL 2 HOUR),
(@caja_hoy, 'COBRO_CC', 'TRANSFERENCIA', 250000, 'Cobro cuenta corriente Almacén Don Tito', @user_valeria, NOW() - INTERVAL 1 HOUR),
(@caja_hoy, 'EGRESO_MANUAL', 'CONTADO', 12000, 'Pago refrigerios y limpieza depósito', @user_valeria, NOW() - INTERVAL 30 MINUTE);

-- 18. CARTERA DE CHEQUES Y ECHEQS (TENANT 2)
INSERT INTO Cheque (
  tenantId, numero_cheque, banco, cuit_librador, nombre_librador, monto,
  fecha_emision, fecha_cobro, tipo, origen, estado, clienteId, notas, createdAt, updatedAt
) VALUES
(2, '45812903', 'Banco Galicia', '30-71445566-8', 'Supermercado Los Hermanos S.R.L.', 500000, NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 8 DAY, 'FISICO', 'TERCERO_CLIENTE', 'EN_CARTERA', @cli_hermanos, 'Cheque a fecha pago factura CC', NOW(), NOW()),
(2, '88120491', 'Banco Santander', '30-74778899-1', 'Supermercado Oriental Chen', 1000000, NOW() - INTERVAL 3 DAY, NOW() + INTERVAL 15 DAY, 'ECHEQ', 'TERCERO_CLIENTE', 'EN_CARTERA', @cli_oriental, 'eCheq diferido 15 días lote cervezas', NOW(), NOW()),
(2, '99341022', 'Banco Macro', '30-72556677-9', 'Autoservicio Avenida San Martín', 350000, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 25 DAY, 'FISICO', 'TERCERO_CLIENTE', 'EN_CARTERA', @cli_avenida, 'Cheque pago parcial preventa', NOW(), NOW()),
(2, '12049281', 'Banco Nación', '30-75889900-2', 'Pizzería y Cervecería Popular', 480000, NOW() - INTERVAL 10 DAY, NOW() + INTERVAL 5 DAY, 'ECHEQ', 'TERCERO_CLIENTE', 'ENDOSADO_PROVEEDOR', @cli_pizzeria, 'Endosado a Cervecería Quilmes por orden compra #201', NOW(), NOW()),
(2, '33419082', 'Banco BBVA', '30-71445566-8', 'Supermercado Los Hermanos S.R.L.', 420000, NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 2 DAY, 'FISICO', 'TERCERO_CLIENTE', 'COBRADO', @cli_hermanos, 'Cobrado por ventanilla en Banco BBVA', NOW(), NOW())
ON DUPLICATE KEY UPDATE monto = VALUES(monto);

SET @cheque_galicia = (SELECT id FROM Cheque WHERE tenantId = 2 AND numero_cheque = '45812903' LIMIT 1);
SET @cheque_quilmes = (SELECT id FROM Cheque WHERE tenantId = 2 AND numero_cheque = '12049281' LIMIT 1);

-- Movimientos de cheques
INSERT INTO MovimientoCheque (chequeId, estado_origen, estado_destino, motivo, fecha)
VALUES
(@cheque_galicia, 'EN_CARTERA', 'EN_CARTERA', 'Recepción e ingreso a cartera', NOW() - INTERVAL 2 DAY),
(@cheque_quilmes, 'EN_CARTERA', 'ENDOSADO_PROVEEDOR', 'Endoso en pago a Cervecería Quilmes', NOW() - INTERVAL 6 DAY);

-- 19. PRESUPUESTOS (TENANT 2)
INSERT INTO Presupuesto (tenantId, numero, clienteId, listaPrecioId, fecha, vigencia_dias, estado, subtotal, descuento_global, total, notas, createdAt, updatedAt)
VALUES
(2, 201, @cli_hermanos, @lista_cadenas, NOW() - INTERVAL 1 DAY, 15, 'PENDIENTE', 980000, 0, 980000, 'Cotización reposición fin de mes - Pallets cervezas y lácteos', NOW(), NOW()),
(2, 202, @cli_elsol, @lista_kioscos, NOW(), 7, 'PENDIENTE', 315000, 5, 299250, 'Presupuesto combos golosinas y snacks inicio de semana', NOW(), NOW()),
(2, 203, @cli_pizzeria, @lista_mayorista, NOW() - INTERVAL 4 DAY, 15, 'CONVERTIDO', 540000, 0, 540000, 'Presupuesto convertido en Pedido #502', NOW(), NOW()),
(2, 204, @cli_tito, @lista_mayorista, NOW() - INTERVAL 20 DAY, 10, 'VENCIDO', 220000, 0, 220000, 'Presupuesto vencido sin confirmación', NOW(), NOW())
ON DUPLICATE KEY UPDATE total = VALUES(total);

SET @presu_201 = (SELECT id FROM Presupuesto WHERE tenantId = 2 AND numero = 201 LIMIT 1);
SET @presu_202 = (SELECT id FROM Presupuesto WHERE tenantId = 2 AND numero = 202 LIMIT 1);

-- Detalles presupuestos
INSERT INTO DetallePresupuesto (presupuestoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @presu_201, id, 15, 35625, 0, 35625, 534375 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

INSERT INTO DetallePresupuesto (presupuestoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @presu_201, id, 25, 18500, 0, 18500, 462500 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'LEC-SER-ENT';

INSERT INTO DetallePresupuesto (presupuestoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @presu_202, id, 10, 15390, 0, 15390, 153900 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'BON-LECH-X30';

INSERT INTO DetallePresupuesto (presupuestoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @presu_202, id, 7, 23000, 0, 23000, 161000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ALF-TER-TOR';

-- 20. PEDIDOS DE PREVENTA (TENANT 2)
INSERT INTO Pedido (
  tenantId, numero, fecha, clienteId, usuarioId, listaPrecioId, estado,
  subtotal, descuento_global, total, notas, repartidorId, metodo_pago, createdAt, updatedAt
) VALUES
(2, 501, NOW() - INTERVAL 5 HOUR, @cli_kiosco24, @user_carlos, @lista_kioscos, 'PENDIENTE', 185000, 0, 185000, 'Tomado por Preventista Carlos López en visita matutina', NULL, 'EFECTIVO', NOW(), NOW()),
(2, 502, NOW() - INTERVAL 4 HOUR, @cli_tito, @user_lucas, @lista_mayorista, 'ARMADO', 420000, 0, 420000, 'Armado en Nave A por Martín. Listo para despacho.', NULL, 'CUENTA_CORRIENTE', NOW(), NOW()),
(2, 503, NOW() - INTERVAL 3 HOUR, @cli_hermanos, @user_carlos, @lista_cadenas, 'LISTO_ENTREGA', 860000, 0, 860000, 'Asignado a Hoja de Ruta Camión 1 (Parada 1)', @user_roberto, 'TRANSFERENCIA', NOW(), NOW()),
(2, 504, NOW() - INTERVAL 3 HOUR, @cli_avenida, @user_carlos, @lista_mayorista, 'LISTO_ENTREGA', 540000, 0, 540000, 'Asignado a Hoja de Ruta Camión 1 (Parada 2)', @user_roberto, 'CHEQUE', NOW(), NOW()),
(2, 505, NOW() - INTERVAL 1 DAY, @cli_pizzeria, @user_carlos, @lista_mayorista, 'ENTREGADO', 650000, 0, 650000, 'Entregado ayer por Chofer Diego Morales. Remito firmado.', @user_diego, 'CUENTA_CORRIENTE', NOW(), NOW()),
(2, 506, NOW() - INTERVAL 2 DAY, @cli_oriental, @user_lucas, @lista_distribuidor, 'FACTURADO', 1450000, 0, 1450000, 'Factura A #0001-00000100 emitida y cobrada', @user_roberto, 'TRANSFERENCIA', NOW(), NOW())
ON DUPLICATE KEY UPDATE total = VALUES(total);

SET @ped_501 = (SELECT id FROM Pedido WHERE tenantId = 2 AND numero = 501 LIMIT 1);
SET @ped_502 = (SELECT id FROM Pedido WHERE tenantId = 2 AND numero = 502 LIMIT 1);
SET @ped_503 = (SELECT id FROM Pedido WHERE tenantId = 2 AND numero = 503 LIMIT 1);
SET @ped_504 = (SELECT id FROM Pedido WHERE tenantId = 2 AND numero = 504 LIMIT 1);
SET @ped_505 = (SELECT id FROM Pedido WHERE tenantId = 2 AND numero = 505 LIMIT 1);
SET @ped_506 = (SELECT id FROM Pedido WHERE tenantId = 2 AND numero = 506 LIMIT 1);

-- Detalles de pedidos
INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_501, id, 5, 15390, 0, 15390, 76950 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'BON-LECH-X30';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_501, id, 5, 21600, 0, 21600, 108000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ALF-TER-TOR';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_502, id, 8, 34500, 0, 34500, 276000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ACE-COC-15L';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_502, id, 6, 24000, 0, 24000, 144000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'FID-MAT-TAL';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_503, id, 15, 35625, 0, 35625, 534375 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_503, id, 18, 18500, 0, 18500, 333000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'LEC-SER-ENT';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_504, id, 12, 33500, 0, 33500, 402000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-BRA-473';

INSERT INTO DetallePedido (pedidoId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal)
SELECT @ped_504, id, 15, 9200, 0, 9200, 138000 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'GAT-MAN-500';

-- 21. LOGÍSTICA Y HOJAS DE RUTA (TENANT 2)
-- Hoja de ruta cerrada de ayer (RENDIDA)
INSERT INTO HojaDeRuta (tenantId, numero, fecha_despacho, repartidorId, vehiculo, zona, estado, km_inicial, km_final, notas, createdAt, updatedAt)
SELECT 2, 100, NOW() - INTERVAL 1 DAY, @user_diego, 'Furgón Mercedes Benz Sprinter (AD-456-XY)', 'Zona Sur / Saladillo / Tablada', 'RENDIDA', 84200, 84315, 'Reparto completado en su totalidad sin rechazos.', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM HojaDeRuta WHERE tenantId = 2 AND numero = 100);

-- Hoja de ruta de hoy (EN_RUTA)
INSERT INTO HojaDeRuta (tenantId, numero, fecha_despacho, repartidorId, vehiculo, zona, estado, km_inicial, notas, createdAt, updatedAt)
SELECT 2, 101, NOW() - INTERVAL 2 HOUR, @user_roberto, 'Camión Mercedes Benz 710 (AF-890-ZZ)', 'Ruta Centro / Pichincha / Echesortu', 'EN_RUTA', 128450, 'Salida 09:00 hs. Lleva pedidos #503 y #504.', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM HojaDeRuta WHERE tenantId = 2 AND numero = 101);

SET @hdr_100 = (SELECT id FROM HojaDeRuta WHERE tenantId = 2 AND numero = 100 LIMIT 1);
SET @hdr_101 = (SELECT id FROM HojaDeRuta WHERE tenantId = 2 AND numero = 101 LIMIT 1);

-- Detalle Hoja de Ruta 101
INSERT INTO DetalleHojaDeRuta (hojaDeRutaId, pedidoId, orden_parada, estado_entrega, monto_cobrado, createdAt, updatedAt)
VALUES
(@hdr_101, @ped_503, 1, 'PENDIENTE', 0, NOW(), NOW()),
(@hdr_101, @ped_504, 2, 'PENDIENTE', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE orden_parada = VALUES(orden_parada);

-- Rendición de Hoja de Ruta 100
INSERT INTO RendicionReparto (
  tenantId, hojaDeRutaId, cajaId, fecha,
  total_efectivo, total_cheques, total_transferencias, total_credito, total_rechazos,
  total_esperado, total_rendido, diferencia, estado, observaciones, createdAt, updatedAt
) SELECT
  2, @hdr_100, @caja_hoy, NOW() - INTERVAL 1 DAY,
  280000, 350000, 420000, 650000, 0,
  1700000, 1700000, 0, 'CONCILIADA', 'Rendición perfecta sin faltantes de dinero ni mercadería.', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM RendicionReparto WHERE tenantId = 2 AND hojaDeRutaId = @hdr_100);

SET @rendicion_100 = (SELECT id FROM RendicionReparto WHERE tenantId = 2 AND hojaDeRutaId = @hdr_100 LIMIT 1);

-- Detalle Rendición Cobro de Hoja 100
INSERT INTO DetalleRendicionCobro (rendicionId, pedidoId, metodo_pago, monto, comprobante, createdAt)
VALUES
(@rendicion_100, @ped_505, 'CUENTA_CORRIENTE', 650000, 'Remito Conformado #R-505', NOW() - INTERVAL 1 DAY),
(@rendicion_100, @ped_506, 'TRANSFERENCIA', 1050000, 'Transf Banco Galicia #TR-8812', NOW() - INTERVAL 1 DAY);

-- 22. VENTAS REALES HISTÓRICAS Y ACTIVAS (TENANT 2)
`;

const ventas = [
  { dias: 7, tipo: "FACTURA_A", pto: 1, num: 101, neto: 1033057.85, iva: 216942.15, tot: 1250000, cliVar: "@cli_hermanos", listaVar: "@lista_cadenas", pago: "CUENTA_CORRIENTE", est: "PARCIAL", sald: 500000 },
  { dias: 6, tipo: "FACTURA_A", pto: 1, num: 102, neto: 561983.47, iva: 118016.53, tot: 680000, cliVar: "@cli_avenida", listaVar: "@lista_mayorista", pago: "CUENTA_CORRIENTE", est: "PAGADO", sald: 0 },
  { dias: 5, tipo: "FACTURA_A", pto: 1, num: 103, neto: 1983471.07, iva: 416528.93, tot: 2400000, cliVar: "@cli_oriental", listaVar: "@lista_distribuidor", pago: "CHEQUE", est: "PARCIAL", sald: 1400000 },
  { dias: 4, tipo: "FACTURA_A", pto: 1, num: 104, neto: 776859.50, iva: 163140.50, tot: 940000, cliVar: "@cli_pizzeria", listaVar: "@lista_mayorista", pago: "CUENTA_CORRIENTE", est: "PENDIENTE", sald: 940000 },
  { dias: 3, tipo: "FACTURA_B", pto: 1, num: 201, neto: 231404.96, iva: 48595.04, tot: 280000, cliVar: "@cli_kiosco24", listaVar: "@lista_kioscos", pago: "CONTADO", est: "PAGADO", sald: 0 },
  { dias: 2, tipo: "FACTURA_B", pto: 1, num: 202, neto: 157024.79, iva: 32975.21, tot: 190000, cliVar: "@cli_elsol", listaVar: "@lista_kioscos", pago: "TRANSFERENCIA", est: "PAGADO", sald: 0 },
  { dias: 2, tipo: "COMPROBANTE_X", pto: 1, num: 1201, neto: 98500, iva: 0, tot: 98500, cliVar: "@cli_juancarlos", listaVar: "@lista_kioscos", pago: "CONTADO", est: "PAGADO", sald: 0 },
  { dias: 1, tipo: "FACTURA_A", pto: 1, num: 105, neto: 537190.08, iva: 112809.92, tot: 650000, cliVar: "@cli_pizzeria", listaVar: "@lista_mayorista", pago: "CUENTA_CORRIENTE", est: "PAGADO", sald: 0 },
  { dias: 0, tipo: "FACTURA_B", pto: 1, num: 203, neto: 280991.74, iva: 59008.26, tot: 340000, cliVar: "@cli_tito", listaVar: "@lista_mayorista", pago: "CONTADO", est: "PAGADO", sald: 0 }
];

ventas.forEach(v => {
  sql += `
INSERT INTO Venta (
  tenantId, fecha_emision, tipo_comprobante, punto_venta, numero_comprobante,
  cae, cae_vto, importe_neto, importe_iva, clienteId, listaPrecioId,
  metodo_pago, estado_pago, saldo_pendiente, subtotal, total,
  sucursalId, depositoOrigenId, usuarioId, createdAt, updatedAt
) VALUES (
  2, NOW() - INTERVAL ${v.dias} DAY, '${v.tipo}', ${v.pto}, ${v.num},
  '74128945632145', (NOW() - INTERVAL ${v.dias} DAY) + INTERVAL 10 DAY, ${v.neto}, ${v.iva}, ${v.cliVar}, ${v.listaVar},
  '${v.pago}', '${v.est}', ${v.sald}, ${v.tot}, ${v.tot},
  @sucursal_central, @depo_central, @user_carlos, NOW() - INTERVAL ${v.dias} DAY, NOW()
) ON DUPLICATE KEY UPDATE total = VALUES(total);
`;
});

sql += `
-- Detalles de algunas ventas representativas
SET @vta_101 = (SELECT id FROM Venta WHERE tenantId = 2 AND tipo_comprobante = 'FACTURA_A' AND numero_comprobante = 101 LIMIT 1);
SET @vta_103 = (SELECT id FROM Venta WHERE tenantId = 2 AND tipo_comprobante = 'FACTURA_A' AND numero_comprobante = 103 LIMIT 1);
SET @vta_201 = (SELECT id FROM Venta WHERE tenantId = 2 AND tipo_comprobante = 'FACTURA_B' AND numero_comprobante = 201 LIMIT 1);

INSERT INTO DetalleVenta (ventaId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal, costo_unitario)
SELECT @vta_101, id, 20, 35625, 0, 35625, 712500, 28500 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

INSERT INTO DetalleVenta (ventaId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal, costo_unitario)
SELECT @vta_101, id, 29, 18500, 0, 18500, 537500, 14800 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'LEC-SER-ENT';

INSERT INTO DetalleVenta (ventaId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal, costo_unitario)
SELECT @vta_103, id, 50, 32000, 0, 32000, 1600000, 26800 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-BRA-473';

INSERT INTO DetalleVenta (ventaId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal, costo_unitario)
SELECT @vta_103, id, 25, 32000, 0, 32000, 800000, 27600 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ACE-COC-15L';

INSERT INTO DetalleVenta (ventaId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal, costo_unitario)
SELECT @vta_201, id, 10, 15390, 0, 15390, 153900, 11400 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'BON-LECH-X30';

INSERT INTO DetalleVenta (ventaId, productoId, cantidad, precio_unitario, descuento_individual, precio_final, subtotal, costo_unitario)
SELECT @vta_201, id, 6, 21000, 0, 21000, 126100, 16800 FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ALF-TER-TOR';

-- Pagos de ventas
INSERT INTO PagoVenta (ventaId, metodo_pago, monto)
VALUES
(@vta_101, 'CUENTA_CORRIENTE', 1250000),
(@vta_103, 'CHEQUE', 1000000),
(@vta_103, 'CUENTA_CORRIENTE', 1400000),
(@vta_201, 'CONTADO', 280000);

-- 23. COMPRAS A PROVEEDORES (TENANT 2)
INSERT INTO Compra (tenantId, fecha, productoId, costo_base, costo_final, cantidad, depositoId, notas, createdAt, updatedAt)
SELECT 2, NOW() - INTERVAL 8 DAY, id, 28500, 34485, 200, @depo_central, 'Orden de Compra #OC-2026-044 - Pallet Cerveza Quilmes Latas', NOW() - INTERVAL 8 DAY, NOW()
FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

SET @compra_1 = (SELECT id FROM Compra WHERE tenantId = 2 AND notas LIKE '%OC-2026-044%' ORDER BY id DESC LIMIT 1);

INSERT INTO CompraImpuesto (compraId, nombre, porcentaje, monto)
VALUES
(@compra_1, 'IVA 21%', 21.0, 1197000),
(@compra_1, 'Percepción Ingresos Brutos Santa Fe 3%', 3.0, 171000);

INSERT INTO Compra (tenantId, fecha, productoId, costo_base, costo_final, cantidad, depositoId, notas, createdAt, updatedAt)
SELECT 2, NOW() - INTERVAL 5 DAY, id, 27600, 33396, 150, @depo_central, 'Orden de Compra #OC-2026-048 - Cajas Aceite Cocinero Molinos', NOW() - INTERVAL 5 DAY, NOW()
FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'ACE-COC-15L';

SET @compra_2 = (SELECT id FROM Compra WHERE tenantId = 2 AND notas LIKE '%OC-2026-048%' ORDER BY id DESC LIMIT 1);

INSERT INTO CompraImpuesto (compraId, nombre, porcentaje, monto)
VALUES
(@compra_2, 'IVA 21%', 21.0, 869400),
(@compra_2, 'Percepción IVA 3%', 3.0, 124200);

-- 24. LIQUIDACIÓN DE COMISIONES (TENANT 2)
INSERT INTO LiquidacionComision (tenantId, usuarioId, mes, anio, total_ventas, total_cobranzas, porcentaje_comision, monto_comision, estado, fecha_pago, notas, createdAt, updatedAt)
VALUES
(2, @user_carlos, 10, 2026, 4850000, 4200000, 5.5, 266750, 'PAGADA', NOW() - INTERVAL 12 DAY, 'Comisión Octubre 2026 liquidada y transferida', NOW(), NOW()),
(2, @user_lucas, 10, 2026, 3900000, 3500000, 5.0, 195000, 'PAGADA', NOW() - INTERVAL 12 DAY, 'Comisión Octubre 2026 liquidada y transferida', NOW(), NOW()),
(2, @user_carlos, 11, 2026, 3450000, 2800000, 5.5, 189750, 'PENDIENTE', NULL, 'Comisión acumulada en lo que va de Noviembre 2026', NOW(), NOW()),
(2, @user_lucas, 11, 2026, 2900000, 2400000, 5.0, 145000, 'PENDIENTE', NULL, 'Comisión acumulada en lo que va de Noviembre 2026', NOW(), NOW())
ON DUPLICATE KEY UPDATE total_ventas = VALUES(total_ventas);

-- 25. SECUENCIAS SINCRONIZADAS (TENANT 2)
INSERT INTO SecuenciaFactura (tenantId, tipo_comprobante, punto_venta, numero_actual)
VALUES
(2, 'FACTURA_A', 1, 105),
(2, 'FACTURA_B', 1, 203),
(2, 'COMPROBANTE_X', 1, 1201)
ON DUPLICATE KEY UPDATE numero_actual = VALUES(numero_actual);

INSERT INTO SecuenciaPedido (tenantId, numero_actual)
VALUES (2, 506)
ON DUPLICATE KEY UPDATE numero_actual = VALUES(numero_actual);

INSERT INTO SecuenciaPresupuesto (tenantId, numero_actual)
VALUES (2, 204)
ON DUPLICATE KEY UPDATE numero_actual = VALUES(numero_actual);

INSERT INTO SecuenciaHojaDeRuta (tenantId, numero_actual)
VALUES (2, 101)
ON DUPLICATE KEY UPDATE numero_actual = VALUES(numero_actual);

-- 26. MOVIMIENTOS DE STOCK REPRESENTATIVOS (TENANT 2)
INSERT INTO MovimientoStock (tenantId, productoId, depositoOrigenId, depositoDestinoId, cantidad, tipo, motivo, usuarioId, fecha)
SELECT 2, id, NULL, @depo_central, 200, 'INGRESO_COMPRA', 'Ingreso por compra #OC-2026-044', @user_admin, NOW() - INTERVAL 8 DAY
FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

INSERT INTO MovimientoStock (tenantId, productoId, depositoOrigenId, depositoDestinoId, cantidad, tipo, motivo, usuarioId, fecha)
SELECT 2, id, @depo_central, @depo_pulmon, 40, 'TRANSFERENCIA', 'Reabastecimiento depósito pulmón picking', @user_admin, NOW() - INTERVAL 3 DAY
FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

INSERT INTO MovimientoStock (tenantId, productoId, depositoOrigenId, depositoDestinoId, cantidad, tipo, motivo, usuarioId, fecha)
SELECT 2, id, @depo_central, NULL, 20, 'VENTA', 'Venta remito Factura A #101', @user_carlos, NOW() - INTERVAL 7 DAY
FROM Producto WHERE tenantId = 2 AND codigo_articulo = 'CER-QUI-473';

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'SEED MASIVO DE TENDECOSIS (TENANT 2) EJECUTADO CON ÉXITO' AS estado;
`;

const outputPath = path.join(__dirname, 'seed_tendecosis_production.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`✅ Archivo generado exitosamente en: ${outputPath} (${(sql.length / 1024).toFixed(1)} KB)`);
