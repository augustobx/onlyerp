"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

// --- CATEGORÍAS ---
export async function getCategorias() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  return await prisma.categoria.findMany({
    where: { tenantId: tenant.id },
    orderBy: { nombre: "asc" },
  });
}

export async function crearCategoria(formData: FormData) {
  const tenant = await requireTenant();
  const nombre = formData.get("nombre") as string;
  if (!nombre) return;

  await prisma.categoria.create({
    data: { tenantId: tenant.id, nombre },
  });

  revalidatePath("/categorias");
  revalidatePath("/inventario/nuevo");
}

// --- LISTAS DE PRECIOS ---
export async function getListasPrecio() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  return await prisma.listaPrecio.findMany({
    where: { tenantId: tenant.id },
    orderBy: { nombre: "asc" },
  });
}

export async function crearListaPrecio(formData: FormData) {
  const tenant = await requireTenant();
  const nombre = formData.get("nombre") as string;
  const margen_defecto = parseFloat(formData.get("margen_defecto") as string);

  if (!nombre || isNaN(margen_defecto)) return;

  await prisma.listaPrecio.create({
    data: { tenantId: tenant.id, nombre, margen_defecto },
  });

  revalidatePath("/listas-precio");
  revalidatePath("/inventario/nuevo");
}

// --- SUCURSALES Y DEPÓSITOS ---
export async function getSucursales() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  return await prisma.sucursal.findMany({
    where: { tenantId: tenant.id, estado: true },
    include: { depositos: true },
    orderBy: { nombre: "asc" },
  });
}

export async function getDepositos(sucursalId?: number) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  const whereClause: any = { tenantId: tenant.id, estado: true };
  if (sucursalId) {
    whereClause.sucursalId = sucursalId;
  }

  return await prisma.deposito.findMany({
    where: whereClause,
    orderBy: { nombre: "asc" },
  });
}