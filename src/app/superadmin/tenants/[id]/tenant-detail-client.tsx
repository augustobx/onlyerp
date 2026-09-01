"use client";

import { useState } from "react";
import Link from "next/link";
import { updateTenant, registrarCobroSaaS } from "@/app/actions/superadmin";
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Shield,
  Layers,
  Users,
  Store,
  Package,
  ShoppingCart,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Globe,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

const ALL_MODULES = [
  { id: "VENTAS", name: "Punto de Venta (POS)", desc: "Emisión de tickets, comprobantes y arqueos" },
  { id: "COMPRAS", name: "Compras y Proveedores", desc: "Registro de facturas de compra y costos" },
  { id: "INVENTARIO", name: "Gestión de Inventario", desc: "Stock por depósito y movimientos" },
  { id: "CLIENTES", name: "Clientes y Cuentas Corrientes", desc: "Saldos, límites de crédito y cobranzas" },
  { id: "LISTAS_PRECIO", name: "Múltiples Listas de Precios", desc: "Márgenes y escalas por cliente/proveedor" },
  { id: "PRESUPUESTOS", name: "Presupuestos y Cotizaciones", desc: "Conversión de presupuestos a ventas" },
  { id: "VENDEDORES_PWA", name: "App PWA de Vendedores", desc: "Toma de pedidos en calle offline/online" },
  { id: "COMISIONES", name: "Liquidación de Comisiones", desc: "Comisiones y penalizaciones por vendedor" },
  { id: "AFIP", name: "Facturación Electrónica AFIP", desc: "CAE automático para Facturas A, B y C" },
  { id: "LOGISTICA", name: "Logística y Hojas de Ruta", desc: "Despacho, choferes y rendición de reparto" },
  { id: "CHEQUES", name: "Cartera de Valores y Cheques", desc: "Cheques físicos y eCheqs, endosos a proveedores" },
  { id: "WMS", name: "WMS Lotes y Vencimientos", desc: "Trazabilidad por lote y control de caducidad" },
  { id: "PORTAL_B2B", name: "Portal de Clientes B2B", desc: "Catálogo mayorista para autoservicio de clientes" },
];

export function TenantDetailClient({
  tenant,
  planes,
}: {
  tenant: any;
  planes: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState(tenant.estado);
  const [planId, setPlanId] = useState(tenant.planId);
  const [dominioPersonalizado, setDominioPersonalizado] = useState(tenant.dominio_personalizado || "");

  // Módulos heredados del plan
  const planModulos: string[] = JSON.parse(tenant.plan.modulos || "[]");

  // Overrides actuales del tenant
  const currentOverrides: Record<string, boolean> = tenant.modulos_override
    ? JSON.parse(tenant.modulos_override)
    : {};

  const [overrides, setOverrides] = useState<Record<string, boolean>>(currentOverrides);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  function isModuleActive(modId: string): boolean {
    if (overrides[modId] !== undefined) {
      return overrides[modId];
    }
    return planModulos.includes(modId);
  }

  function toggleModule(modId: string) {
    const currentState = isModuleActive(modId);
    setOverrides((prev) => ({
      ...prev,
      [modId]: !currentState,
    }));
  }

  async function handleSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await updateTenant(tenant.id, {
        nombre: formData.get("nombre") as string,
        estado,
        planId,
        dominio_personalizado: dominioPersonalizado || null,
        cuit: formData.get("cuit") as string,
        telefono: formData.get("telefono") as string,
        email: formData.get("email") as string,
        direccion: formData.get("direccion") as string,
        fecha_alta: formData.get("fecha_alta") as string,
        fecha_vencimiento: formData.get("fecha_vencimiento") as string,
        modulos_override: JSON.stringify(overrides),
      });

      if (res.success) {
        toast.success("Configuración del Tenant guardada exitosamente.");
      } else {
        toast.error(res.error || "Error al actualizar.");
      }
    } catch {
      toast.error("Error al procesar la actualización.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistrarPago(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await registrarCobroSaaS({
        tenantId: tenant.id,
        planId: tenant.planId,
        monto: Number(formData.get("monto")),
        metodo_pago: formData.get("metodo_pago") as string,
        periodo_mes: Number(formData.get("periodo_mes")),
        periodo_anio: Number(formData.get("periodo_anio")),
        referencia_pago: formData.get("referencia_pago") as string,
        notas: formData.get("notas") as string,
      });

      if (res.success) {
        toast.success("Cobro registrado y suscripción renovada.");
        setIsPaymentModalOpen(false);
      } else {
        toast.error(res.error || "Error al registrar el cobro.");
      }
    } catch {
      toast.error("Error al registrar pago.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/superadmin/tenants"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Empresas
        </Link>
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Registrar Cobro SaaS
        </button>
      </div>

      {/* Tenant Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{tenant.nombre}</h1>
              {tenant.estado === "ACTIVO" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Activo
                </span>
              )}
              {tenant.estado === "SUSPENDIDO" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  Suspendido
                </span>
              )}
            </div>
            <div className="text-xs text-indigo-400 font-mono mt-1 flex items-center gap-2">
              <span>{tenant.slug}.nanoapps.ar</span>
              {tenant.dominio_personalizado && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-sans flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {tenant.dominio_personalizado}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Counters */}
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <div className="text-slate-500">Usuarios</div>
            <div className="font-bold text-white text-sm">{tenant.usuarios.length}</div>
          </div>
          <div className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <div className="text-slate-500">Sucursales</div>
            <div className="font-bold text-white text-sm">{tenant._count.sucursales}</div>
          </div>
          <div className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <div className="text-slate-500">Productos</div>
            <div className="font-bold text-white text-sm">{tenant._count.productos}</div>
          </div>
          <div className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <div className="text-slate-500">Ventas</div>
            <div className="font-bold text-white text-sm">{tenant._count.ventas}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveGeneral} className="space-y-6">
        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* General & Plan Settings */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Estado y Plan de Suscripción
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de Empresa</label>
              <input
                type="text"
                name="nombre"
                defaultValue={tenant.nombre}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Estado Operativo</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ACTIVO">Activo (Habilitado 100%)</option>
                <option value="PRUEBA">Período de Prueba</option>
                <option value="SUSPENDIDO">Suspendido (Bloqueo de acceso)</option>
                <option value="CANCELADO">Cancelado / Baja</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Inicio</label>
                <input
                  type="date"
                  name="fecha_alta"
                  defaultValue={tenant.fecha_alta ? new Date(tenant.fecha_alta).toISOString().slice(0, 10) : ""}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  name="fecha_vencimiento"
                  defaultValue={tenant.fecha_vencimiento ? new Date(tenant.fecha_vencimiento).toISOString().slice(0, 10) : ""}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Plan SaaS Asignado</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(Number(e.target.value))}
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Dominio Personalizado (Opcional)</label>
              <input
                type="text"
                placeholder="app.distribuidora.com"
                value={dominioPersonalizado}
                onChange={(e) => setDominioPersonalizado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Requiere registro CNAME apuntando a tu servidor en Nginx Proxy Manager.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">CUIT</label>
                <input
                  type="text"
                  name="cuit"
                  defaultValue={tenant.cuit || ""}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={tenant.email || ""}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  defaultValue={tenant.telefono || ""}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Granular Feature Flags & Modules Matrix */}
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Módulos y Feature Flags Habilitados
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Podés habilitar o bloquear módulos específicos como excepción al plan asignado.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {ALL_MODULES.map((mod) => {
                const active = isModuleActive(mod.id);
                const hasOverride = overrides[mod.id] !== undefined;

                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      active
                        ? "bg-slate-950 border-indigo-500/40 hover:border-indigo-500"
                        : "bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{mod.name}</span>
                        {hasOverride && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{mod.desc}</p>
                    </div>

                    <div className="pt-0.5">
                      {active ? (
                        <div className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          ON
                        </div>
                      ) : (
                        <div className="text-slate-500 font-bold text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                          OFF
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <span>Guardar Configuración del Tenant</span>
            )}
          </button>
        </div>
      </form>

      {/* Payment Registration Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Registrar Cobro SaaS
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Monto Cobrado (ARS) *</label>
                <input
                  type="number"
                  name="monto"
                  defaultValue={tenant.plan.precio_mensual}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mes *</label>
                  <input
                    type="number"
                    name="periodo_mes"
                    defaultValue={new Date().getMonth() + 1}
                    min={1}
                    max={12}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Año *</label>
                  <input
                    type="number"
                    name="periodo_anio"
                    defaultValue={new Date().getFullYear()}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Método de Pago</label>
                <select
                  name="metodo_pago"
                  defaultValue="TRANSFERENCIA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nro de Comprobante / Ref</label>
                <input
                  type="text"
                  name="referencia_pago"
                  placeholder="Transf #12345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-lg shadow-emerald-600/25 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Confirmar Cobro</span>
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
