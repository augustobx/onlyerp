import { getTenantDetail, getPlans } from "@/app/actions/superadmin";
import { getSuperAdminSession } from "@/lib/superadmin-session";
import { redirect, notFound } from "next/navigation";
import { TenantDetailClient } from "./tenant-detail-client";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/superadmin/login");
  }

  const { id } = await params;
  const tenantId = Number(id);
  if (isNaN(tenantId)) notFound();

  const [tenant, planes] = await Promise.all([
    getTenantDetail(tenantId),
    getPlans(),
  ]);

  if (!tenant) notFound();

  return <TenantDetailClient tenant={tenant} planes={planes} />;
}
