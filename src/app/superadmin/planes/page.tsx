import { getPlans } from "@/app/actions/superadmin";
import { getSuperAdminSession } from "@/lib/superadmin-session";
import { redirect } from "next/navigation";
import { Layers, CheckCircle2, Users, Store, Package } from "lucide-react";

export default async function SuperAdminPlanesPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/superadmin/login");
  }

  const planes = await getPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-emerald-400" />
          Planes SaaS y Módulos Base
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Estructura de precios, límites de recursos y paquetes de módulos incluidos por nivel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planes.map((plan) => {
          const modulos: string[] = JSON.parse(plan.modulos || "[]");

          return (
            <div
              key={plan.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {plan.codigo}
                  </span>
                  <span className="text-xs text-slate-400">
                    {plan._count.tenants} empresas
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white">{plan.nombre}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    ${plan.precio_mensual.toLocaleString("es-AR")}
                  </span>
                  <span className="text-xs text-slate-400">/mes</span>
                </div>

                <p className="text-xs text-slate-400 mt-3 pb-4 border-b border-slate-800">
                  {plan.descripcion}
                </p>

                {/* Limits */}
                <div className="py-4 space-y-2 text-xs text-slate-300 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Límite de Usuarios
                    </span>
                    <span className="font-semibold text-white">{plan.limite_usuarios}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Store className="w-3.5 h-3.5 text-cyan-400" />
                      Sucursales
                    </span>
                    <span className="font-semibold text-white">{plan.limite_sucursales}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                      Depósitos
                    </span>
                    <span className="font-semibold text-white">{plan.limite_depositos}</span>
                  </div>
                </div>

                {/* Included Modules */}
                <div className="pt-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Módulos Incluidos ({modulos.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {modulos.map((m) => (
                      <span
                        key={m}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 font-mono"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
