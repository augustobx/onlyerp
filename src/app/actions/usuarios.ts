"use server";

import { requireModule, requireTenantAdmin } from "@/lib/module-access";

import { withTenantQuota, assertQuota } from '@/lib/tenant-quota';
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function getUsuarios() {
  await requireTenantAdmin();

  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.usuario.findMany({
      where: { tenantId: tenant.id },
      select: { id:true, tenantId:true, nombre:true, username:true, rol:true, permisos:true, activo:true, telefono:true, comision_personalizada:true, limite_desc_vendedor:true, sucursalId:true, listaPrecioId:true, listas_permitidas:true, sucursal:true, lista_precio:true },
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getVendedoresActivos() {
  await requireModule('VENDEDORES_PWA');

  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.usuario.findMany({
      where: {
        tenantId: tenant.id,
        activo: true,
        rol: { in: ["VENDEDOR", "MIXTO", "ADMIN", "CAJERO"] },
      },
      select: { id: true, nombre: true, rol: true, username: true, telefono: true },
      orderBy: { nombre: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getRepartidoresActivos() {
  await requireModule('VENDEDORES_PWA');

  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.usuario.findMany({
      where: {
        tenantId: tenant.id,
        activo: true,
        rol: { in: ["REPARTIDOR", "MIXTO", "ADMIN"] },
      },
      select: { id: true, nombre: true, rol: true, username: true, telefono: true },
      orderBy: { nombre: "asc" },
    });
  } catch {
    return [];
  }
}

export async function guardarUsuario(formData: FormData, permisosJSON: string) {
  await requireTenantAdmin();

  try {
    const tenant = await requireTenant();
    return await withTenantQuota(tenant.id, async (prisma) => {
      


    const id = formData.get("id") ? Number(formData.get("id")) : null;
    const nombre = formData.get("nombre") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const telefono = (formData.get("telefono") as string)?.trim() || null;
    const sucursalIdRaw = formData.get("sucursalId");
    const sucursalIdStr =
      sucursalIdRaw && sucursalIdRaw !== "null" && sucursalIdRaw !== "" ? Number(sucursalIdRaw) : null;
    const listaPrecioIdRaw = formData.get("listaPrecioId");
    const listasPermitidasRaw = (formData.get("listas_permitidas") as string)?.trim() || null;

    let finalListaPrecioId: number | null =
      listaPrecioIdRaw && listaPrecioIdRaw !== "null" && listaPrecioIdRaw !== "" ? Number(listaPrecioIdRaw) : null;
    let finalListasPermitidas: string | null = null;

    if (listasPermitidasRaw && listasPermitidasRaw !== "" && listasPermitidasRaw !== "null" && listasPermitidasRaw !== "[]") {
      try {
        const parsed = JSON.parse(listasPermitidasRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          finalListasPermitidas = JSON.stringify(parsed.map(Number).filter(Boolean));
          if (!finalListaPrecioId || !parsed.includes(finalListaPrecioId)) {
            finalListaPrecioId = Number(parsed[0]);
          }
        }
      } catch {}
    }

    const totalUsuarios = await prisma.usuario.count({
      where: { tenantId: tenant.id },
    });
    const rolForm = formData.get("rol") as string;
    const rol = totalUsuarios === 0 ? "ADMIN" : rolForm || "CAJERO";

    if (id) {
      const dataUpdate: any = {
        sessionVersion: { increment: 1 },
        nombre,
        username,
        telefono,
        permisos: permisosJSON,
        sucursalId: sucursalIdStr,
        listaPrecioId: finalListaPrecioId,
        listas_permitidas: finalListasPermitidas,
      };
      if (rolForm) {
        dataUpdate.rol = rolForm;
      }
      if (password && password.trim() !== "") {
        dataUpdate.password = hashPassword(password);
      }

      await prisma.usuario.update({
        where: { id, tenantId: tenant.id },
        data: dataUpdate,
      });
    } else {
      await assertQuota(prisma, tenant.id, 'users');
      if (!password) throw new Error("La contraseña es obligatoria para un nuevo usuario.");

      await prisma.usuario.create({
        data: {
          tenantId: tenant.id,
          nombre,
          username,
          password: hashPassword(password),
          telefono,
          rol,
          permisos: permisosJSON,
          sucursalId: sucursalIdStr,
          listaPrecioId: finalListaPrecioId,
          listas_permitidas: finalListasPermitidas,
          activo: true,
        },
      });
    }

    revalidatePath("/usuarios");
    return { success: true as const };
  
    });
} catch (error: any) {
    if (error.code === "P2002") return { success: false as const, error: "El nombre de usuario ya está en uso en tu empresa." };
    return { success: false as const, error: error.message || "Error al guardar el usuario." };
  }
}

export async function eliminarUsuario(id: number) {
  await requireTenantAdmin();

  try {
    await prisma.usuario.update({ where: { id, tenantId: (await requireTenantAdmin()).id }, data: {activo:false,sessionVersion:{increment:1}} });
    revalidatePath("/usuarios");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "No se pudo eliminar el usuario." };
  }
}

export async function toggleActivoUsuario(id: number, estadoActual: boolean) {
  await requireTenantAdmin();

  try {
    await prisma.usuario.update({
      where: { id, tenantId: (await requireTenantAdmin()).id },
      data: { activo: !estadoActual, sessionVersion: { increment: 1 } },
    });
    revalidatePath("/usuarios");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "No se pudo cambiar el estado del usuario." };
  }
}
