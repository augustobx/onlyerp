import { headers } from "next/headers";
import { resolveTenantByHostname, normalizeHostname, getTenantContext } from "@/lib/tenant-context";
import TenantLoginClient from "./TenantLoginClient";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  let tenantName = "OnlyERP";
  try {
    const requestHeaders = await headers();
    const host = normalizeHostname(requestHeaders.get("host") || "");
    const resolved = await resolveTenantByHostname(host);
    if (resolved?.nombre) {
      tenantName = resolved.nombre;
    } else {
      const current = await getTenantContext();
      if (current?.nombre) {
        tenantName = current.nombre;
      }
    }
  } catch (e) {
    console.error("Error generating metadata for login:", e);
  }

  return {
    title: `${tenantName} | Iniciar Sesión`,
    description: `Ingreso al sistema de gestión de ${tenantName}`,
  };
}

export default async function LoginPage() {
  let tenantName = "OnlyERP";
  let tenantArea = "NanoLabs · Business Cloud";
  let tenantBajada = "Sistema integral de gestión comercial, inventario y facturación.";
  let tenantLogo: string | null = null;
  let tenantSlug = "";

  try {
    const requestHeaders = await headers();
    const host = normalizeHostname(requestHeaders.get("host") || "");
    let tenant = await resolveTenantByHostname(host);
    if (!tenant) {
      tenant = await getTenantContext();
    }

    if (tenant) {
      tenantName = tenant.nombre;
      tenantArea = `${tenant.nombre} · Gestión Empresarial`;
      tenantBajada = `Sistema integral de gestión comercial y empresarial para ${tenant.nombre}.`;
      tenantLogo = tenant.logoUrl || null;
      tenantSlug = tenant.slug;
    }
  } catch (e) {
    console.error("Error resolving tenant context in LoginPage:", e);
  }

  return (
    <TenantLoginClient
      tenantName={tenantName}
      tenantArea={tenantArea}
      tenantBajada={tenantBajada}
      tenantLogo={tenantLogo}
      tenantSlug={tenantSlug}
    />
  );
}