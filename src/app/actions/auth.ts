"use server";

import prisma from "@/lib/prisma";
import { crearSesion, cerrarSesion, getSessionUser } from "@/lib/session";
import { getTenantContext } from "@/lib/tenant-context";
import { verifyPassword, hashPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import { actualizarEstadoMembresiaTenant } from "@/lib/membership";

export async function getClientSession() {
  const payload = await getSessionUser();
  if (!payload || !payload.id) return null;

  try {
    const userFresh = await prisma.usuario.findUnique({
      where: { id: payload.id as number },
      include: { tenant: { include: { plan: true } } },
    });

    if (userFresh && userFresh.tenant) {
      if (userFresh.tenant.estado === "SUSPENDIDO" || userFresh.tenant.estado === "CANCELADO") {
        await cerrarSesion();
        return null;
      }

      return {
        ...payload,
        tenantId: userFresh.tenantId,
        tenantNombre: userFresh.tenant.nombre,
        tenantSlug: userFresh.tenant.slug,
        sucursalId: userFresh.sucursalId,
        permisos: typeof userFresh.permisos === "string" ? JSON.parse(userFresh.permisos || "[]") : userFresh.permisos,
        rol: userFresh.rol,
      };
    }
  } catch (e) {
    console.error("Error refreshing session:", e);
  }
  return payload;
}

export async function login(formData: FormData) {
  try {
    const username = (formData.get("username") as string)?.trim();
    const password = formData.get("password") as string;
    const tenantSlug = (formData.get("tenantSlug") as string)?.trim()?.toLowerCase();

    if (!username || !password) {
      return { success: false, error: "Ingresá usuario y contraseña." };
    }

    // Resolver tenant actual por contexto (host) o por slug provisto en formulario
    let currentTenant = await getTenantContext();

    let usuario = null;

    if (currentTenant) {
      usuario = await prisma.usuario.findFirst({
        where: {
          tenantId: currentTenant.id,
          username,
        },
        include: { tenant: true },
      });
    } else if (tenantSlug) {
      const specificTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (specificTenant) {
        usuario = await prisma.usuario.findFirst({
          where: {
            tenantId: specificTenant.id,
            username,
          },
          include: { tenant: true },
        });
      }
    } else {
      // Búsqueda global si estamos en dominio raíz o localhost
      const matchingUsers = await prisma.usuario.findMany({
        where: { username },
        include: { tenant: true },
      });

      if (matchingUsers.length === 1) {
        usuario = matchingUsers[0];
      } else if (matchingUsers.length > 1) {
        return {
          success: false,
          error: "Existe más de una empresa con este usuario. Por favor ingresá desde el subdominio de tu empresa.",
        };
      }
    }

    if (!usuario || !verifyPassword(password, usuario.password)) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    // Actualizar automáticamente el estado si la membresía venció
    const tenantActualizado = await actualizarEstadoMembresiaTenant(usuario.tenantId);

    if (tenantActualizado?.estado === "SUSPENDIDO") {
      return {
        success: false,
        error: "La suscripción de la empresa está suspendida. Contactá al soporte de NanoLabs.",
      };
    }

    if (usuario.tenant.estado === "CANCELADO") {
      return {
        success: false,
        error: "La cuenta de esta empresa ha sido dada de baja.",
      };
    }

    // Comprobar estado del usuario
    if (!usuario.activo) {
      return { success: false, error: "Tu usuario ha sido desactivado. Contactá al administrador de tu empresa." };
    }

    // Rehasheo transparente si la contraseña estaba en texto plano
    if (!usuario.password.includes(":") || usuario.password.length < 50) {
      const hashedPassword = hashPassword(password);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { password: hashedPassword },
      });
    }

    // Crear sesión autenticada con tenantId
    await crearSesion(usuario, usuario.tenantId);
    return { success: true, rol: usuario.rol, tenantSlug: usuario.tenant.slug };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Error interno del servidor al iniciar sesión." };
  }
}

export async function logout() {
  await cerrarSesion();
  redirect("/login");
}