"use server";

import { requireModule, requireTenantAdmin } from "@/lib/module-access";

import { withTenantQuota, assertQuota } from '@/lib/tenant-quota';
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function crearSucursal(nombre: string, direccion: string, telefono: string) {
  await requireTenantAdmin();

  try {
    const tenant = await requireTenant();
    return await withTenantQuota(tenant.id, async (prisma) => {
      await assertQuota(prisma, tenant.id, 'locations'); await assertQuota(prisma, tenant.id, 'warehouses');

    if (!nombre) throw new Error("El nombre de la sucursal es obligatorio.");

    const sucursal = await prisma.sucursal.create({
      data: {
        tenantId: tenant.id,
        nombre,
        direccion,
        telefono,
        estado: true,
      },
    });

    const deposito = await prisma.deposito.create({
      data: {
        tenantId: tenant.id,
        nombre: `Depósito Principal - ${nombre}`,
        sucursalId: sucursal.id,
        estado: true,
      },
    });

    const todosLosProductos = await prisma.producto.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    if (todosLosProductos.length > 0) {
      await prisma.stockUbicacion.createMany({
        data: todosLosProductos.map((p) => ({
          productoId: p.id,
          depositoId: deposito.id,
          cantidad: 0,
        })),
      });
    }

    revalidatePath("/configuracion/sucursales");
    revalidatePath("/ventas");
    revalidatePath("/caja");
    return { success: true as const, data: sucursal };
  
    });
} catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function editarSucursal(id: number, nombre: string, direccion: string, telefono: string, estado: boolean) {
  await requireTenantAdmin();

  try {
    await prisma.sucursal.update({
      where: { id, tenantId: (await requireTenantAdmin()).id },
      data: { nombre, direccion, telefono, estado },
    });
    revalidatePath("/configuracion/sucursales");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Error al actualizar la sucursal." };
  }
}

export async function crearDeposito(nombre: string, sucursalId: number) {
  await requireTenantAdmin();

  try {
    const tenant = await requireTenant();
    return await withTenantQuota(tenant.id, async (prisma) => {
      await assertQuota(prisma, tenant.id, 'warehouses'); if (!await prisma.sucursal.findFirst({where:{id:sucursalId,tenantId:tenant.id}})) throw Error('Sucursal fuera de la empresa.');

    if (!nombre || !sucursalId) throw new Error("Todos los campos son obligatorios.");

    const deposito = await prisma.deposito.create({
      data: {
        tenantId: tenant.id,
        nombre,
        sucursalId,
        estado: true,
      },
    });

    const todosLosProductos = await prisma.producto.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    if (todosLosProductos.length > 0) {
      await prisma.stockUbicacion.createMany({
        data: todosLosProductos.map((p) => ({
          productoId: p.id,
          depositoId: deposito.id,
          cantidad: 0,
        })),
      });
    }

    revalidatePath("/configuracion/sucursales");
    return { success: true as const, data: deposito };
  
    });
} catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function editarDeposito(id: number, nombre: string, estado: boolean) {
  await requireTenantAdmin();

  try {
    await prisma.deposito.update({
      where: { id, tenantId: (await requireTenantAdmin()).id },
      data: { nombre, estado },
    });
    revalidatePath("/configuracion/sucursales");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Error al actualizar el depósito." };
  }
}
