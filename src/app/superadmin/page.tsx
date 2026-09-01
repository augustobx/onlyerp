import { getSuperAdminDashboard } from "@/app/actions/superadmin";
import { getSuperAdminSession } from "@/lib/superadmin-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

export default async function SuperAdminDashboardPage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/superadmin/login");
  }

  const data = await getSuperAdminDashboard();

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Plano de Control OnlyERP
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supervisión global de empresas, suscripciones y módulos en producción.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/tenants"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Tenants</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{data.totalTenants}</span>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{data.activosTenants} activos</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{data.pruebaTenants} prueba</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">MRR Proyectado</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">
              ${data.mrrProyectado.toLocaleString("es-AR")}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Facturación mensual recurrente</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Planes Disponibles</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{data.planes.length}</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <span>Starter, Pro y Enterprise</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Suspendidos</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{data.suspendidosTenants}</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <span>Por falta de pago o baja</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Tenants & Plans Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants Table */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Empresas Registradas</h2>
            <Link
              href="/superadmin/tenants"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Ver todas ({data.totalTenants})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Empresa / Subdominio</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.ultimosTenants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No hay empresas registradas aún.
                    </td>
                  </tr>
                ) : (
                  data.ultimosTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>{t.nombre}</div>
                        <div className="text-xs text-indigo-400 font-mono">{t.slug}.onlyerp.site</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {t.plan.nombre}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {t.estado === "ACTIVO" && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Activo
                          </span>
                        )}
                        {t.estado === "PRUEBA" && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Prueba
                          </span>
                        )}
                        {t.estado === "SUSPENDIDO" && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            Suspendido
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/superadmin/tenants/${t.id}`}
                          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          Configurar
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plans Summary */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Planes y Cobertura</h2>
            <div className="space-y-4">
              {data.planes.map((p) => (
                <div key={p.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{p.nombre}</span>
                    <span className="text-xs font-bold text-indigo-400">
                      ${p.precio_mensual.toLocaleString("es-AR")}/mes
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.descripcion}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-900">
                    <span>{p._count.tenants} empresas suscriptas</span>
                    <span className="text-emerald-400 font-medium">Activo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link
              href="/superadmin/planes"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center justify-center gap-1"
            >
              Administrar Módulos de Planes
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
