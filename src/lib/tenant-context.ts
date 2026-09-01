import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type TenantContext = {
  id: number;
  slug: string;
  nombre: string;
  estado: string;
  logoUrl?: string | null;
  cuit?: string | null;
  planId: number;
  planCodigo: string;
  planNombre: string;
  modulos: string[];
};

/**
 * Calcula la lista de módulos efectivos para un tenant
 * Combinando los módulos del Plan base con los overrides del tenant.
 */
export function calcularModulosEfectivos(planModulosJson: string, overridesJson?: string | null): string[] {
  try {
    const planModulos: string[] = JSON.parse(planModulosJson || "[]");
    if (!overridesJson) return planModulos;

    const overrides = JSON.parse(overridesJson);
    if (Array.isArray(overrides)) {
      return Array.from(new Set([...planModulos, ...overrides]));
    }
    
    // Si es un objeto tipo { "LOGISTICA": true, "AFIP": false }
    const modulosSet = new Set(planModulos);
    for (const [modulo, activo] of Object.entries(overrides)) {
      if (activo) {
        modulosSet.add(modulo);
      } else {
        modulosSet.delete(modulo);
      }
    }
    return Array.from(modulosSet);
  } catch (error) {
    return ["VENTAS", "CLIENTES", "PRODUCTOS"];
  }
}

/**
 * Resuelve el Tenant actual en el servidor:
 * 1. A partir del Host header (subdominio o dominio personalizado).
 * 2. A partir de la sesión JWT del usuario autenticado.
 * 3. Fallback en desarrollo / local (tenant 'demo' o primer tenant activo).
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  let host = "";
  try {
    const headerList = await headers();
    host = headerList.get("host") || "";
  } catch {
    // Si se ejecuta fuera de contexto HTTP de Next.js
  }

  // 1. Intentar resolver por subdominio / host
  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1") && !host.startsWith("0.0.0.0")) {
    const cleanHost = host.split(":")[0];
    const parts = cleanHost.split(".");

    // Caso subdominio: slug.onlyerp.site o slug.nanoapps.site (mínimo 3 partes)
    if (parts.length >= 3) {
      const slug = parts[0].toLowerCase();
      // Evitar palabras reservadas de plataforma
      if (slug !== "www" && slug !== "app" && slug !== "admin" && slug !== "proxy" && slug !== "portainer" && slug !== "superadmin") {
        const tenant = await prisma.tenant.findUnique({
          where: { slug },
          include: { plan: true },
        });

        if (tenant && tenant.estado !== "CANCELADO") {
          return {
            id: tenant.id,
            slug: tenant.slug,
            nombre: tenant.nombre,
            estado: tenant.estado,
            logoUrl: tenant.logo_url,
            cuit: tenant.cuit,
            planId: tenant.planId,
            planCodigo: tenant.plan.codigo,
            planNombre: tenant.plan.nombre,
            modulos: calcularModulosEfectivos(tenant.plan.modulos, tenant.modulos_override),
          };
        }
      }
    }

    // Caso dominio personalizado
    const customTenant = await prisma.tenant.findFirst({
      where: { dominio_personalizado: cleanHost },
      include: { plan: true },
    });

    if (customTenant && customTenant.estado !== "CANCELADO") {
      return {
        id: customTenant.id,
        slug: customTenant.slug,
        nombre: customTenant.nombre,
        estado: customTenant.estado,
        logoUrl: customTenant.logo_url,
        cuit: customTenant.cuit,
        planId: customTenant.planId,
        planCodigo: customTenant.plan.codigo,
        planNombre: customTenant.plan.nombre,
        modulos: calcularModulosEfectivos(customTenant.plan.modulos, customTenant.modulos_override),
      };
    }
  }

  // 2. Intentar resolver por sesión del usuario logueado
  const session = await getSessionUser();
  if (session && session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: Number(session.tenantId) },
      include: { plan: true },
    });

    if (tenant && tenant.estado !== "CANCELADO") {
      return {
        id: tenant.id,
        slug: tenant.slug,
        nombre: tenant.nombre,
        estado: tenant.estado,
        logoUrl: tenant.logo_url,
        cuit: tenant.cuit,
        planId: tenant.planId,
        planCodigo: tenant.plan.codigo,
        planNombre: tenant.plan.nombre,
        modulos: calcularModulosEfectivos(tenant.plan.modulos, tenant.modulos_override),
      };
    }
  }

  // 3. Fallback para desarrollo / primer tenant
  const fallbackTenant = await prisma.tenant.findFirst({
    where: { estado: "ACTIVO" },
    include: { plan: true },
    orderBy: { id: "asc" },
  });

  if (fallbackTenant) {
    return {
      id: fallbackTenant.id,
      slug: fallbackTenant.slug,
      nombre: fallbackTenant.nombre,
      estado: fallbackTenant.estado,
      logoUrl: fallbackTenant.logo_url,
      cuit: fallbackTenant.cuit,
      planId: fallbackTenant.planId,
      planCodigo: fallbackTenant.plan.codigo,
      planNombre: fallbackTenant.plan.nombre,
      modulos: calcularModulosEfectivos(fallbackTenant.plan.modulos, fallbackTenant.modulos_override),
    };
  }

  return null;
}

/**
 * Exige que exista un tenant activo para la operación.
 * Lanza error si no se encuentra o si está suspendido.
 */
export async function requireTenant(): Promise<TenantContext> {
  const tenant = await getTenantContext();
  if (!tenant) {
    throw new Error("No se pudo identificar el Tenant de la empresa o no está activo.");
  }
  if (tenant.estado === "SUSPENDIDO") {
    throw new Error("La suscripción de este tenant se encuentra suspendida por falta de pago.");
  }
  return tenant;
}

/**
 * Verifica si un módulo específico está activo para el tenant actual.
 */
export async function hasModule(moduleCode: string): Promise<boolean> {
  const tenant = await getTenantContext();
  if (!tenant) return false;
  return tenant.modulos.includes(moduleCode);
}
