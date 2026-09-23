"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// ============================================================================
// 1. CÁLCULO DE COMISIONES POR FACTURACIÓN O COBRANZAS (PRELIQUIDACIÓN)
// ============================================================================

export async function calcularPreliquidacionVendedores(
  mes: number,
  anio: number,
  baseCalculo: "FACTURACION" | "COBRANZA" = "FACTURACION"
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const fechaInicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

    const config = await prisma.empresaConfig.findUnique({
      where: { tenantId: tenant.id },
    });
    const comisionBaseGlobal = config?.comision_base_global || 5;

    const vendedores = await prisma.usuario.findMany({
      where: { tenantId: tenant.id, activo: true },
      select: {
        id: true,
        nombre: true,
        username: true,
        rol: true,
        comision_personalizada: true,
      },
      orderBy: { nombre: "asc" },
    });

    const liquidacionesExistentes = await prisma.liquidacionComision.findMany({
      where: { tenantId: tenant.id, mes, anio },
    });

    const resultados = await Promise.all(
      vendedores.map(async (vendedor) => {
        const porcentajeComision =
          vendedor.comision_personalizada !== null && vendedor.comision_personalizada !== undefined
            ? vendedor.comision_personalizada
            : comisionBaseGlobal;

        // Ventas facturadas
        const ventas = await prisma.venta.findMany({
          where: {
            tenantId: tenant.id,
            usuarioId: vendedor.id,
            fecha_emision: { gte: fechaInicio, lte: fechaFin },
          },
          select: { total: true },
        });
        const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);

        // Cobranzas en Cuenta Corriente
        const cobranzasCC = await prisma.movimientoCuentaCorriente.findMany({
          where: {
            tenantId: tenant.id,
            usuarioId: vendedor.id,
            tipo: "ABONO",
            fecha: { gte: fechaInicio, lte: fechaFin },
          },
          select: { monto: true },
        });
        const totalCobranzas = cobranzasCC.reduce((acc, c) => acc + c.monto, 0);

        // Pedidos cancelados del período para este vendedor
        const pedidosCancelados = await prisma.pedido.findMany({
          where: {
            tenantId: tenant.id,
            usuarioId: vendedor.id,
            estado: { in: ["CANCELADO", "RECHAZADO"] },
            fecha: { gte: fechaInicio, lte: fechaFin },
          },
          select: { total: true },
        });
        const totalCancelado = pedidosCancelados.reduce((acc, p) => acc + p.total, 0);
        const comisionCancelada = totalCancelado * (porcentajeComision / 100);

        const baseMonto = baseCalculo === "FACTURACION" ? totalVentas : totalCobranzas;
        const montoComision = baseMonto * (porcentajeComision / 100);

        const liqGuardada = liquidacionesExistentes.find((l) => l.usuarioId === vendedor.id);

        return {
          usuarioId: vendedor.id,
          nombre: vendedor.nombre,
          username: vendedor.username,
          rol: vendedor.rol,
          porcentaje_comision: porcentajeComision,
          total_ventas: totalVentas,
          total_cobranzas: totalCobranzas,
          total_cancelado: totalCancelado,
          comision_cancelada: comisionCancelada,
          cantidad_ventas: ventas.length,
          cantidad_cancelados: pedidosCancelados.length,
          base_calculo: baseCalculo,
          base_monto: baseMonto,
          monto_comision: montoComision,
          liquidacion_guardada: liqGuardada || null,
        };
      })
    );

    const vendedoresConActividad = resultados.filter(
      (r) =>
        r.total_ventas > 0 ||
        r.total_cobranzas > 0 ||
        r.total_cancelado > 0 ||
        r.liquidacion_guardada !== null
    );

    return { success: true, data: vendedoresConActividad };
  } catch (error: any) {
    console.error("Error al calcular liquidación de comisiones:", error);
    return { success: false, error: error.message || "Error al calcular comisiones." };
  }
}

// ============================================================================
// 2. DETALLE COMPLETO DE OPERACIONES DE UN VENDEDOR EN EL MES (AUDITORÍA)
// ============================================================================

export async function obtenerDetalleLiquidacionVendedor(
  usuarioId: number,
  mes: number,
  anio: number,
  baseCalculo: "FACTURACION" | "COBRANZA" = "FACTURACION"
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const fechaInicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

    const [vendedor, config, ventas, pedidos, cobranzas] = await Promise.all([
      prisma.usuario.findFirst({
        where: { id: usuarioId, tenantId: tenant.id },
        select: {
          id: true,
          nombre: true,
          username: true,
          rol: true,
          comision_personalizada: true,
          limite_desc_vendedor: true,
        },
      }),
      prisma.empresaConfig.findUnique({ where: { tenantId: tenant.id } }),
      prisma.venta.findMany({
        where: {
          tenantId: tenant.id,
          usuarioId,
          fecha_emision: { gte: fechaInicio, lte: fechaFin },
        },
        include: {
          cliente: { select: { id: true, nombre_razon_social: true, dni_cuit: true, limite_desc_cliente: true } },
          detalles: {
            include: {
              producto: { select: { id: true, codigo_articulo: true, nombre_producto: true } },
            },
          },
        },
        orderBy: { fecha_emision: "desc" },
      }),
      prisma.pedido.findMany({
        where: {
          tenantId: tenant.id,
          usuarioId,
          fecha: { gte: fechaInicio, lte: fechaFin },
        },
        include: {
          cliente: { select: { id: true, nombre_razon_social: true, dni_cuit: true, limite_desc_cliente: true } },
          detalles: {
            include: {
              producto: { select: { id: true, codigo_articulo: true, nombre_producto: true } },
            },
          },
        },
        orderBy: { fecha: "desc" },
      }),
      prisma.movimientoCuentaCorriente.findMany({
        where: {
          tenantId: tenant.id,
          usuarioId,
          tipo: "ABONO",
          fecha: { gte: fechaInicio, lte: fechaFin },
        },
        include: {
          cliente: { select: { id: true, nombre_razon_social: true, dni_cuit: true } },
        },
        orderBy: { fecha: "desc" },
      }),
    ]);

    if (!vendedor) return { success: false, error: "Vendedor no encontrado." };

    const comisionGlobal = (config?.comision_base_global || 5) / 100;
    const penalizacionGlobal = (config?.penalizacion_global || 2) / 100;
    const limiteGlobal = config?.limite_desc_global || 10;

    const porcentajeBase =
      vendedor.comision_personalizada !== null && vendedor.comision_personalizada !== undefined
        ? vendedor.comision_personalizada / 100
        : comisionGlobal;

    const ventaIdsFacturadas = new Set(ventas.map((v) => v.id));
    const operaciones: any[] = [];

    // Procesar Ventas
    for (const v of ventas) {
      const dtoPorcentaje = v.subtotal > 0 ? (v.descuento_global / v.subtotal) * 100 : 0;
      const limite = v.cliente?.limite_desc_cliente ?? vendedor.limite_desc_vendedor ?? limiteGlobal;
      const esPenalizado = dtoPorcentaje > limite;
      const comisionFinal = esPenalizado ? Math.max(0, porcentajeBase - penalizacionGlobal) : porcentajeBase;
      const comisionMonto = v.total * comisionFinal;

      const f = new Date(v.fecha_emision);
      operaciones.push({
        id: `venta-${v.id}`,
        tipo: "VENTA",
        comprobante: `${v.tipo_comprobante.replace("_", " ")} ${String(v.punto_venta).padStart(4, "0")}-${String(
          v.numero_comprobante
        ).padStart(8, "0")}`,
        fecha: v.fecha_emision,
        diaStr: f.toISOString().split("T")[0],
        horaStr: f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        cliente: v.cliente,
        total: v.total,
        dtoPorcentaje,
        limite,
        esPenalizado,
        porcentajeAplicado: comisionFinal * 100,
        estadoOperacion: "FACTURADO",
        estadoComision: "ACTIVA",
        comisionGenerada: comisionMonto,
        comisionCancelada: 0,
        detalles: v.detalles.map((d) => ({
          nombre: d.producto?.nombre_producto || "Producto",
          codigo: d.producto?.codigo_articulo || "S/C",
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal,
        })),
      });
    }

    // Procesar Pedidos
    for (const p of pedidos) {
      if (p.ventaId && ventaIdsFacturadas.has(p.ventaId)) continue;

      const esCancelado = p.estado === "CANCELADO" || p.estado === "RECHAZADO";
      const dtoPorcentaje = p.subtotal > 0 ? (p.descuento_global / p.subtotal) * 100 : 0;
      const limite = p.cliente?.limite_desc_cliente ?? vendedor.limite_desc_vendedor ?? limiteGlobal;
      const esPenalizado = dtoPorcentaje > limite;
      const comisionFinal = esPenalizado ? Math.max(0, porcentajeBase - penalizacionGlobal) : porcentajeBase;
      const comisionCalculada = p.total * comisionFinal;

      const f = new Date(p.fecha);
      operaciones.push({
        id: `pedido-${p.id}`,
        tipo: "PEDIDO",
        comprobante: `Pedido #${p.numero}`,
        fecha: p.fecha,
        diaStr: f.toISOString().split("T")[0],
        horaStr: f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        cliente: p.cliente,
        total: p.total,
        dtoPorcentaje,
        limite,
        esPenalizado,
        porcentajeAplicado: comisionFinal * 100,
        estadoOperacion: p.estado,
        estadoComision: esCancelado ? "CANCELADA" : "ACTIVA",
        comisionGenerada: esCancelado ? 0 : comisionCalculada,
        comisionCancelada: esCancelado ? comisionCalculada : 0,
        detalles: p.detalles.map((d) => ({
          nombre: d.producto?.nombre_producto || "Producto",
          codigo: d.producto?.codigo_articulo || "S/C",
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal,
        })),
        notas: p.notas || p.motivo_no_entrega || null,
      });
    }

    operaciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const resumen = {
      totalFacturadoActivo: operaciones
        .filter((o) => o.estadoComision === "ACTIVA")
        .reduce((acc, o) => acc + o.total, 0),
      totalCancelado: operaciones
        .filter((o) => o.estadoComision === "CANCELADA")
        .reduce((acc, o) => acc + o.total, 0),
      comisionesActivas: operaciones
        .filter((o) => o.estadoComision === "ACTIVA")
        .reduce((acc, o) => acc + o.comisionGenerada, 0),
      comisionesCanceladas: operaciones
        .filter((o) => o.estadoComision === "CANCELADA")
        .reduce((acc, o) => acc + o.comisionCancelada, 0),
      totalCobrado: cobranzas.reduce((acc, c) => acc + c.monto, 0),
      baseCalculo,
      porcentajeComision: porcentajeBase * 100,
    };

    return {
      success: true,
      vendedor,
      operaciones,
      cobranzas,
      resumen,
    };
  } catch (error: any) {
    console.error("Error al obtener detalle de liquidación:", error);
    return { success: false, error: error.message || "Error al obtener detalle." };
  }
}

// ============================================================================
// 3. GUARDAR Y PAGAR LIQUIDACIONES
// ============================================================================

export async function guardarLiquidacion(data: {
  usuarioId: number;
  mes: number;
  anio: number;
  total_ventas: number;
  total_cobranzas: number;
  porcentaje_comision: number;
  monto_comision: number;
  notas?: string;
}) {
  try {
    const tenant = await requireTenant();

    const existing = await prisma.liquidacionComision.findFirst({
      where: { tenantId: tenant.id, usuarioId: data.usuarioId, mes: data.mes, anio: data.anio },
    });

    const liq = await prisma.liquidacionComision.upsert({
      where: {
        id: existing?.id || 0,
      },
      update: {
        total_ventas: data.total_ventas,
        total_cobranzas: data.total_cobranzas,
        porcentaje_comision: data.porcentaje_comision,
        monto_comision: data.monto_comision,
        notas: data.notas || null,
      },
      create: {
        tenantId: tenant.id,
        usuarioId: data.usuarioId,
        mes: data.mes,
        anio: data.anio,
        total_ventas: data.total_ventas,
        total_cobranzas: data.total_cobranzas,
        porcentaje_comision: data.porcentaje_comision,
        monto_comision: data.monto_comision,
        estado: "PENDIENTE",
        notas: data.notas || null,
      },
    });

    revalidatePath("/reportes/comisiones");
    return { success: true, data: liq };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al guardar liquidación." };
  }
}

export async function pagarLiquidacion(id: number, notas?: string) {
  try {
    const liq = await prisma.liquidacionComision.update({
      where: { id: Number(id) },
      data: {
        estado: "PAGADA",
        fecha_pago: new Date(),
        notas: notas || undefined,
      },
    });

    revalidatePath("/reportes/comisiones");
    return { success: true, data: liq };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
