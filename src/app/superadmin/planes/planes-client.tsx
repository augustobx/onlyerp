"use client";

import { useState } from "react";
import { updatePlan } from "@/app/actions/superadmin";
import {
  Layers,
  Users,
  Store,
  Package,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const MODULOS = [
  "VENTAS",
  "COMPRAS",
  "INVENTARIO",
  "CLIENTES",
  "PROVEEDORES",
  "LISTAS_PRECIO",
  "PRESUPUESTOS",
  "CAJA",
  "CUENTAS_CORRIENTES",
  "LOGISTICA",
  "CHEQUES",
  "WMS",
  "COMISIONES",
  "AFIP",
  "PORTAL_B2B",
  "VENDEDORES_PWA",
];

export function PlanesClient({ planes }: { planes: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-emerald-400" />
          Planes SaaS
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Configuración comercial, límites y módulos incluidos en cada plan.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {planes.map((plan) => (
          <PlanEditor key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function PlanEditor({ plan }: { plan: any }) {
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState(plan.nombre);
  const [descripcion, setDescripcion] = useState(plan.descripcion || "");
  const [precio, setPrecio] = useState(plan.precio_mensual);
  const [usuarios, setUsuarios] = useState(plan.limite_usuarios);
  const [sucursales, setSucursales] = useState(plan.limite_sucursales);
  const [depositos, setDepositos] = useState(plan.limite_depositos);
  const [activo, setActivo] = useState(plan.activo);

  const [modulos, setModulos] = useState<string[]>(() => {
    try {
      return JSON.parse(plan.modulos || "[]");
    } catch {
      return [];
    }
  });

  function toggleModulo(modulo: string) {
    setModulos((actuales) =>
      actuales.includes(modulo)
        ? actuales.filter((m) => m !== modulo)
        : [...actuales, modulo]
    );
  }

  async function guardar() {
    setLoading(true);

    try {
      const res = await updatePlan(plan.id, {
        nombre,
        descripcion,
        precio_mensual: Number(precio),
        limite_usuarios: Number(usuarios),
        limite_sucursales: Number(sucursales),
        limite_depositos: Number(depositos),
        modulos,
        activo,
      });

      if (res.success) {
        toast.success(`Plan ${nombre} actualizado.`);
      } else {
        toast.error(res.error || "No se pudo actualizar.");
      }
    } catch {
      toast.error("Error al actualizar el plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            {plan.codigo}
          </span>

          <p className="text-xs text-slate-500 mt-3">
            {plan._count.tenants} empresa(s)
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          Activo
        </label>
      </div>

      <div>
        <label className="text-xs text-slate-400">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400">Precio mensual</label>
        <input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(Number(e.target.value))}
          className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] text-slate-500 flex gap-1">
            <Users className="w-3 h-3" />
            Usuarios
          </label>
          <input
            type="number"
            value={usuarios}
            onChange={(e) => setUsuarios(Number(e.target.value))}
            className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-500 flex gap-1">
            <Store className="w-3 h-3" />
            Sucursales
          </label>
          <input
            type="number"
            value={sucursales}
            onChange={(e) => setSucursales(Number(e.target.value))}
            className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-500 flex gap-1">
            <Package className="w-3 h-3" />
            Depósitos
          </label>
          <input
            type="number"
            value={depositos}
            onChange={(e) => setDepositos(Number(e.target.value))}
            className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white"
          />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
          Módulos incluidos
        </p>

        <div className="grid grid-cols-2 gap-2">
          {MODULOS.map((modulo) => (
            <label
              key={modulo}
              className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2"
            >
              <input
                type="checkbox"
                checked={modulos.includes(modulo)}
                onChange={() => toggleModulo(modulo)}
              />
              {modulo}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={guardar}
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}

        Guardar Plan
      </button>
    </div>
  );
}
