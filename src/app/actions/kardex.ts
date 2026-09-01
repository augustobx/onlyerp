"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export interface KardexItem {
  id: number | string;
  fecha: Date;
  tipo: string;
  tipoBadge: "ENTRADA" | "SALIDA" | "AJUSTE" | "TRANSFERENCIA";
  depositoNombre: string;
  cantidad: number;
  saldoResultante: number;
  costoUnitario?: number;
  documentoReferencia?: string;
  usuarioNombre?: string;
  notas?: string;
}

export async function obtenerKardexProducto(
  productoId: number,
  params?: {
    depositoId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado." };

    const prod = await prisma.producto.findFirst({
      where: { id: Number(productoId), tenantId: tenant.id },
      include: {
        proveedor: true,
        marca: true,
        categoria: true,
        stocks: {
          include: { deposito: true },
        },
      },
    });

    if (!prod) {
      return { success: false, error: "Producto no encontrado." };
    }

    const where: any = {
      tenantId: tenant.id,
      productoId: Number(productoId),
    };

    if (params?.depositoId) {
      where.OR = [{ depositoOrigenId: Number(params.depositoId) }, { depositoDestinoId: Number(params.depositoId) }];
    }

    if (params?.fechaDesde || params?.fechaHasta) {
      where.fecha = {};
      if (params.fechaDesde) where.fecha.gte = new Date(params.fechaDesde);
      if (params.fechaHasta) {
        const fin = new Date(params.fechaHasta);
        fin.setHours(23, 59, 59, 999);
        where.fecha.lte = fin;
      }
    }

    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: {
        depositoOrigen: true,
        depositoDestino: true,
        usuario: { select: { nombre: true } },
      },
      orderBy: { fecha: "asc" },
    });

    let saldoAcumulado = 0;
    let totalEntradas = 0;
    let totalSalidas = 0;

    const kardex: KardexItem[] = movimientos.map((m) => {
      const esEntrada =
        m.tipo === "ENTRADA" ||
        m.tipo === "INGRESO_COMPRA" ||
        m.tipo === "REINGRESO_RECHAZO_REPARTO" ||
        m.tipo === "DEVOLUCION";
      const cantidadFirmada = esEntrada ? Math.abs(m.cantidad) : -Math.abs(m.cantidad);

      saldoAcumulado += cantidadFirmada;

      if (esEntrada) {
        totalEntradas += Math.abs(m.cantidad);
      } else {
        totalSalidas += Math.abs(m.cantidad);
      }

      let tipoBadge: "ENTRADA" | "SALIDA" | "AJUSTE" | "TRANSFERENCIA" = "AJUSTE";
      if (esEntrada) tipoBadge = "ENTRADA";
      else if (m.tipo === "SALIDA" || m.tipo === "VENTA") tipoBadge = "SALIDA";
      else if (m.tipo === "TRANSFERENCIA") tipoBadge = "TRANSFERENCIA";

      const depNombre = m.depositoDestino?.nombre || m.depositoOrigen?.nombre || "Depósito General";

      return {
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        tipoBadge,
        depositoNombre: depNombre,
        cantidad: cantidadFirmada,
        saldoResultante: saldoAcumulado,
        costoUnitario: prod.precio_costo,
        documentoReferencia: m.motivo || undefined,
        usuarioNombre: m.usuario?.nombre || "Sistema",
        notas: m.motivo || undefined,
      };
    });

    return {
      success: true,
      data: {
        producto: prod,
        kardex: kardex.reverse(),
        resumen: {
          totalEntradas,
          totalSalidas,
          saldoActual: saldoAcumulado,
        },
      },
    };
  } catch (error: any) {
    console.error("Error al obtener Kardex:", error);
    return { success: false, error: error.message || "Error al cargar Kardex." };
  }
}
