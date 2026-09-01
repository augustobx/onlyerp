import { getPlans } from "@/app/actions/superadmin";
import { getSuperAdminSession } from "@/lib/superadmin-session";
import { redirect } from "next/navigation";
import { PlanesClient } from "./planes-client";

export default async function SuperAdminPlanesPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect("/superadmin/login");
  }

  const planes = await getPlans();

  return <PlanesClient planes={planes} />;
}
