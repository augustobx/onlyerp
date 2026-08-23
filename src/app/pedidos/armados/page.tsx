"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Truck, CheckCircle2, XCircle, Clock, Calendar, User, Phone, MapPin,
  Search, Filter, ArrowLeft, RefreshCw, AlertCircle, Package, ExternalLink, Printer
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  obtenerPedidosArmados,
  obtenerRepartidores,
  marcarPedidoListoEntrega,
  marcarPedidoEntregado,
  marcarPedidoNoEntregado
} from "@/app/actions/pedidos";
import { formatCurrency } from "@/lib/utils";

export default function PedidosArmadosPage() {
  const [isPending, startTransition] = useTransition();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroRepartidor, setFiltroRepartidor] = useState<string>("ALL");
  const [filtroFecha, setFiltroFecha] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");

  // Modal para No Entregado
  const [pedidoNoEntregadoModal, setPedidoNoEntregadoModal] = useState<any | null>(null);
  const [motivoNoEntrega, setMotivoNoEntrega] = useState<string>("");

  // Modal Asignar Repartidor / Fecha
  const [pedidoAsignarModal, setPedidoAsignarModal] = useState<any | null>(null);
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState<string>("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>("");

  const cargarDatos = () => {
    setLoading(true);
    startTransition(async () => {
      const [pedidosData, repartidoresData] = await Promise.all([
        obtenerPedidosArmados(filtroFecha || undefined, filtroRepartidor !== "ALL" ? Number(filtroRepartidor) : undefined),
        obtenerRepartidores()
      ]);
      setPedidos(pedidosData);
      setRepartidores(repartidoresData);
      setLoading(false);
    });
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroFecha, filtroRepartidor]);

  const handleEntregar = (pedidoId: number) => {
    if (!confirm("¿Confirmar que el pedido fue ENTREGADO con éxito?")) return;
    startTransition(async () => {
      const res = await marcarPedidoEntregado(pedidoId);
      if (res.success) {
        toast.success("¡Pedido marcado como ENTREGADO!");
        cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleGuardarNoEntregado = () => {
    if (!motivoNoEntrega.trim()) {
      return toast.error("Debe ingresar un motivo para registrar la no entrega.");
    }
    startTransition(async () => {
      const res = await marcarPedidoNoEntregado(pedidoNoEntregadoModal.id, motivoNoEntrega);
      if (res.success) {
        toast.warning("Pedido registrado como NO ENTREGADO.");
        setPedidoNoEntregadoModal(null);
        setMotivoNoEntrega("");
        cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleGuardarAsignacion = () => {
    startTransition(async () => {
      const res = await marcarPedidoListoEntrega(
        pedidoAsignarModal.id,
        repartidorSeleccionado ? Number(repartidorSeleccionado) : null,
        fechaSeleccionada || null
      );
      if (res.success) {
        toast.success("¡Despacho y repartidor asignados!");
        setPedidoAsignarModal(null);
        cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  };

  // Filtrado de pedidos en memoria
  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroEstado !== "TODOS" && p.estado !== filtroEstado) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchNum = String(p.numero).includes(q);
      const matchCliente = p.cliente?.nombre?.toLowerCase().includes(q) || p.cliente?.cuit?.includes(q);
      const matchDir = p.cliente?.direccion?.toLowerCase().includes(q);
      if (!matchNum && !matchCliente && !matchDir) return false;
    }
    return true;
  });

  const countArmados = pedidos.filter(p => p.estado === "ARMADO" || p.estado === "LISTO_ENTREGA").length;
  const countEntregados = pedidos.filter(p => p.estado === "ENTREGADO").length;
  const countNoEntregados = pedidos.filter(p => p.estado === "NO_ENTREGADO").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/pedidos">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <Truck className="h-7 w-7 text-indigo-600" />
              Módulo de Pedidos Armados y Despacho
            </h1>
            <p className="text-sm text-slate-500">
              Control de logística, repartidores y estado de entrega de mercadería
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading} className="h-9 gap-1.5 font-bold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          <Link href="/pedidos">
            <Button className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-bold gap-1.5 shadow-sm">
              <Package className="h-4 w-4" /> Panel de Pedidos
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          onClick={() => setFiltroEstado(filtroEstado === "ARMADO" ? "TODOS" : "ARMADO")}
          className={`cursor-pointer transition-all border shadow-sm ${
            filtroEstado === "ARMADO" ? "ring-2 ring-indigo-500 border-indigo-200 bg-indigo-50/40" : "hover:border-indigo-200 bg-white"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Para Reparto / Armados</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{countArmados}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Listos en depósito para salir</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Truck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFiltroEstado(filtroEstado === "ENTREGADO" ? "TODOS" : "ENTREGADO")}
          className={`cursor-pointer transition-all border shadow-sm ${
            filtroEstado === "ENTREGADO" ? "ring-2 ring-emerald-500 border-emerald-200 bg-emerald-50/40" : "hover:border-emerald-200 bg-white"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Entregados con Éxito</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{countEntregados}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Completados en destino</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFiltroEstado(filtroEstado === "NO_ENTREGADO" ? "TODOS" : "NO_ENTREGADO")}
          className={`cursor-pointer transition-all border shadow-sm ${
            filtroEstado === "NO_ENTREGADO" ? "ring-2 ring-rose-500 border-rose-200 bg-rose-50/40" : "hover:border-rose-200 bg-white"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">No Entregados (Incidencias)</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{countNoEntregados}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Con motivo registrado</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS TOOLBAR */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por #, cliente, dirección..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-10 bg-slate-50 border-slate-200"
              />
            </div>

            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm font-medium bg-slate-50 outline-none"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="ARMADO">Armado / Listo para Entrega</option>
                <option value="ENTREGADO">Entregado</option>
                <option value="NO_ENTREGADO">No Entregado</option>
              </select>
            </div>

            <div>
              <select
                value={filtroRepartidor}
                onChange={(e) => setFiltroRepartidor(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm font-medium bg-slate-50 outline-none"
              >
                <option value="ALL">Todos los Repartidores</option>
                {repartidores.map(r => (
                  <option key={r.id} value={String(r.id)}>{r.nombre} ({r.rol})</option>
                ))}
              </select>
            </div>

            <div>
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="h-10 bg-slate-50 border-slate-200 text-sm font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LISTADO DE PEDIDOS */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="font-semibold text-sm">Cargando despachos...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
            <Truck className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700">No se encontraron pedidos armados con los filtros seleccionados.</p>
            <p className="text-xs text-slate-400 mt-1">Podés armar y despachar pedidos desde el panel de Pedidos principal.</p>
          </div>
        ) : (
          pedidosFiltrados.map((pedido) => {
            const esEntregado = pedido.estado === "ENTREGADO";
            const esNoEntregado = pedido.estado === "NO_ENTREGADO";
            const esArmado = pedido.estado === "ARMADO" || pedido.estado === "LISTO_ENTREGA";

            return (
              <Card
                key={pedido.id}
                className={`overflow-hidden border transition-all ${
                  esEntregado
                    ? "border-emerald-200 bg-emerald-50/15"
                    : esNoEntregado
                      ? "border-rose-200 bg-rose-50/15"
                      : "border-indigo-200 bg-white shadow-sm"
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* INFO PRINCIPAL */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-lg text-slate-900 font-mono">
                        Pedido #{pedido.numero}
                      </span>

                      {esArmado && (
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-bold">
                          🚚 LISTO PARA ENTREGA
                        </Badge>
                      )}
                      {esEntregado && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold">
                          ✅ ENTREGADO
                        </Badge>
                      )}
                      {esNoEntregado && (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold">
                          ❌ NO ENTREGADO
                        </Badge>
                      )}

                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(pedido.fecha).toLocaleDateString("es-AR")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <strong className="text-slate-800 font-bold text-sm block">
                          {pedido.cliente?.nombre || "Consumidor Final"}
                        </strong>
                        {pedido.cliente?.telefono && (
                          <span className="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400" /> {pedido.cliente.telefono}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          {pedido.cliente?.direccion || "Retira por sucursal / Sin dirección"}
                        </span>
                        {pedido.cliente?.localidad && (
                          <span className="text-[11px] text-slate-400 ml-4.5 block">
                            {pedido.cliente.localidad}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block">
                          Repartidor:{" "}
                          <strong className="text-slate-800">
                            {pedido.repartidor?.nombre || "Sin asignar"}
                          </strong>
                        </span>
                        {pedido.fecha_entrega && (
                          <span className="text-[11px] text-slate-400 block">
                            Fecha entrega: {new Date(pedido.fecha_entrega).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MOTIVO NO ENTREGA */}
                    {esNoEntregado && pedido.motivo_no_entrega && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                        <strong>Motivo de no entrega:</strong> {pedido.motivo_no_entrega}
                      </div>
                    )}

                    {/* ITEMS DEL PEDIDO RESUMEN */}
                    <div className="pt-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Artículos ({pedido.detalles?.length || 0}):</span>{" "}
                      {pedido.detalles?.slice(0, 3).map((d: any) => `${d.cantidad}x ${d.producto?.nombre_producto}${d.combo_nombre ? ` (Combo: ${d.combo_nombre})` : ''}`).join(", ")}
                      {(pedido.detalles?.length || 0) > 3 ? "..." : ""}
                    </div>
                  </div>

                  {/* TOTAL Y ACCIONES */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total a Cobrar/Entregar</span>
                      <span className="text-xl font-black text-slate-900">
                        {formatCurrency(pedido.total, "ARS")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPedidoAsignarModal(pedido);
                          setRepartidorSeleccionado(pedido.repartidorId ? String(pedido.repartidorId) : "");
                          setFechaSeleccionada(
                            pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toISOString().split("T")[0] : ""
                          );
                        }}
                        className="h-8 text-xs font-bold"
                      >
                        <User className="h-3.5 w-3.5 mr-1" /> Asignar
                      </Button>

                      {esArmado && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleEntregar(pedido.id)}
                            disabled={isPending}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Entregado
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setPedidoNoEntregadoModal(pedido);
                              setMotivoNoEntrega("");
                            }}
                            className="h-8 text-xs font-bold"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> No Entregado
                          </Button>
                        </>
                      )}

                      {esNoEntregado && (
                        <Button
                          size="sm"
                          onClick={() => handleEntregar(pedido.id)}
                          disabled={isPending}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Reintentar y Entregar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL NO ENTREGADO */}
      {pedidoNoEntregadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0 overflow-hidden">
            <div className="p-4 bg-rose-600 text-white flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Registrar No Entrega
              </h3>
              <button
                onClick={() => setPedidoNoEntregadoModal(null)}
                className="text-white hover:opacity-80 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4 bg-white">
              <p className="text-xs text-slate-600">
                Pedido <strong>#{pedidoNoEntregadoModal.numero}</strong> para{" "}
                <strong>{pedidoNoEntregadoModal.cliente?.nombre}</strong>.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Motivo de no entrega <span className="text-rose-500">*</span></Label>
                <textarea
                  rows={3}
                  placeholder="Ej: Cliente ausente, dirección no encontrada, rechazó la mercadería, reprogramado..."
                  value={motivoNoEntrega}
                  onChange={(e) => setMotivoNoEntrega(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setPedidoNoEntregadoModal(null)} className="w-1/3">
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarNoEntregado}
                  disabled={isPending || !motivoNoEntrega.trim()}
                  className="w-2/3 bg-rose-600 hover:bg-rose-700 font-bold text-white"
                >
                  Confirmar Incidencia
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL ASIGNAR REPARTIDOR Y FECHA */}
      {pedidoAsignarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Truck className="h-5 w-5" /> Asignar Despacho y Reparto
              </h3>
              <button
                onClick={() => setPedidoAsignarModal(null)}
                className="text-white hover:opacity-80 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4 bg-white">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Repartidor Responsable</Label>
                <select
                  value={repartidorSeleccionado}
                  onChange={(e) => setRepartidorSeleccionado(e.target.value)}
                  className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-medium bg-slate-50 outline-none"
                >
                  <option value="">Sin Repartidor Asignado</option>
                  {repartidores.map(r => (
                    <option key={r.id} value={String(r.id)}>{r.nombre} ({r.rol})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Fecha Estimada de Entrega</Label>
                <Input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="h-11 bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setPedidoAsignarModal(null)} className="w-1/3">
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarAsignacion}
                  disabled={isPending}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 font-bold text-white"
                >
                  Guardar Asignación
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
