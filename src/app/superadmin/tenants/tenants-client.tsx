"use client";

import { useState } from "react";
import Link from "next/link";
import { createTenant } from "@/app/actions/superadmin";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Settings,
  Users,
  Store,
  Package,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function TenantsManagerClient({
  tenants,
  planes,
}: {
  tenants: any[];
  planes: any[];
}) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredTenants = tenants.filter(
    (t) =>
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.cuit && t.cuit.includes(search))
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const input = {
      nombre: formData.get("nombre") as string,
      slug: formData.get("slug") as string,
      planId: Number(formData.get("planId")),
      cuit: (formData.get("cuit") as string) || undefined,
      direccion: (formData.get("direccion") as string) || undefined,
      telefono: (formData.get("telefono") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      adminNombre: formData.get("adminNombre") as string,
      adminUsername: formData.get("adminUsername") as string,
      adminPassword: formData.get("adminPassword") as string,
    };

    try {
      const res = await createTenant(input);
      if (res.success) {
        toast.success(`Empresa '${input.nombre}' creada y aprovisionada con éxito.`);
        setIsCreateOpen(false);
        form.reset();
      } else {
        toast.error(res.error || "Error al crear la empresa.");
      }
    } catch {
      toast.error("Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Gestión de Empresas (Tenants)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aprovisionamiento automático, asignación de planes y estado operativo.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Aprovisionar Empresa
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nombre, subdominio o CUIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Empresa & Dominio</th>
                <th className="py-3.5 px-6">Plan SaaS</th>
                <th className="py-3.5 px-6">Recursos Creados</th>
                <th className="py-3.5 px-6">Estado</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No se encontraron empresas con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{t.nombre}</div>
                      <div className="text-xs text-indigo-400 font-mono mt-0.5 flex items-center gap-1">
                        {t.slug}.onlyerp.site
                        <a
                          href={`http://${t.slug}.localhost:3000`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {t.cuit && <div className="text-[11px] text-slate-500 mt-0.5">CUIT: {t.cuit}</div>}
                    </td>

                    <td className="py-4 px-6">
                      <div className="inline-block px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700">
                        {t.plan.nombre}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                        ${t.plan.precio_mensual.toLocaleString("es-AR")}/mes
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1" title="Usuarios">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          {t._count.usuarios}
                        </span>
                        <span className="flex items-center gap-1" title="Sucursales">
                          <Store className="w-3.5 h-3.5 text-cyan-400" />
                          {t._count.sucursales}
                        </span>
                        <span className="flex items-center gap-1" title="Productos">
                          <Package className="w-3.5 h-3.5 text-emerald-400" />
                          {t._count.productos}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {t.estado === "ACTIVO" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Activo
                        </span>
                      )}
                      {t.estado === "PRUEBA" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          Prueba
                        </span>
                      )}
                      {t.estado === "SUSPENDIDO" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <X className="w-3 h-3" />
                          Suspendido
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-300 border border-slate-700 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Aprovisionamiento de Tenant */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Aprovisionar Nueva Empresa SaaS
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Se creará el tenant con su sucursal, depósito, lista de precios y usuario administrador.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    placeholder="Ej. Distribuidora San Martín"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subdominio (Slug) *</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      name="slug"
                      required
                      placeholder="sanmartin"
                      className="w-full bg-slate-950 border border-slate-800 rounded-l-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                    <span className="bg-slate-800 border border-l-0 border-slate-800 rounded-r-xl px-3 py-2 text-xs text-slate-400 font-mono">
                      .onlyerp.site
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Plan SaaS Asignado *</label>
                  <select
                    name="planId"
                    required
                    defaultValue={planes[0]?.id}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (${p.precio_mensual.toLocaleString("es-AR")}/mes)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">CUIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    name="cuit"
                    placeholder="30-12345678-9"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email de Contacto</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="admin@empresa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="011-4000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Administrator section */}
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-indigo-400 mb-3">
                  Usuario Administrador Inicial del Tenant
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      name="adminNombre"
                      required
                      placeholder="Juan Pérez"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de Usuario *</label>
                    <input
                      type="text"
                      name="adminUsername"
                      required
                      placeholder="admin"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña Inicial *</label>
                    <input
                      type="password"
                      name="adminPassword"
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Aprovisionando...</span>
                    </>
                  ) : (
                    <span>Crear y Aprovisionar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
