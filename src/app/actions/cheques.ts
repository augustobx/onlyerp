"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getClientSession } from "./auth";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// ============================================================================
// 1. CONSULTAS Y KPIS DE CARTERA DE VALORES
// ============================================================================

export async function obtenerCheques(filtros?: {
  estado?: string;
  tipo?: string;
  banco?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  termino?: string;
}) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const where: any = { tenantId: tenant.id };

    if (filtros?.estado && filtros.estado !== "TODOS") {
      where.estado = filtros.estado;
    }

    if (filtros?.tipo && filtros.tipo !== "TODOS") {
      where.tipo = filtros.tipo;
    }

    if (filtros?.banco && filtros.banco.trim() !== "") {
      where.banco = { contains: filtros.banco.trim() };
    }

    if (filtros?.fecha_desde || filtros?.fecha_hasta) {
      where.fecha_cobro = {};
      if (filtros.fecha_desde) where.fecha_cobro.gte = new Date(`${filtros.fecha_desde}T00:00:00.000Z`);
      if (filtros.fecha_hasta) where.fecha_cobro.lte = new Date(`${filtros.fecha_hasta}T23:59:59.999Z`);
    }

    if (filtros?.termino && filtros.termino.trim() !== "") {
      where.OR = [
        { numero_cheque: { contains: filtros.termino.trim() } },
        { nombre_librador: { contains: filtros.termino.trim() } },
        { cuit_librador: { contains: filtros.termino.trim() } },
        { cliente: { nombre_razon_social: { contains: filtros.termino.trim() } } },
      ];
    }

    const cheques = await prisma.cheque.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre_razon_social: true, dni_cuit: true, telefono: true } },
        proveedor: { select: { id: true, nombre: true } },
        movimientos_hist: { orderBy: { fecha: "desc" } },
      },
      orderBy: { fecha_cobro: "asc" },
      take: 200,
    });

    return { success: true, data: cheques };
  } catch (error: any) {
    console.error("Error al obtener cheques:", error);
    return { success: false, error: error.message || "Error al cargar cheques." };
  }
}

export async function obtenerKpisCarteraValores() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);
    en7Dias.setHours(23, 59, 59, 999);

    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const enCartera = await prisma.cheque.aggregate({
      where: { tenantId: tenant.id, estado: "EN_CARTERA" },
      _sum: { monto: true },
      _count: { id: true },
    });

    const porVencer7Dias = await prisma.cheque.aggregate({
      where: {
        tenantId: tenant.id,
        estado: "EN_CARTERA",
        fecha_cobro: { lte: en7Dias },
      },
      _sum: { monto: true },
      _count: { id: true },
    });

    const cobradosMes = await prisma.cheque.aggregate({
      where: {
        tenantId: tenant.id,
        estado: { in: ["DEPOSITADO", "COBRADO"] },
        fecha_cobro: { gte: primerDiaMes },
      },
      _sum: { monto: true },
      _count: { id: true },
    });

    const endosados = await prisma.cheque.aggregate({
      where: { tenantId: tenant.id, estado: "ENDOSADO_PROVEEDOR" },
      _sum: { monto: true },
      _count: { id: true },
    });

    const rechazados = await prisma.cheque.aggregate({
      where: { tenantId: tenant.id, estado: "RECHAZADO" },
      _sum: { monto: true },
      _count: { id: true },
    });

    return {
      success: true,
      data: {
        enCarteraMonto: enCartera._sum.monto || 0,
        enCarteraCantidad: enCartera._count.id || 0,
        porVencerMonto: porVencer7Dias._sum.monto || 0,
        porVencerCantidad: porVencer7Dias._count.id || 0,
        cobradosMesMonto: cobradosMes._sum.monto || 0,
        cobradosMesCantidad: cobradosMes._count.id || 0,
        endosadosMonto: endosados._sum.monto || 0,
        endosadosCantidad: endosados._count.id || 0,
        rechazadosMonto: rechazados._sum.monto || 0,
        rechazadosCantidad: rechazados._count.id || 0,
      },
    };
  } catch (error: any) {
    console.error("Error al calcular KPIs de cartera:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 2. REGISTRO Y ACCIONES EN LOTE
// ============================================================================

export async function registrarChequeManual(data: {
  numero_cheque: string;
  banco: string;
  cuit_librador?: string;
  nombre_librador?: string;
  monto: number;
  fecha_emision?: string;
  fecha_cobro: string;
  tipo: "FISICO" | "ECHEQ";
  clienteId?: number;
  notas?: string;
}) {
  try {
    const tenant = await requireTenant();

    if (!data.numero_cheque || !data.banco || data.monto <= 0 || !data.fecha_cobro) {
      throw new Error("Complete los campos obligatorios del cheque (Número, Banco, Monto, Fecha de Cobro).");
    }

    const cheque = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.cheque.create({
        data: {
          tenantId: tenant.id,
          numero_cheque: data.numero_cheque.trim(),
          banco: data.banco.trim(),
          cuit_librador: data.cuit_librador || null,
          nombre_librador: data.nombre_librador || null,
          monto: Number(data.monto),
          fecha_emision: data.fecha_emision ? new Date(data.fecha_emision) : new Date(),
          fecha_cobro: new Date(data.fecha_cobro),
          tipo: data.tipo || "FISICO",
          origen: "TERCERO_CLIENTE",
          estado: "EN_CARTERA",
          clienteId: data.clienteId ? Number(data.clienteId) : null,
          notas: data.notas || null,
          movimientos_hist: {
            create: {
              estado_origen: "EN_CARTERA",
              estado_destino: "EN_CARTERA",
              motivo: "Ingreso manual a cartera de valores",
            },
          },
        },
      });

      return nuevo;
    });

    revalidatePath("/finanzas/cartera-valores");
    return { success: true, data: cheque };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar cheque." };
  }
}

export async function depositarChequesEnLote(chequesIds: number[], notas?: string) {
  try {
    const tenant = await requireTenant();
    if (!chequesIds || chequesIds.length === 0) throw new Error("Seleccione al menos un cheque.");

    await prisma.$transaction(async (tx) => {
      for (const id of chequesIds) {
        const ch = await tx.cheque.findFirst({
          where: { id: Number(id), tenantId: tenant.id },
        });
        if (!ch || ch.estado !== "EN_CARTERA") continue;

        await tx.cheque.update({
          where: { id: ch.id },
          data: {
            estado: "DEPOSITADO",
            notas: (ch.notas || "") + (notas ? `\n[DEPOSITADO]: ${notas}` : "\n[DEPOSITADO]"),
          },
        });

        await tx.movimientoCheque.create({
          data: {
            chequeId: ch.id,
            estado_origen: "EN_CARTERA",
            estado_destino: "DEPOSITADO",
            motivo: notas || "Depósito bancario en lote",
          },
        });
      }
    });

    revalidatePath("/finanzas/cartera-valores");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function endosarChequesAProveedor(chequesIds: number[], proveedorId: number, notas?: string) {
  try {
    const tenant = await requireTenant();
    if (!chequesIds || chequesIds.length === 0) throw new Error("Seleccione al menos un cheque.");
    if (!proveedorId) throw new Error("Seleccione el proveedor destinatario.");

    const prov = await prisma.proveedor.findFirst({
      where: { id: Number(proveedorId), tenantId: tenant.id },
    });
    if (!prov) throw new Error("Proveedor no encontrado.");

    await prisma.$transaction(async (tx) => {
      for (const id of chequesIds) {
        const ch = await tx.cheque.findFirst({
          where: { id: Number(id), tenantId: tenant.id },
        });
        if (!ch || ch.estado !== "EN_CARTERA") continue;

        await tx.cheque.update({
          where: { id: ch.id },
          data: {
            estado: "ENDOSADO_PROVEEDOR",
            proveedorId: Number(proveedorId),
            notas: (ch.notas || "") + `\n[ENDOSADO A ${prov.nombre}]: ${notas || ""}`,
          },
        });

        await tx.movimientoCheque.create({
          data: {
            chequeId: ch.id,
            estado_origen: "EN_CARTERA",
            estado_destino: "ENDOSADO_PROVEEDOR",
            motivo: `Endosado al proveedor ${prov.nombre}`,
          },
        });
      }
    });

    revalidatePath("/finanzas/cartera-valores");
    revalidatePath("/proveedores");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function marcarChequeRechazado(chequeId: number, motivo: string) {
  try {
    if (!motivo || !motivo.trim()) throw new Error("Debe indicar el motivo de rechazo del cheque.");

    const tenant = await requireTenant();
    const session = await getClientSession();
    const usuarioId = (session as any)?.id ? Number((session as any).id) : null;

    await prisma.$transaction(async (tx) => {
      const ch = await tx.cheque.findFirst({
        where: { id: Number(chequeId), tenantId: tenant.id },
        include: { cliente: true },
      });

      if (!ch) throw new Error("Cheque no encontrado.");
      if (ch.estado === "RECHAZADO") throw new Error("Este cheque ya está marcado como rechazado.");

      const estadoAnterior = ch.estado;

      await tx.cheque.update({
        where: { id: ch.id },
        data: {
          estado: "RECHAZADO",
          motivo_rechazo: motivo.trim(),
        },
      });

      await tx.movimientoCheque.create({
        data: {
          chequeId: ch.id,
          estado_origen: estadoAnterior,
          estado_destino: "RECHAZADO",
          motivo: `Rechazado. Motivo: ${motivo.trim()}`,
        },
      });

      if (ch.clienteId) {
        await tx.movimientoCuentaCorriente.create({
          data: {
            tenantId: tenant.id,
            clienteId: ch.clienteId,
            tipo: "CARGO",
            monto: ch.monto,
            metodo_pago: "CONTADO",
            notas: `[CHEQUE RECHAZADO] Banco ${ch.banco} N° ${ch.numero_cheque} - Motivo: ${motivo.trim()}`,
            usuarioId,
          },
        });
      }
    });

    revalidatePath("/finanzas/cartera-valores");
    revalidatePath("/cuentas-corrientes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
