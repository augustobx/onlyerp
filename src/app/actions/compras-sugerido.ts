"use server";

import prisma from "@/lib/prisma";

export async function obtenerSugeridoCompras(filtros?: {
    proveedorId?: number;
    diasCobertura?: number; // Cuántos días de stock se desean asegurar (ej: 30 días)
    diasAnalisis?: number;  // Ventas de cuántos días atrás analizar para medir velocidad (ej: 30 o 60 días)
}) {
    try {
        const diasCobertura = filtros?.diasCobertura && filtros.diasCobertura > 0 ? Number(filtros.diasCobertura) : 30;
        const diasAnalisis = filtros?.diasAnalisis && filtros.diasAnalisis > 0 ? Number(filtros.diasAnalisis) : 30;

        const fechaDesdeAnalisis = new Date();
        fechaDesdeAnalisis.setDate(fechaDesdeAnalisis.getDate() - diasAnalisis);

        const whereProducto: any = {};
        if (filtros?.proveedorId && Number(filtros.proveedorId) > 0) {
            whereProducto.proveedorId = Number(filtros.proveedorId);
        }

        // 1. Obtener productos con stock y proveedor
        const productos = await prisma.producto.findMany({
            where: whereProducto,
            include: {
                proveedor: { select: { id: true, nombre: true, telefono: true, email: true } },
                marca: { select: { id: true, nombre: true } },
                categoria: { select: { id: true, nombre: true } },
                stocks: { select: { cantidad: true } },
                detalles_pedido: {
                    where: {
                        pedido: { estado: { in: ['PENDIENTE', 'APROBADO', 'ARMADO', 'LISTO_ENTREGA'] } }
                    },
                    select: { cantidad: true }
                },
                detalles_venta: {
                    where: {
                        venta: { fecha_emision: { gte: fechaDesdeAnalisis } }
                    },
                    select: { cantidad: true }
                }
            },
            orderBy: { nombre_producto: 'asc' }
        });

        // 2. Calcular rotación, consumo proyectado y sugerido
        const reporteSugerido = productos.map(prod => {
            const stockFisico = prod.stocks.reduce((acc, s) => acc + s.cantidad, 0);
            const stockComprometido = prod.detalles_pedido.reduce((acc, d) => acc + d.cantidad, 0);
            const stockDisponible = stockFisico - stockComprometido;

            const ventasPeriodo = prod.detalles_venta.reduce((acc, d) => acc + d.cantidad, 0);
            const ventaPromedioDiaria = ventasPeriodo / diasAnalisis;

            // Demanda esperada durante los días de cobertura + tiempo de reposición del proveedor
            const diasTotales = diasCobertura + (prod.tiempo_reposicion_dias || 7);
            const demandaProyectada = ventaPromedioDiaria * diasTotales;

            // Stock de seguridad mínimo
            const stockMinimo = prod.stock_minimo || prod.stock_recomendado || 0;

            // Cantidad sugerida a pedir
            const necesidadNeta = demandaProyectada + stockMinimo - stockDisponible;
            const cantidadSugerida = necesidadNeta > 0 ? Math.ceil(necesidadNeta) : 0;

            // Días de stock restantes al ritmo actual de ventas
            const diasStockRestantes = ventaPromedioDiaria > 0 ? Math.floor(stockDisponible / ventaPromedioDiaria) : 999;

            // Nivel de urgencia
            let urgencia: 'CRITICO' | 'ALERTA' | 'NORMAL' | 'SOBRESTOCK' = 'NORMAL';
            if (stockDisponible <= 0 || diasStockRestantes <= (prod.tiempo_reposicion_dias || 7)) {
                urgencia = 'CRITICO';
            } else if (diasStockRestantes <= diasCobertura / 2) {
                urgencia = 'ALERTA';
            } else if (diasStockRestantes > diasCobertura * 2 && ventasPeriodo > 0) {
                urgencia = 'SOBRESTOCK';
            }

            return {
                productoId: prod.id,
                codigo_articulo: prod.codigo_articulo,
                nombre_producto: prod.nombre_producto,
                proveedor: prod.proveedor?.nombre || "Sin proveedor",
                proveedorId: prod.proveedorId,
                marca: prod.marca?.nombre || "General",
                categoria: prod.categoria?.nombre || "General",
                tipo_medicion: prod.tipo_medicion,
                precio_costo: prod.precio_costo,
                stock_fisico: stockFisico,
                stock_comprometido: stockComprometido,
                stock_disponible: stockDisponible,
                stock_minimo: stockMinimo,
                ventas_periodo: ventasPeriodo,
                venta_promedio_diaria: Number(ventaPromedioDiaria.toFixed(2)),
                dias_stock_restantes: diasStockRestantes === 999 ? 'Sin ventas' : diasStockRestantes,
                cantidad_sugerida: cantidadSugerida,
                costo_total_estimado: cantidadSugerida * prod.precio_costo,
                urgencia
            };
        });

        // Filtrar productos que necesitan reposición o tienen urgencia crítica/alerta
        const articulosParaPedir = reporteSugerido.filter(r => r.cantidad_sugerida > 0);
        const costoTotalInversion = articulosParaPedir.reduce((acc, r) => acc + r.costo_total_estimado, 0);

        return {
            success: true,
            data: {
                articulosParaPedir,
                todosLosArticulos: reporteSugerido,
                totalProductosAPedir: articulosParaPedir.length,
                costoTotalInversion,
                diasCobertura,
                diasAnalisis
            }
        };
    } catch (error: any) {
        console.error("Error al calcular sugerido de compras:", error);
        return { success: false, error: error.message || "Error al calcular sugerido de compras." };
    }
}
