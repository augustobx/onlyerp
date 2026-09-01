"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// ============================================================================
// 1. CÁLCULO DE COMISIONES POR FACTURACIÓN O COBRANZAS
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

        let totalVentas = 0;
        let totalCobranzas = 0;

        const ventas = await prisma.venta.findMany({
          where: {
            tenantId: tenant.id,
            usuarioId: vendedor.id,
            fecha_emision: { gte: fechaInicio, lte: fechaFin },
          },
          select: { total: true },
        });
        totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);

        const cobranzasCC = await prisma.movimientoCuentaCorriente.findMany({
          where: {
            tenantId: tenant.id,
            usuarioId: vendedor.id,
            tipo: "ABONO",
            fecha: { gte: fechaInicio, lte: fechaFin },
          },
          select: { monto: true },
        });
        totalCobranzas = cobranzasCC.reduce((acc, c) => acc + c.monto, 0);

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
          base_calculo: baseCalculo,
          base_monto: baseMonto,
          monto_comision: montoComision,
          liquidacion_guardada: liqGuardada || null,
        };
      })
    );

    const vendedoresConActividad = resultados.filter(
      (r) => r.total_ventas > 0 || r.total_cobranzas > 0 || r.liquidacion_guardada !== null
    );

    return { success: true, data: vendedoresConActividad };
  } catch (error: any) {
    console.error("Error al calcular liquidación de comisiones:", error);
    return { success: false, error: error.message || "Error al calcular comisiones." };
  }
}

// ============================================================================
// 2. GUARDAR Y PAGAR LIQUIDACIONES
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
