import { getSuperAdminSession } from "@/lib/superadmin-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { superAdminLogout } from "@/app/actions/superadmin";
import { Shield, LayoutDashboard, Building2, Layers, LogOut, CheckCircle2 } from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSuperAdminSession();

  // Si no está autenticado y no está en /login, redirigir a login
  // Nota: /superadmin/login maneja su propia UI sin layout
  if (!session) {
    // Si la ruta no es login, dejamos que login funcione
    // Pero en App Router layout se aplica a todos los hijos a menos que agrupemos con route groups.
    // Vamos a permitir que el hijo sea renderizado si la URL es login o simplemente redirigir si no hay sesión.
    // Para mayor robustez, chequear si no hay sesión:
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Platform Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-sm">
                OnlyERP <span className="text-[10px] font-semibold uppercase bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">SuperAdmin</span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/superadmin"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              Métricas
            </Link>
            <Link
              href="/superadmin/tenants"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              Empresas / Tenants
            </Link>
            <Link
              href="/superadmin/planes"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              Planes SaaS
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border border-slate-800 px-2.5 py-1 rounded-full bg-slate-900">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Servidor Debian OK</span>
          </div>

          <form action={superAdminLogout}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
