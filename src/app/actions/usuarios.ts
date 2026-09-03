"use server";

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function getUsuarios() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return [];

    return await prisma.usuario.findMany({
      where: { tenantId: tenant.id },
      include: { sucursal: true, lista_precio: true },
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getVendedoresActivos() {
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
  try {
    const tenant = await requireTenant();

    const id = formData.get("id") ? Number(formData.get("id")) : null;
    const nombre = formData.get("nombre") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const telefono = (formData.get("telefono") as string)?.trim() || null;
    const sucursalIdRaw = formData.get("sucursalId");
    const sucursalIdStr =
      sucursalIdRaw && sucursalIdRaw !== "null" && sucursalIdRaw !== "" ? Number(sucursalIdRaw) : null;
    const listaPrecioIdRaw = formData.get("listaPrecioId");
    const listaPrecioId =
      listaPrecioIdRaw && listaPrecioIdRaw !== "null" && listaPrecioIdRaw !== "" ? Number(listaPrecioIdRaw) : null;
    const listasPermitidasRaw = (formData.get("listas_permitidas") as string)?.trim() || null;

    const totalUsuarios = await prisma.usuario.count({
      where: { tenantId: tenant.id },
    });
    const rolForm = formData.get("rol") as string;
    const rol = totalUsuarios === 0 ? "ADMIN" : rolForm || "CAJERO";

    if (id) {
      const dataUpdate: any = {
        nombre,
        username,
        telefono,
        permisos: permisosJSON,
        sucursalId: sucursalIdStr,
        listaPrecioId,
        listas_permitidas: listasPermitidasRaw,
      };
      if (rolForm) {
        dataUpdate.rol = rolForm;
      }
      if (password && password.trim() !== "") {
        dataUpdate.password = hashPassword(password);
      }

      await prisma.usuario.update({
        where: { id },
        data: dataUpdate,
      });
    } else {
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
          listaPrecioId,
          listas_permitidas: listasPermitidasRaw,
          activo: true,
        },
      });
    }

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") return { success: false, error: "El nombre de usuario ya está en uso en tu empresa." };
    return { success: false, error: error.message || "Error al guardar el usuario." };
  }
}

export async function eliminarUsuario(id: number) {
  try {
    await prisma.usuario.delete({ where: { id } });
    revalidatePath("/usuarios");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo eliminar el usuario." };
  }
}

export async function toggleActivoUsuario(id: number, estadoActual: boolean) {
  try {
    await prisma.usuario.update({
      where: { id },
      data: { activo: !estadoActual },
    });
    revalidatePath("/usuarios");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo cambiar el estado del usuario." };
  }
}