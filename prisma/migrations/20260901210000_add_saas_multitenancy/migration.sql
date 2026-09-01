-- DropForeignKey
ALTER TABLE `Marca` DROP FOREIGN KEY `Marca_proveedorId_fkey`;

-- DropIndex
DROP INDEX `Cliente_dni_cuit_key` ON `Cliente`;

-- DropIndex
DROP INDEX `ListaPrecio_nombre_key` ON `ListaPrecio`;

-- DropIndex
DROP INDEX `Marca_nombre_proveedorId_key` ON `Marca`;

-- DropIndex
DROP INDEX `Marca_proveedorId_fkey` ON `Marca`;

-- DropIndex
DROP INDEX `Pedido_numero_key` ON `Pedido`;

-- DropIndex
DROP INDEX `Presupuesto_numero_key` ON `Presupuesto`;

-- DropIndex
DROP INDEX `Producto_codigo_articulo_key` ON `Producto`;

-- DropIndex
DROP INDEX `Proveedor_nombre_key` ON `Proveedor`;

-- DropIndex
DROP INDEX `SecuenciaFactura_tipo_comprobante_key` ON `SecuenciaFactura`;

-- DropIndex
DROP INDEX `Sucursal_nombre_key` ON `Sucursal`;

-- DropIndex
DROP INDEX `Usuario_username_key` ON `Usuario`;

-- DropIndex
DROP INDEX `Venta_tipo_comprobante_punto_venta_numero_comprobante_key` ON `Venta`;

-- AlterTable
ALTER TABLE `CajaDiaria` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Categoria` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Cliente` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Combo` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Compra` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Deposito` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `DetalleVenta` ADD COLUMN `costo_unitario` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `EmpresaConfig` ADD COLUMN `aplicar_iva_en_precios` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `tenantId` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `razon_social` VARCHAR(191) NOT NULL DEFAULT 'Mi Empresa',
    MODIFY `nombre_fantasia` VARCHAR(191) NOT NULL DEFAULT 'Distribuidora',
    MODIFY `inicio_actividad` VARCHAR(191) NOT NULL DEFAULT '01/01/2026',
    MODIFY `direccion` VARCHAR(191) NOT NULL DEFAULT 'Dirección Comercial',
    MODIFY `telefono` VARCHAR(191) NOT NULL DEFAULT '0000-0000',
    MODIFY `redes_sociales` VARCHAR(191) NOT NULL DEFAULT '@empresa',
    MODIFY `logo_url` TEXT NULL;

-- AlterTable
ALTER TABLE `HistorialInventario` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `HistorialPrecio` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `ListaPrecio` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Marca` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `MovimientoCaja` MODIFY `tipo` ENUM('APERTURA', 'INGRESO_MANUAL', 'EGRESO_MANUAL', 'VENTA', 'COBRO_CC', 'RENDICION_REPARTO') NOT NULL,
    MODIFY `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR', 'CHEQUE') NULL;

-- AlterTable
ALTER TABLE `MovimientoCuentaCorriente` ADD COLUMN `tenantId` INTEGER NOT NULL,
    MODIFY `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR', 'CHEQUE') NOT NULL DEFAULT 'CONTADO';

-- AlterTable
ALTER TABLE `MovimientoStock` ADD COLUMN `tenantId` INTEGER NOT NULL,
    MODIFY `tipo` ENUM('ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE', 'VENTA', 'DEVOLUCION', 'INGRESO_COMPRA', 'REINGRESO_RECHAZO_REPARTO') NOT NULL;

-- AlterTable
ALTER TABLE `PagoVenta` MODIFY `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR', 'CHEQUE') NOT NULL;

-- AlterTable
ALTER TABLE `Pedido` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Presupuesto` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Producto` ADD COLUMN `punto_pedido` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `stock_minimo` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `tenantId` INTEGER NOT NULL,
    ADD COLUMN `tiempo_reposicion_dias` INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE `Proveedor` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `SecuenciaFactura` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Sucursal` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `telefono` VARCHAR(191) NULL,
    ADD COLUMN `tenantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Venta` ADD COLUMN `tenantId` INTEGER NOT NULL,
    MODIFY `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR', 'CHEQUE') NOT NULL DEFAULT 'CONTADO';

-- CreateTable
CREATE TABLE `SuperAdmin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SuperAdmin_username_key`(`username`),
    UNIQUE INDEX `SuperAdmin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `precio_mensual` DOUBLE NOT NULL DEFAULT 0,
    `limite_usuarios` INTEGER NOT NULL DEFAULT 5,
    `limite_sucursales` INTEGER NOT NULL DEFAULT 1,
    `limite_depositos` INTEGER NOT NULL DEFAULT 2,
    `modulos` TEXT NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cuit` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `dominio_personalizado` VARCHAR(191) NULL,
    `logo_url` TEXT NULL,
    `estado` ENUM('ACTIVO', 'PRUEBA', 'SUSPENDIDO', 'CANCELADO') NOT NULL DEFAULT 'ACTIVO',
    `planId` INTEGER NOT NULL,
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_vencimiento` DATETIME(3) NULL,
    `modulos_override` TEXT NULL,
    `configuracion_json` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    UNIQUE INDEX `Tenant_dominio_personalizado_key`(`dominio_personalizado`),
    INDEX `Tenant_slug_idx`(`slug`),
    INDEX `Tenant_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuscripcionSaaS` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `monto` DOUBLE NOT NULL,
    `metodo_pago` VARCHAR(191) NULL DEFAULT 'TRANSFERENCIA',
    `estado` ENUM('PAGADA', 'PENDIENTE', 'VENCIDA', 'CANCELADA') NOT NULL DEFAULT 'PAGADA',
    `periodo_mes` INTEGER NOT NULL,
    `periodo_anio` INTEGER NOT NULL,
    `fecha_pago` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_vencimiento` DATETIME(3) NOT NULL,
    `referencia_pago` VARCHAR(191) NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SuscripcionSaaS_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecuenciaPedido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `numero_actual` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SecuenciaPedido_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecuenciaPresupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `numero_actual` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SecuenciaPresupuesto_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecuenciaHojaDeRuta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `numero_actual` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SecuenciaHojaDeRuta_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HojaDeRuta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `fecha_despacho` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `repartidorId` INTEGER NOT NULL,
    `vehiculo` VARCHAR(191) NULL,
    `zona` VARCHAR(191) NULL,
    `estado` ENUM('BORRADOR', 'EN_PREPARACION', 'EN_RUTA', 'RENDIDA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
    `km_inicial` DOUBLE NULL,
    `km_final` DOUBLE NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HojaDeRuta_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `HojaDeRuta_tenantId_numero_key`(`tenantId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleHojaDeRuta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hojaDeRutaId` INTEGER NOT NULL,
    `pedidoId` INTEGER NOT NULL,
    `orden_parada` INTEGER NOT NULL DEFAULT 1,
    `estado_entrega` ENUM('PENDIENTE', 'ENTREGADO', 'RECHAZADO_TOTAL', 'ENTREGA_PARCIAL') NOT NULL DEFAULT 'PENDIENTE',
    `motivo_rechazo` TEXT NULL,
    `monto_cobrado` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DetalleHojaDeRuta_hojaDeRutaId_pedidoId_key`(`hojaDeRutaId`, `pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RendicionReparto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `hojaDeRutaId` INTEGER NOT NULL,
    `cajaId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_efectivo` DOUBLE NOT NULL DEFAULT 0,
    `total_cheques` DOUBLE NOT NULL DEFAULT 0,
    `total_transferencias` DOUBLE NOT NULL DEFAULT 0,
    `total_credito` DOUBLE NOT NULL DEFAULT 0,
    `total_rechazos` DOUBLE NOT NULL DEFAULT 0,
    `total_esperado` DOUBLE NOT NULL DEFAULT 0,
    `total_rendido` DOUBLE NOT NULL DEFAULT 0,
    `diferencia` DOUBLE NOT NULL DEFAULT 0,
    `estado` ENUM('PENDIENTE', 'CONCILIADA', 'CON_DIFERENCIA') NOT NULL DEFAULT 'CONCILIADA',
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RendicionReparto_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleRendicionCobro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rendicionId` INTEGER NOT NULL,
    `pedidoId` INTEGER NOT NULL,
    `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR', 'CHEQUE') NOT NULL,
    `monto` DOUBLE NOT NULL,
    `comprobante` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cheque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `numero_cheque` VARCHAR(191) NOT NULL,
    `banco` VARCHAR(191) NOT NULL,
    `cuit_librador` VARCHAR(191) NULL,
    `nombre_librador` VARCHAR(191) NULL,
    `monto` DOUBLE NOT NULL,
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_cobro` DATETIME(3) NOT NULL,
    `tipo` ENUM('FISICO', 'ECHEQ') NOT NULL DEFAULT 'FISICO',
    `origen` ENUM('TERCERO_CLIENTE', 'PROPIO') NOT NULL DEFAULT 'TERCERO_CLIENTE',
    `estado` ENUM('EN_CARTERA', 'DEPOSITADO', 'ENDOSADO_PROVEEDOR', 'COBRADO', 'RECHAZADO', 'ANULADO') NOT NULL DEFAULT 'EN_CARTERA',
    `clienteId` INTEGER NULL,
    `ventaId` INTEGER NULL,
    `movimientoCcId` INTEGER NULL,
    `rendicionId` INTEGER NULL,
    `proveedorId` INTEGER NULL,
    `notas` TEXT NULL,
    `motivo_rechazo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cheque_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoCheque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chequeId` INTEGER NOT NULL,
    `estado_origen` ENUM('EN_CARTERA', 'DEPOSITADO', 'ENDOSADO_PROVEEDOR', 'COBRADO', 'RECHAZADO', 'ANULADO') NOT NULL,
    `estado_destino` ENUM('EN_CARTERA', 'DEPOSITADO', 'ENDOSADO_PROVEEDOR', 'COBRADO', 'RECHAZADO', 'ANULADO') NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductoEscalaPrecio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NULL,
    `cantidad_minima` DOUBLE NOT NULL,
    `precio_unitario` DOUBLE NULL,
    `descuento_porcentaje` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductoEscalaPrecio_productoId_listaPrecioId_cantidad_minim_key`(`productoId`, `listaPrecioId`, `cantidad_minima`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LiquidacionComision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `total_ventas` DOUBLE NOT NULL DEFAULT 0,
    `total_cobranzas` DOUBLE NOT NULL DEFAULT 0,
    `porcentaje_comision` DOUBLE NOT NULL DEFAULT 0,
    `monto_comision` DOUBLE NOT NULL DEFAULT 0,
    `estado` ENUM('PENDIENTE', 'PAGADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `fecha_pago` DATETIME(3) NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LiquidacionComision_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoteStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `depositoId` INTEGER NOT NULL,
    `numero_lote` VARCHAR(191) NOT NULL,
    `fecha_vencimiento` DATETIME(3) NOT NULL,
    `cantidad` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LoteStock_productoId_depositoId_numero_lote_key`(`productoId`, `depositoId`, `numero_lote`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CajaDiaria_tenantId_idx` ON `CajaDiaria`(`tenantId`);

-- CreateIndex
CREATE INDEX `Categoria_tenantId_idx` ON `Categoria`(`tenantId`);

-- CreateIndex
CREATE INDEX `Cliente_tenantId_idx` ON `Cliente`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Cliente_tenantId_dni_cuit_key` ON `Cliente`(`tenantId`, `dni_cuit`);

-- CreateIndex
CREATE INDEX `Combo_tenantId_idx` ON `Combo`(`tenantId`);

-- CreateIndex
CREATE INDEX `Compra_tenantId_idx` ON `Compra`(`tenantId`);

-- CreateIndex
CREATE INDEX `Deposito_tenantId_idx` ON `Deposito`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `EmpresaConfig_tenantId_key` ON `EmpresaConfig`(`tenantId`);

-- CreateIndex
CREATE INDEX `HistorialInventario_tenantId_idx` ON `HistorialInventario`(`tenantId`);

-- CreateIndex
CREATE INDEX `HistorialPrecio_tenantId_idx` ON `HistorialPrecio`(`tenantId`);

-- CreateIndex
CREATE INDEX `ListaPrecio_tenantId_idx` ON `ListaPrecio`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `ListaPrecio_tenantId_nombre_key` ON `ListaPrecio`(`tenantId`, `nombre`);

-- CreateIndex
CREATE INDEX `Marca_tenantId_idx` ON `Marca`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Marca_tenantId_nombre_proveedorId_key` ON `Marca`(`tenantId`, `nombre`, `proveedorId`);

-- CreateIndex
CREATE INDEX `MovimientoCuentaCorriente_tenantId_idx` ON `MovimientoCuentaCorriente`(`tenantId`);

-- CreateIndex
CREATE INDEX `MovimientoStock_tenantId_idx` ON `MovimientoStock`(`tenantId`);

-- CreateIndex
CREATE INDEX `Pedido_tenantId_idx` ON `Pedido`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Pedido_tenantId_numero_key` ON `Pedido`(`tenantId`, `numero`);

-- CreateIndex
CREATE INDEX `Presupuesto_tenantId_idx` ON `Presupuesto`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Presupuesto_tenantId_numero_key` ON `Presupuesto`(`tenantId`, `numero`);

-- CreateIndex
CREATE INDEX `Producto_tenantId_idx` ON `Producto`(`tenantId`);

-- CreateIndex
CREATE INDEX `Producto_codigo_barras_idx` ON `Producto`(`codigo_barras`);

-- CreateIndex
CREATE UNIQUE INDEX `Producto_tenantId_codigo_articulo_key` ON `Producto`(`tenantId`, `codigo_articulo`);

-- CreateIndex
CREATE INDEX `Proveedor_tenantId_idx` ON `Proveedor`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Proveedor_tenantId_nombre_key` ON `Proveedor`(`tenantId`, `nombre`);

-- CreateIndex
CREATE INDEX `SecuenciaFactura_tenantId_idx` ON `SecuenciaFactura`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `SecuenciaFactura_tenantId_tipo_comprobante_key` ON `SecuenciaFactura`(`tenantId`, `tipo_comprobante`);

-- CreateIndex
CREATE INDEX `Sucursal_tenantId_idx` ON `Sucursal`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Sucursal_tenantId_nombre_key` ON `Sucursal`(`tenantId`, `nombre`);

-- CreateIndex
CREATE INDEX `Usuario_tenantId_idx` ON `Usuario`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_tenantId_username_key` ON `Usuario`(`tenantId`, `username`);

-- CreateIndex
CREATE INDEX `Venta_tenantId_idx` ON `Venta`(`tenantId`);

-- CreateIndex
CREATE UNIQUE INDEX `Venta_tenantId_tipo_comprobante_punto_venta_numero_comproban_key` ON `Venta`(`tenantId`, `tipo_comprobante`, `punto_venta`, `numero_comprobante`);

-- AddForeignKey
ALTER TABLE `Tenant` ADD CONSTRAINT `Tenant_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionSaaS` ADD CONSTRAINT `SuscripcionSaaS_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionSaaS` ADD CONSTRAINT `SuscripcionSaaS_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmpresaConfig` ADD CONSTRAINT `EmpresaConfig_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sucursal` ADD CONSTRAINT `Sucursal_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposito` ADD CONSTRAINT `Deposito_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Proveedor` ADD CONSTRAINT `Proveedor_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Marca` ADD CONSTRAINT `Marca_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Marca` ADD CONSTRAINT `Marca_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Categoria` ADD CONSTRAINT `Categoria_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaPrecio` ADD CONSTRAINT `ListaPrecio_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cliente` ADD CONSTRAINT `Cliente_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecuenciaFactura` ADD CONSTRAINT `SecuenciaFactura_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecuenciaPedido` ADD CONSTRAINT `SecuenciaPedido_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecuenciaPresupuesto` ADD CONSTRAINT `SecuenciaPresupuesto_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecuenciaHojaDeRuta` ADD CONSTRAINT `SecuenciaHojaDeRuta_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCuentaCorriente` ADD CONSTRAINT `MovimientoCuentaCorriente_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Presupuesto` ADD CONSTRAINT `Presupuesto_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CajaDiaria` ADD CONSTRAINT `CajaDiaria_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialInventario` ADD CONSTRAINT `HistorialInventario_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialPrecio` ADD CONSTRAINT `HistorialPrecio_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Combo` ADD CONSTRAINT `Combo_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaDeRuta` ADD CONSTRAINT `HojaDeRuta_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HojaDeRuta` ADD CONSTRAINT `HojaDeRuta_repartidorId_fkey` FOREIGN KEY (`repartidorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleHojaDeRuta` ADD CONSTRAINT `DetalleHojaDeRuta_hojaDeRutaId_fkey` FOREIGN KEY (`hojaDeRutaId`) REFERENCES `HojaDeRuta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleHojaDeRuta` ADD CONSTRAINT `DetalleHojaDeRuta_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RendicionReparto` ADD CONSTRAINT `RendicionReparto_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RendicionReparto` ADD CONSTRAINT `RendicionReparto_hojaDeRutaId_fkey` FOREIGN KEY (`hojaDeRutaId`) REFERENCES `HojaDeRuta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RendicionReparto` ADD CONSTRAINT `RendicionReparto_cajaId_fkey` FOREIGN KEY (`cajaId`) REFERENCES `CajaDiaria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleRendicionCobro` ADD CONSTRAINT `DetalleRendicionCobro_rendicionId_fkey` FOREIGN KEY (`rendicionId`) REFERENCES `RendicionReparto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleRendicionCobro` ADD CONSTRAINT `DetalleRendicionCobro_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_movimientoCcId_fkey` FOREIGN KEY (`movimientoCcId`) REFERENCES `MovimientoCuentaCorriente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_rendicionId_fkey` FOREIGN KEY (`rendicionId`) REFERENCES `RendicionReparto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCheque` ADD CONSTRAINT `MovimientoCheque_chequeId_fkey` FOREIGN KEY (`chequeId`) REFERENCES `Cheque`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoEscalaPrecio` ADD CONSTRAINT `ProductoEscalaPrecio_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoEscalaPrecio` ADD CONSTRAINT `ProductoEscalaPrecio_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LiquidacionComision` ADD CONSTRAINT `LiquidacionComision_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LiquidacionComision` ADD CONSTRAINT `LiquidacionComision_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoteStock` ADD CONSTRAINT `LoteStock_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoteStock` ADD CONSTRAINT `LoteStock_depositoId_fkey` FOREIGN KEY (`depositoId`) REFERENCES `Deposito`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `DetallePedido` RENAME INDEX `DetallePedido_productoId_fkey` TO `DetallePedido_productoId_idx`;

