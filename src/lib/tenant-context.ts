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

const PLATFORM_HOST = (process.env.PLATFORM_HOST || "onlyerp.nanoapps.ar").toLowerCase();
const BASE_DOMAIN = (process.env.TENANT_BASE_DOMAIN || "nanoapps.ar").toLowerCase();

export function normalizeHostname(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().split(":")[0].replace(/\.$/, "");
}

function mapTenant(tenant: any): TenantContext {
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

/**
 * Calcula la lista de módulos efectivos para un tenant
 * combinando los módulos del plan base con los overrides del tenant.
 */
export function calcularModulosEfectivos(planModulosJson: string, overridesJson?: string | null): string[] {
  try {
    const planModulos: string[] = JSON.parse(planModulosJson || "[]");
    if (!overridesJson) return planModulos;

    const overrides = JSON.parse(overridesJson);
    if (Array.isArray(overrides)) {
      return Array.from(new Set([...planModulos, ...overrides]));
    }

    const modulosSet = new Set(planModulos);
    for (const [modulo, activo] of Object.entries(overrides)) {
      if (activo) modulosSet.add(modulo);
      else modulosSet.delete(modulo);
    }
    return Array.from(modulosSet);
  } catch {
    return ["VENTAS", "CLIENTES", "PRODUCTOS"];
  }
}

/**
 * Resolución determinística por hostname para producción y para nanoapps-router.
 * No usa sesión ni fallback: si el host no pertenece a OnlyERP devuelve null.
 */
export async function resolveTenantByHostname(hostname: string): Promise<TenantContext | null> {
  const cleanHost = normalizeHostname(hostname);
  if (!cleanHost || cleanHost === PLATFORM_HOST) return null;

  let tenant = null;

  if (cleanHost.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = cleanHost.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) {
      tenant = await prisma.tenant.findUnique({
        where: { slug },
        include: { plan: true },
      });
    }
  }

  if (!tenant) {
    tenant = await prisma.tenant.findFirst({
      where: { dominio_personalizado: cleanHost },
      include: { plan: true },
    });
  }

  if (!tenant || tenant.estado === "CANCELADO") return null;
  return mapTenant(tenant);
}

/**
 * Resuelve el Tenant actual en el servidor:
 * 1. Host / x-forwarded-host.
 * 2. Sesión JWT del usuario autenticado.
 * 3. Fallback solo en desarrollo local.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  let host = "";
  try {
    const headerList = await headers();
    host = headerList.get("x-forwarded-host")?.split(",")[0] || headerList.get("host") || "";
  } catch {
    // Puede ejecutarse fuera del contexto HTTP de Next.js.
  }

  const hostname = normalizeHostname(host);
  if (hostname && !["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) {
    const tenant = await resolveTenantByHostname(hostname);
    if (tenant) return tenant;
  }

  const session = await getSessionUser();
  if (session?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: Number(session.tenantId) },
      include: { plan: true },
    });

    if (tenant && tenant.estado !== "CANCELADO") return mapTenant(tenant);
  }

  if (process.env.NODE_ENV !== "production") {
    const fallbackTenant = await prisma.tenant.findFirst({
      where: { estado: "ACTIVO" },
      include: { plan: true },
      orderBy: { id: "asc" },
    });
    if (fallbackTenant) return mapTenant(fallbackTenant);
  }

  return null;
}

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

export async function hasModule(moduleCode: string): Promise<boolean> {
  const tenant = await getTenantContext();
  if (!tenant) return false;
  return tenant.modulos.includes(moduleCode);
}
