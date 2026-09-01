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
      totalIngresos += v.total;
      totalDescuentos += v.descuento_global;
      ingresosPorMedio[v.metodo_pago] = (ingresosPorMedio[v.metodo_pago] || 0) + v.total;

      if (!rankingClientes[v.clienteId]) {
        rankingClientes[v.clienteId] = { nombre: v.cliente.nombre_razon_social, comprado: 0, adeudado: 0 };
      }
      rankingClientes[v.clienteId].comprado += v.total;
      rankingClientes[v.clienteId].adeudado += v.saldo_pendiente;

      v.detalles.forEach((det) => {
        const prodId = det.producto.id;
        const costoLinea = det.producto.precio_costo * det.cantidad;
        costoTotalMercaderia += costoLinea;

        const rentabilidadLinea = det.subtotal - costoLinea;

        if (!rankingProductos[prodId]) {
          rankingProductos[prodId] = {
            nombre: det.producto.nombre_producto,
            cantidad: 0,
            recaudado: 0,
            rentabilidad: 0,
          };
        }
        rankingProductos[prodId].cantidad += det.cantidad;
        rankingProductos[prodId].recaudado += det.subtotal;
        rankingProductos[prodId].rentabilidad += rentabilidadLinea;
      });
    });

    let totalEgresos = 0;
    let egresosPorDescripcion: Record<string, number> = {};

    cajas.forEach((c) => {
      c.movimientos.forEach((m) => {
        if (m.tipo === "EGRESO_MANUAL") {
          totalEgresos += m.monto;
          egresosPorDescripcion[m.descripcion] = (egresosPorDescripcion[m.descripcion] || 0) + m.monto;
        }
      });
    });

    const gananciaNeta = totalIngresos - costoTotalMercaderia - totalEgresos;

    const listaProductosRanking = Object.values(rankingProductos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    const listaClientesRanking = Object.values(rankingClientes)
      .sort((a, b) => b.comprado - a.comprado)
      .slice(0, 10);

    const topGastos = Object.entries(egresosPorDescripcion)
      .map(([descripcion, monto]) => ({ descripcion, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    return {
      success: true,
      data: {
        financiero: {
          totalIngresos,
          costoTotalMercaderia,
          totalEgresos,
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
        rankings: {
          topProductos: listaProductosRanking,
          topClientes: listaClientesRanking,
          topGastos,
        },
      },
    };
  } catch (error) {
    console.error("Error al procesar el reporte maestro:", error);
    return { success: false, error: "Error al generar el reporte maestro." };
  }
}