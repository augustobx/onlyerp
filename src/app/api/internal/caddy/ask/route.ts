import { NextRequest, NextResponse } from "next/server";
import { normalizeHostname, resolveTenantByHostname } from "@/lib/tenant-context";

export async function GET(request: NextRequest) {
  const domain = normalizeHostname(request.nextUrl.searchParams.get("domain"));
  if (!domain) return new NextResponse(null, { status: 400 });

  try {
    const tenant = await resolveTenantByHostname(domain);
    return new NextResponse(null, { status: tenant ? 204 : 404 });
  } catch (error) {
    console.error("[Tenant Ask Error]", error);
    return new NextResponse(null, { status: 500 });
  }
}
