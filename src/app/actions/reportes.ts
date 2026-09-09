"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export async function getReporteMaestro(filtros: { fecha_desde?: string; fecha_hasta?: string }) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    // 1. FILTRO DE FECHAS PARA VENTAS
    let dateFilter: any = { tenantId: tenant.id };
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      dateFilter.fecha_emision = {};
      if (filtros.fecha_desde) dateFilter.fecha_emision.gte = new Date(`${filtros.fecha_desde}T00:00:00.000Z`);
      if (filtros.fecha_hasta) dateFilter.fecha_emision.lte = new Date(`${filtros.fecha_hasta}T23:59:59.999Z`);
    }

    const ventas = await prisma.venta.findMany({
      where: dateFilter,
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
      },
    });

    // 2. FILTRO DE FECHAS PARA CAJAS
    let cajaFilter: any = { tenantId: tenant.id };
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      cajaFilter.fecha_apertura = {};
      if (filtros.fecha_desde) cajaFilter.fecha_apertura.gte = new Date(`${filtros.fecha_desde}T00:00:00.000Z`);
      if (filtros.fecha_hasta) cajaFilter.fecha_apertura.lte = new Date(`${filtros.fecha_hasta}T23:59:59.999Z`);
    }

    const cajas = await prisma.cajaDiaria.findMany({
      where: cajaFilter,
      include: { movimientos: true },
    });

    // 3. FILTRO DE FECHAS PARA INFLACIÓN
    let historialFilter: any = { tenantId: tenant.id };
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      historialFilter.fecha = {};
      if (filtros.fecha_desde) historialFilter.fecha.gte = new Date(`${filtros.fecha_desde}T00:00:00.000Z`);
      if (filtros.fecha_hasta) historialFilter.fecha.lte = new Date(`${filtros.fecha_hasta}T23:59:59.999Z`);
    }

    const cambiosPrecio = await prisma.historialPrecio.findMany({
      where: historialFilter,
      include: { producto: { select: { nombre_producto: true, codigo_articulo: true } } },
      orderBy: { fecha: "desc" },
    });

    const aumentos = cambiosPrecio.filter((c) => c.porcentaje_cambio > 0);
    const inflacionPromedio =
      aumentos.length > 0 ? aumentos.reduce((acc, curr) => acc + curr.porcentaje_cambio, 0) / aumentos.length : 0;

    let totalIngresos = 0;
    let costoTotalMercaderia = 0;
    let totalDescuentos = 0;
    const ingresosPorMedio: Record<string, number> = {};

    const rankingProductos: Record<
      number,
      { nombre: string; cantidad: number; recaudado: number; rentabilidad: number }
    > = {};
    const rankingClientes: Record<number, { nombre: string; comprado: number; adeudado: number }> = {};

    ventas.forEach((v) => {
      totalIngresos += v.total || 0;
      totalDescuentos += v.descuento_global || 0;
      const metodo = v.metodo_pago || "CONTADO";
      ingresosPorMedio[metodo] = (ingresosPorMedio[metodo] || 0) + (v.total || 0);

      const clienteId = v.clienteId || 0;
      const clienteNombre = v.cliente?.nombre_razon_social || "Consumidor Final";
      if (!rankingClientes[clienteId]) {
        rankingClientes[clienteId] = { nombre: clienteNombre, comprado: 0, adeudado: 0 };
      }
      rankingClientes[clienteId].comprado += v.total || 0;
      rankingClientes[clienteId].adeudado += v.saldo_pendiente || 0;

      (v.detalles || []).forEach((det) => {
        if (!det.producto) return;
        const prodId = det.producto.id;
        const costoUnit = det.producto.precio_costo ?? det.costo_unitario ?? 0;
        const cant = det.cantidad || 0;
        const costoLinea = costoUnit * cant;
        costoTotalMercaderia += costoLinea;

        const subtotal = det.subtotal || 0;
        const rentabilidadLinea = subtotal - costoLinea;

        if (!rankingProductos[prodId]) {
          rankingProductos[prodId] = {
            nombre: det.producto.nombre_producto,
            cantidad: 0,
            recaudado: 0,
            rentabilidad: 0,
          };
        }
        rankingProductos[prodId].cantidad += cant;
        rankingProductos[prodId].recaudado += subtotal;
        rankingProductos[prodId].rentabilidad += rentabilidadLinea;
      });
    });

    let totalGastosCaja = 0;
    let egresosPorDescripcion: Record<string, number> = {};

    cajas.forEach((c) => {
      (c.movimientos || []).forEach((m) => {
        if (m.tipo === "EGRESO_MANUAL") {
          totalGastosCaja += m.monto || 0;
          const desc = m.descripcion || "Gasto General";
          egresosPorDescripcion[desc] = (egresosPorDescripcion[desc] || 0) + (m.monto || 0);
        }
      });
    });

    const gananciaBruta = totalIngresos - costoTotalMercaderia;
    const gananciaNeta = gananciaBruta - totalGastosCaja;

    // Rankings requeridos por la vista de reportes
    const topProductosVendidos = Object.values(rankingProductos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 15);

    const topProductosRentables = Object.values(rankingProductos)
      .sort((a, b) => b.rentabilidad - a.rentabilidad)
      .slice(0, 15);

    // Consulta de productos menos vendidos / stock clavado filtrada por tenant
    const todosLosProductos = await prisma.producto.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, nombre_producto: true, stocks: { select: { cantidad: true } } },
    });

    const productosMenosVendidos = todosLosProductos
      .map((p) => {
        const stats = rankingProductos[p.id];
        const stockActual = (p.stocks || []).reduce((acc, current) => acc + (current.cantidad || 0), 0);
        return {
          nombre: p.nombre_producto,
          cantidad: stats ? stats.cantidad : 0,
          stock_clavado: stockActual,
        };
      })
      .sort((a, b) => a.cantidad - b.cantidad)
      .slice(0, 15);

    const topClientes = Object.values(rankingClientes)
      .sort((a, b) => b.comprado - a.comprado)
      .slice(0, 15);

    const topDeudores = Object.values(rankingClientes)
      .filter((c) => c.adeudado > 0)
      .sort((a, b) => b.adeudado - a.adeudado)
      .slice(0, 15);

    const topGastos = Object.entries(egresosPorDescripcion)
      .map(([descripcion, monto]) => ({ descripcion, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10);

    return {
      success: true,
      data: {
        // Objeto exacto esperado por src/app/reportes/page.tsx
        kpis: {
          ventasTotales: ventas.length,
          ingresosTotales: totalIngresos,
          costoMercaderia: costoTotalMercaderia,
          gananciaBruta,
          margenPromedio: totalIngresos > 0 ? (gananciaBruta / totalIngresos) * 100 : 0,
          ticketPromedio: ventas.length > 0 ? totalIngresos / ventas.length : 0,
          totalDescuentosOtorgados: totalDescuentos,
          totalGastosCaja,
          inflacionPromedio: Number(inflacionPromedio.toFixed(2)),
        },
        mediosDePago: ingresosPorMedio,
        historialPrecios: cambiosPrecio,
        rankings: {
          topProductosVendidos,
          topProductosRentables,
          productosMenosVendidos,
          topClientes,
          topDeudores,
          topGastos,
          // Compatibilidad retroactiva
          topProductos: topProductosVendidos,
        },
        // Compatibilidad retroactiva con consumidores previos
        financiero: {
          totalIngresos,
          costoTotalMercaderia,
          totalEgresos: totalGastosCaja,
          totalDescuentos,
          gananciaNeta,
          rentabilidadPorcentaje:
            totalIngresos > 0 ? Number(((gananciaNeta / totalIngresos) * 100).toFixed(2)) : 0,
          ingresosPorMedio,
        },
        inflacion: {
          inflacionPromedio: Number(inflacionPromedio.toFixed(2)),
          cantidadAumentos: aumentos.length,
          ultimosAumentos: cambiosPrecio.slice(0, 5),
        },
      },
    };
  } catch (error) {
    console.error("Error al procesar el reporte maestro:", error);
    return { success: false, error: "Error al generar el reporte maestro." };
  }
}
