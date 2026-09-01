import { getTenantsList, getPlans } from "@/app/actions/superadmin";
import { getSuperAdminSession } from "@/lib/superadmin-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TenantsManagerClient } from "./tenants-client";

export default async function SuperAdminTenantsPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/superadmin/login");
  }

  const [tenants, planes] = await Promise.all([
    getTenantsList(),
    getPlans(),
  ]);

  return (
    <TenantsManagerClient tenants={tenants} planes={planes} />
  );
}
