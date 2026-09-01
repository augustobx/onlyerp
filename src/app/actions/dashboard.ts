"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export async function getDashboardMetrics() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);
    en7Dias.setHours(23, 59, 59, 999);

    const ventasHoy = await prisma.venta.aggregate({
      where: { tenantId: tenant.id, fecha_emision: { gte: hoyInicio, lte: hoyFin } },
      _sum: { total: true },
      _count: { id: true },
    });

    const deudaTotal = await prisma.venta.aggregate({
      where: { tenantId: tenant.id, estado_pago: { in: ["PENDIENTE", "PARCIAL"] } },
      _sum: { saldo_pendiente: true },
    });

    const chequesCartera = await prisma.cheque.findMany({
      where: { tenantId: tenant.id, estado: "EN_CARTERA" },
      include: { cliente: { select: { nombre_razon_social: true } } },
      orderBy: { fecha_cobro: "asc" },
    });

    const totalChequesMonto = chequesCartera.reduce((a, c) => a + c.monto, 0);
    const chequesVencenPronto = chequesCartera.filter((c) => c.fecha_cobro <= en7Dias);
    const totalChequesVencenProntoMonto = chequesVencenPronto.reduce((a, c) => a + c.monto, 0);

    const rutasActivas = await prisma.hojaDeRuta.findMany({
      where: { tenantId: tenant.id, estado: { in: ["EN_PREPARACION", "EN_RUTA"] } },
      include: {
        repartidor: { select: { nombre: true } },
        detalles: {
          include: {
            pedido: {
              include: { cliente: { select: { nombre_razon_social: true } } },
            },
          },
        },
      },
      orderBy: { fecha_despacho: "desc" },
    });

    const todosProductos = await prisma.producto.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        nombre_producto: true,
        codigo_articulo: true,
        stock_minimo: true,
        punto_pedido: true,
        tiempo_reposicion_dias: true,
        stocks: { select: { cantidad: true } },
      },
    });

    let bajos: any[] = [];
    todosProductos.forEach((p) => {
      const stock_actual = p.stocks.reduce((acc, curr) => acc + curr.cantidad, 0);
      const limite = p.punto_pedido || p.stock_minimo || 5;
      if (stock_actual <= limite) {
        bajos.push({
          id: p.id,
          codigo_articulo: p.codigo_articulo,
          nombre_producto: p.nombre_producto,
          stock_actual,
          punto_pedido: limite,
        });
      }
    });

    bajos.sort((a, b) => a.stock_actual - b.stock_actual);
    const totalBajoStock = bajos.length;
    const productosBajoStock = bajos.slice(0, 5);

    const cajaActiva = await prisma.cajaDiaria.findFirst({
      where: { tenantId: tenant.id, estado: "ABIERTA" },
      include: { movimientos: true },
    });

    let efectivoEnCaja = cajaActiva?.saldo_inicial || 0;
    if (cajaActiva) {
      cajaActiva.movimientos.forEach((m) => {
        if (m.metodo_pago === "CONTADO") {
          if (m.tipo === "EGRESO_MANUAL") efectivoEnCaja -= m.monto;
          else efectivoEnCaja += m.monto;
        }
      });
    }

    const ultimasVentas = await prisma.venta.findMany({
      where: { tenantId: tenant.id },
      take: 5,
      orderBy: { fecha_emision: "desc" },
      include: { cliente: { select: { nombre_razon_social: true } } },
    });

    const pedidosPendientes = await prisma.pedido.findMany({
      where: { tenantId: tenant.id, estado: { in: ["PENDIENTE", "APROBADO", "ARMADO"] } },
      take: 5,
      orderBy: { fecha: "desc" },
      include: {
        cliente: { select: { nombre_razon_social: true, direccion: true, telefono: true } },
        usuario: { select: { nombre: true } },
      },
    });

    const totalPedidosPendientesCount = await prisma.pedido.count({
      where: { tenantId: tenant.id, estado: { in: ["PENDIENTE", "APROBADO", "ARMADO"] } },
    });

    return {
      success: true,
      data: {
        ventasHoy: ventasHoy._sum?.total || 0,
        cantidadVentasHoy: ventasHoy._count?.id || 0,
        deudaTotal: deudaTotal._sum?.saldo_pendiente || 0,
        totalBajoStock,
        productosBajoStock,
        efectivoEnCaja,
        cajaAbierta: !!cajaActiva,
        ultimasVentas,
        totalChequesMonto,
        chequesCarteraCount: chequesCartera.length,
        chequesVencenProntoMonto: totalChequesVencenProntoMonto,
        chequesVencenProntoCount: chequesVencenPronto.length,
        chequesVencenProntoLista: chequesVencenPronto.slice(0, 4),
        rutasActivas,
        pedidosPendientes,
        totalPedidosPendientesCount,
      },
    };
  } catch (error) {
    console.error("Error en Dashboard:", error);
    return { success: false, error: "Error al cargar las métricas." };
  }
}