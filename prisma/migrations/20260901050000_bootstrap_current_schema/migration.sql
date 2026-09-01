-- DropForeignKey
ALTER TABLE `ListaPrecio` DROP FOREIGN KEY `ListaPrecio_productoId_fkey`;

-- DropIndex
DROP INDEX `ListaPrecio_productoId_fkey` ON `ListaPrecio`;

-- DropIndex
DROP INDEX `Producto_codigo_barras_key` ON `Producto`;

-- AlterTable
ALTER TABLE `ListaPrecio` DROP COLUMN `nombre_lista`,
    DROP COLUMN `porcentaje_marcacion`,
    DROP COLUMN `precio_final`,
    DROP COLUMN `productoId`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `margen_defecto` DOUBLE NOT NULL,
    ADD COLUMN `nombre` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `Producto` DROP COLUMN `stock_actual`,
    ADD COLUMN `categoriaId` INTEGER NULL,
    ADD COLUMN `imagen_url` TEXT NULL,
    ADD COLUMN `marcaId` INTEGER NULL,
    MODIFY `codigo_barras` VARCHAR(191) NOT NULL DEFAULT '0',
    MODIFY `alicuota_iva` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `stock_recomendado` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `tipo_medicion` ENUM('UNIDAD', 'KILO', 'LITRO', 'METROS', 'CAJA', 'PACK') NOT NULL DEFAULT 'UNIDAD';

-- AlterTable
ALTER TABLE `Proveedor` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `aumento_porcentaje` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `cuit` VARCHAR(191) NULL,
    ADD COLUMN `direccion` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `notas` VARCHAR(191) NULL,
    ADD COLUMN `telefono` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Marca` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `proveedorId` INTEGER NOT NULL,
    `aumento_porcentaje` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Marca_nombre_proveedorId_key`(`nombre`, `proveedorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `marcaId` INTEGER NULL,
    `aumento_porcentaje` DOUBLE NOT NULL DEFAULT 0,
    `limite_desc_categoria` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductoListaPrecio` (
    `productoId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NOT NULL,
    `margen_personalizado` DOUBLE NULL,

    PRIMARY KEY (`productoId`, `listaPrecioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProveedorListaPrecio` (
    `proveedorId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NOT NULL,
    `margen_personalizado` DOUBLE NULL,
    `descuento_personalizado` DOUBLE NULL,

    PRIMARY KEY (`proveedorId`, `listaPrecioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_razon_social` VARCHAR(191) NOT NULL,
    `dni_cuit` VARCHAR(191) NULL,
    `condicion_iva` VARCHAR(191) NOT NULL DEFAULT 'CONSUMIDOR_FINAL',
    `direccion` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `comentarios` TEXT NULL,
    `comprobante_default` VARCHAR(191) NOT NULL DEFAULT 'COMPROBANTE_X',
    `limite_credito` DOUBLE NULL,
    `dias_aviso_deuda` INTEGER NOT NULL DEFAULT 30,
    `limite_desc_cliente` DOUBLE NULL,
    `lista_default_id` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Cliente_dni_cuit_key`(`dni_cuit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClienteListaPrecio` (
    `clienteId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NOT NULL,

    PRIMARY KEY (`clienteId`, `listaPrecioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecuenciaFactura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_comprobante` VARCHAR(191) NOT NULL,
    `punto_venta` INTEGER NOT NULL DEFAULT 1,
    `numero_actual` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SecuenciaFactura_tipo_comprobante_key`(`tipo_comprobante`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo_comprobante` VARCHAR(191) NOT NULL DEFAULT 'COMPROBANTE_X',
    `punto_venta` INTEGER NOT NULL,
    `numero_comprobante` INTEGER NOT NULL,
    `cae` VARCHAR(191) NULL,
    `cae_vto` DATETIME(3) NULL,
    `importe_neto` DOUBLE NOT NULL DEFAULT 0,
    `importe_iva` DOUBLE NOT NULL DEFAULT 0,
    `clienteId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NOT NULL,
    `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR') NOT NULL DEFAULT 'CONTADO',
    `estado_pago` ENUM('PAGADO', 'PENDIENTE', 'PARCIAL') NOT NULL DEFAULT 'PAGADO',
    `saldo_pendiente` DOUBLE NOT NULL DEFAULT 0,
    `fecha_vencimiento_cc` DATETIME(3) NULL,
    `requiere_envio` BOOLEAN NOT NULL DEFAULT false,
    `direccion_envio` VARCHAR(191) NULL,
    `notas_venta` TEXT NULL,
    `comentario_venta` TEXT NULL,
    `subtotal` DOUBLE NOT NULL,
    `descuento_global` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `presupuestoOrigenId` INTEGER NULL,
    `sucursalId` INTEGER NULL,
    `depositoOrigenId` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Venta_tipo_comprobante_punto_venta_numero_comprobante_key`(`tipo_comprobante`, `punto_venta`, `numero_comprobante`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleVenta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ventaId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `precio_unitario` DOUBLE NOT NULL,
    `descuento_individual` DOUBLE NOT NULL DEFAULT 0,
    `precio_final` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `cantidad_devuelta` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PagoVenta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ventaId` INTEGER NOT NULL,
    `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR') NOT NULL,
    `monto` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoCuentaCorriente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `ventaId` INTEGER NULL,
    `usuarioId` INTEGER NULL,
    `tipo` ENUM('CARGO', 'ABONO') NOT NULL,
    `monto` DOUBLE NOT NULL,
    `descuento_pago` DOUBLE NOT NULL DEFAULT 0,
    `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR') NOT NULL DEFAULT 'CONTADO',
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notas` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Presupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `vigencia_dias` INTEGER NOT NULL DEFAULT 15,
    `estado` ENUM('PENDIENTE', 'CONVERTIDO', 'VENCIDO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `subtotal` DOUBLE NOT NULL,
    `descuento_global` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Presupuesto_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetallePresupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuestoId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `precio_unitario` DOUBLE NOT NULL,
    `descuento_individual` DOUBLE NOT NULL DEFAULT 0,
    `precio_final` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistorialInventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `tipo_registro` VARCHAR(191) NOT NULL,
    `stock_anterior` DOUBLE NOT NULL,
    `stock_nuevo` DOUBLE NOT NULL,
    `cantidad_agregada` DOUBLE NOT NULL,
    `precio_anterior` DOUBLE NOT NULL,
    `precio_nuevo` DOUBLE NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CajaDiaria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_apertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_cierre` DATETIME(3) NULL,
    `saldo_inicial` DOUBLE NOT NULL,
    `saldo_esperado` DOUBLE NULL,
    `saldo_real` DOUBLE NULL,
    `diferencia` DOUBLE NULL,
    `ganancia` DOUBLE NULL,
    `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
    `sucursalId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoCaja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cajaId` INTEGER NOT NULL,
    `tipo` ENUM('APERTURA', 'INGRESO_MANUAL', 'EGRESO_MANUAL', 'VENTA', 'COBRO_CC') NOT NULL,
    `metodo_pago` ENUM('CONTADO', 'CUENTA_CORRIENTE', 'TARJETA', 'TRANSFERENCIA', 'SALDO_A_FAVOR') NULL,
    `monto` DOUBLE NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `ventaId` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmpresaConfig` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `razon_social` VARCHAR(191) NOT NULL DEFAULT 'TENDENCO PINTURAS',
    `nombre_fantasia` VARCHAR(191) NOT NULL DEFAULT 'Tendeco',
    `cuit` VARCHAR(191) NOT NULL DEFAULT '00-00000000-0',
    `inicio_actividad` VARCHAR(191) NOT NULL DEFAULT '01/01/2024',
    `condicion_iva` VARCHAR(191) NOT NULL DEFAULT 'Responsable Inscripto',
    `punto_venta` INTEGER NOT NULL DEFAULT 1,
    `modo_produccion_afip` BOOLEAN NOT NULL DEFAULT false,
    `cuit_facturacion` VARCHAR(191) NULL,
    `certificado_crt` TEXT NULL,
    `clave_privada` TEXT NULL,
    `direccion` VARCHAR(191) NOT NULL DEFAULT 'San Pedro, Buenos Aires',
    `telefono` VARCHAR(191) NOT NULL DEFAULT '11-0000-0000',
    `redes_sociales` VARCHAR(191) NOT NULL DEFAULT '@tendeco.pinturas',
    `logo_url` VARCHAR(191) NULL,
    `comision_base_global` DOUBLE NOT NULL DEFAULT 5,
    `penalizacion_global` DOUBLE NOT NULL DEFAULT 2,
    `limite_desc_global` DOUBLE NOT NULL DEFAULT 10,
    `redondear_a_cinco` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rol` VARCHAR(191) NOT NULL DEFAULT 'CAJERO',
    `permisos` VARCHAR(191) NOT NULL DEFAULT '["VENTAS", "CLIENTES"]',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `comision_personalizada` DOUBLE NULL,
    `limite_desc_vendedor` DOUBLE NULL,
    `sucursalId` INTEGER NULL,

    UNIQUE INDEX `Usuario_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistorialPrecio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `precio_costo_anterior` DOUBLE NOT NULL,
    `precio_costo_nuevo` DOUBLE NOT NULL,
    `porcentaje_cambio` DOUBLE NOT NULL DEFAULT 0,
    `motivo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Sucursal_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Deposito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `sucursalId` INTEGER NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockUbicacion` (
    `productoId` INTEGER NOT NULL,
    `depositoId` INTEGER NOT NULL,
    `cantidad` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`productoId`, `depositoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `depositoOrigenId` INTEGER NULL,
    `depositoDestinoId` INTEGER NULL,
    `cantidad` DOUBLE NOT NULL,
    `tipo` ENUM('ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE', 'VENTA', 'DEVOLUCION', 'INGRESO_COMPRA') NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `usuarioId` INTEGER NULL,
    `ventaId` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clienteId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `listaPrecioId` INTEGER NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'ARMADO', 'LISTO_ENTREGA', 'ENTREGADO', 'NO_ENTREGADO', 'RECHAZADO', 'FACTURADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `subtotal` DOUBLE NOT NULL,
    `descuento_global` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `notas` TEXT NULL,
    `repartidorId` INTEGER NULL,
    `fecha_entrega` DATETIME(3) NULL,
    `motivo_no_entrega` TEXT NULL,
    `comprobante_entrega_url` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `metodo_pago` VARCHAR(191) NOT NULL DEFAULT 'EFECTIVO',
    `monto_abonado` DOUBLE NULL,
    `ventaId` INTEGER NULL,

    UNIQUE INDEX `Pedido_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetallePedido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pedidoId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `precio_unitario` DOUBLE NOT NULL,
    `descuento_individual` DOUBLE NOT NULL DEFAULT 0,
    `precio_final` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `combo_nombre` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Combo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `precio_combo` DOUBLE NOT NULL,
    `descuento_porcentaje` DOUBLE NULL,
    `imagen_url` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComboItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comboId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` DOUBLE NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Compra` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `productoId` INTEGER NOT NULL,
    `costo_base` DOUBLE NOT NULL,
    `costo_final` DOUBLE NOT NULL,
    `cantidad` DOUBLE NOT NULL DEFAULT 0,
    `depositoId` INTEGER NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompraImpuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `compraId` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `porcentaje` DOUBLE NULL,
    `monto` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ListaPrecio_nombre_key` ON `ListaPrecio`(`nombre`);

-- AddForeignKey
ALTER TABLE `Marca` ADD CONSTRAINT `Marca_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Categoria` ADD CONSTRAINT `Categoria_marcaId_fkey` FOREIGN KEY (`marcaId`) REFERENCES `Marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_marcaId_fkey` FOREIGN KEY (`marcaId`) REFERENCES `Marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `Categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoListaPrecio` ADD CONSTRAINT `ProductoListaPrecio_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoListaPrecio` ADD CONSTRAINT `ProductoListaPrecio_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProveedorListaPrecio` ADD CONSTRAINT `ProveedorListaPrecio_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProveedorListaPrecio` ADD CONSTRAINT `ProveedorListaPrecio_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cliente` ADD CONSTRAINT `Cliente_lista_default_id_fkey` FOREIGN KEY (`lista_default_id`) REFERENCES `ListaPrecio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClienteListaPrecio` ADD CONSTRAINT `ClienteListaPrecio_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClienteListaPrecio` ADD CONSTRAINT `ClienteListaPrecio_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_depositoOrigenId_fkey` FOREIGN KEY (`depositoOrigenId`) REFERENCES `Deposito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleVenta` ADD CONSTRAINT `DetalleVenta_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleVenta` ADD CONSTRAINT `DetalleVenta_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagoVenta` ADD CONSTRAINT `PagoVenta_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCuentaCorriente` ADD CONSTRAINT `MovimientoCuentaCorriente_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCuentaCorriente` ADD CONSTRAINT `MovimientoCuentaCorriente_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCuentaCorriente` ADD CONSTRAINT `MovimientoCuentaCorriente_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Presupuesto` ADD CONSTRAINT `Presupuesto_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Presupuesto` ADD CONSTRAINT `Presupuesto_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetallePresupuesto` ADD CONSTRAINT `DetallePresupuesto_presupuestoId_fkey` FOREIGN KEY (`presupuestoId`) REFERENCES `Presupuesto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetallePresupuesto` ADD CONSTRAINT `DetallePresupuesto_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialInventario` ADD CONSTRAINT `HistorialInventario_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialInventario` ADD CONSTRAINT `HistorialInventario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CajaDiaria` ADD CONSTRAINT `CajaDiaria_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCaja` ADD CONSTRAINT `MovimientoCaja_cajaId_fkey` FOREIGN KEY (`cajaId`) REFERENCES `CajaDiaria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoCaja` ADD CONSTRAINT `MovimientoCaja_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialPrecio` ADD CONSTRAINT `HistorialPrecio_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deposito` ADD CONSTRAINT `Deposito_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockUbicacion` ADD CONSTRAINT `StockUbicacion_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockUbicacion` ADD CONSTRAINT `StockUbicacion_depositoId_fkey` FOREIGN KEY (`depositoId`) REFERENCES `Deposito`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_depositoOrigenId_fkey` FOREIGN KEY (`depositoOrigenId`) REFERENCES `Deposito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_depositoDestinoId_fkey` FOREIGN KEY (`depositoDestinoId`) REFERENCES `Deposito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_repartidorId_fkey` FOREIGN KEY (`repartidorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetallePedido` ADD CONSTRAINT `DetallePedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetallePedido` ADD CONSTRAINT `DetallePedido_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComboItem` ADD CONSTRAINT `ComboItem_comboId_fkey` FOREIGN KEY (`comboId`) REFERENCES `Combo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComboItem` ADD CONSTRAINT `ComboItem_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraImpuesto` ADD CONSTRAINT `CompraImpuesto_compraId_fkey` FOREIGN KEY (`compraId`) REFERENCES `Compra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
