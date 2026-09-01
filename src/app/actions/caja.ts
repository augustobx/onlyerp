"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getClientSession } from "./auth";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// 1. Obtener la caja abierta (si existe)
export async function getCajaActiva(sucursalId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const caja = await prisma.cajaDiaria.findFirst({
      where: { tenantId: tenant.id, estado: "ABIERTA", sucursalId },
      include: {
        movimientos: {
          orderBy: { fecha: "desc" },
          include: { usuario: { select: { nombre: true } } },
        },
      },
    });

    if (caja && caja.movimientos.length > 0) {
      const ventaIds = caja.movimientos.map((m: any) => m.ventaId).filter((id: any) => id !== null);
      if (ventaIds.length > 0) {
        const ventas = await prisma.venta.findMany({
          where: { tenantId: tenant.id, id: { in: ventaIds } },
          include: { cliente: true },
        });
        caja.movimientos.forEach((m: any) => {
          if (m.ventaId) m.venta = ventas.find((v) => v.id === m.ventaId);
        });
      }
    }

    return { success: true, data: caja };
  } catch {
    return { success: false, error: "Error al consultar la caja." };
  }
}

// 2. Obtener el historial de cajas cerradas
export async function getHistorialCajas(sucursalId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const cajas = await prisma.cajaDiaria.findMany({
      where: { tenantId: tenant.id, estado: "CERRADA", sucursalId },
      include: {
        movimientos: {
          orderBy: { fecha: "desc" },
          include: { usuario: { select: { nombre: true } } },
        },
      },
      orderBy: { fecha_apertura: "desc" },
      take: 30,
    });

    if (cajas && cajas.length > 0) {
      const allMovs = cajas.flatMap((c) => c.movimientos);
      const ventaIds = allMovs.map((m: any) => m.ventaId).filter((id: any) => id !== null);
      if (ventaIds.length > 0) {
        const ventas = await prisma.venta.findMany({
          where: { tenantId: tenant.id, id: { in: ventaIds } },
          include: { cliente: true },
        });
        allMovs.forEach((m: any) => {
          if (m.ventaId) m.venta = ventas.find((v) => v.id === m.ventaId);
        });
      }
    }

    return { success: true, data: cajas };
  } catch {
    return { success: false, error: "Error al cargar el historial de cajas." };
  }
}

// 3. Abrir el turno de caja
export async function abrirCaja(saldo_inicial: number, sucursalId: number) {
  try {
    const tenant = await requireTenant();

    const cajaExistente = await prisma.cajaDiaria.findFirst({
      where: { tenantId: tenant.id, estado: "ABIERTA", sucursalId },
    });
    if (cajaExistente) throw new Error("Ya existe una caja abierta en esta sucursal. Ciérrela primero.");

    const session = await getClientSession();
    const usuarioId = (session as any)?.id ? Number((session as any).id) : null;

    await prisma.$transaction(async (tx) => {
      const nuevaCaja = await tx.cajaDiaria.create({
        data: {
          tenantId: tenant.id,
          saldo_inicial,
          sucursalId,
        },
      });

      await tx.movimientoCaja.create({
        data: {
          cajaId: nuevaCaja.id,
          tipo: "APERTURA",
          metodo_pago: "CONTADO",
          monto: saldo_inicial,
          descripcion: "Apertura de Caja",
          usuarioId,
        },
      });
    });

    revalidatePath("/caja");
    revalidatePath("/ventas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Retiros o Ingresos Manuales
export async function registrarMovimientoManual(
  cajaId: number,
  tipo: "INGRESO_MANUAL" | "EGRESO_MANUAL",
  monto: number,
  descripcion: string
) {
  try {
    if (monto <= 0) throw new Error("El monto debe ser mayor a 0.");

    const session = await getClientSession();
    const usuarioId = (session as any)?.id ? Number((session as any).id) : null;

    await prisma.movimientoCaja.create({
      data: {
        cajaId,
        tipo,
        metodo_pago: "CONTADO",
        monto,
        descripcion,
        usuarioId,
      },
    });

    revalidatePath("/caja");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Cierre de Caja
export async function cerrarCaja(cajaId: number, saldo_real_efectivo: number) {
  try {
    const tenant = await requireTenant();

    const caja = await prisma.cajaDiaria.findFirst({
      where: { id: cajaId, tenantId: tenant.id },
      include: { movimientos: true },
    });
    if (!caja) throw new Error("Caja no encontrada.");

    let saldo_esperado_efectivo = 0;

    for (const mov of caja.movimientos) {
      if (mov.metodo_pago === "CONTADO") {
        if (["APERTURA", "INGRESO_MANUAL", "VENTA", "COBRO_CC"].includes(mov.tipo)) {
          saldo_esperado_efectivo += mov.monto;
        } else if (mov.tipo === "EGRESO_MANUAL") {
          saldo_esperado_efectivo -= mov.monto;
        }
      }
    }

    const diferencia = saldo_real_efectivo - saldo_esperado_efectivo;

    let gananciaCalculada = 0;
    const ventaIds = caja.movimientos
      .filter((m: any) => m.ventaId !== null)
      .map((m: any) => m.ventaId)
      .filter((value: any, index: number, self: any[]) => self.indexOf(value) === index);

    if (ventaIds.length > 0) {
      const ventasDelTurno = await prisma.venta.findMany({
        where: { tenantId: tenant.id, id: { in: ventaIds as number[] } },
        include: { detalles: { include: { producto: true } } },
      });

      for (const v of ventasDelTurno) {
        let costoVenta = 0;
        for (const det of v.detalles) {
          const costoUnit = det.costo_unitario > 0 ? det.costo_unitario : det.producto.precio_costo;
          costoVenta += (det.cantidad - (det.cantidad_devuelta || 0)) * costoUnit;
        }
        gananciaCalculada += v.total - costoVenta;
      }
    }

    await prisma.cajaDiaria.update({
      where: { id: cajaId },
      data: {
        estado: "CERRADA",
        fecha_cierre: new Date(),
        saldo_esperado: saldo_esperado_efectivo,
        saldo_real: saldo_real_efectivo,
        diferencia,
        ganancia: gananciaCalculada,
      },
    });

    revalidatePath("/caja");
    return {
      success: true,
      data: { esperado: saldo_esperado_efectivo, diferencia, ganancia: gananciaCalculada },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}