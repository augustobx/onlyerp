"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sparkles, Plus, Edit, Trash2, CheckCircle2, XCircle, Search,
  Package, DollarSign, Percent, Loader2, X, ArrowLeft, RefreshCw, Layers
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getCombos, guardarCombo, eliminarCombo, toggleComboActivo } from "@/app/actions/combos";
import { buscarProductos } from "@/app/actions/ventas";
import { formatCurrency } from "@/lib/utils";

export default function CombosPage() {
  const [isPending, startTransition] = useTransition();
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [comboEditando, setComboEditando] = useState<any | null>(null);

  // Form State
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioCombo, setPrecioCombo] = useState("");
  const [descuentoPorc, setDescuentoPorc] = useState("");
  const [items, setItems] = useState<{ productoId: number; nombre: string; codigo: string; cantidad: number; precioBase?: number }[]>([]);

  // Búsqueda de productos para agregar al combo
  const [queryProd, setQueryProd] = useState("");
  const [prodsBuscados, setProdsBuscados] = useState<any[]>([]);
  const [buscandoProd, setBuscandoProd] = useState(false);

  const cargarDatos = () => {
    setLoading(true);
    startTransition(async () => {
      const data = await getCombos();
      setCombos(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (queryProd.trim().length >= 2) {
      setBuscandoProd(true);
      buscarProductos(queryProd).then(res => {
        setProdsBuscados(res);
        setBuscandoProd(false);
      });
    } else {
      setProdsBuscados([]);
    }
  }, [queryProd]);

  const handleAbrirCrear = () => {
    setComboEditando(null);
    setNombre("");
    setDescripcion("");
    setPrecioCombo("");
    setDescuentoPorc("");
    setItems([]);
    setQueryProd("");
    setModalOpen(true);
  };

  const handleAbrirEditar = (combo: any) => {
    setComboEditando(combo);
    setNombre(combo.nombre);
    setDescripcion(combo.descripcion || "");
    setPrecioCombo(String(combo.precio_combo));
    setDescuentoPorc(String(combo.descuento_porcentaje || combo.descuento_porc || ""));
    setItems(combo.items.map((it: any) => ({
      productoId: it.productoId,
      nombre: it.producto?.nombre_producto || "Producto",
      codigo: it.producto?.codigo_articulo || "",
      cantidad: it.cantidad,
      precioBase: it.producto?.precio_costo
    })));
    setQueryProd("");
    setModalOpen(true);
  };

  const handleAgregarProducto = (prod: any) => {
    const existe = items.find(i => i.productoId === prod.id);
    if (existe) {
      setItems(items.map(i => i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setItems([...items, {
        productoId: prod.id,
        nombre: prod.nombre_producto,
        codigo: prod.codigo_articulo,
        cantidad: 1,
        precioBase: prod.precio_costo
      }]);
    }
    setQueryProd("");
    setProdsBuscados([]);
  };

  const handleQuitarItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleCambiarCantidadItem = (idx: number, delta: number) => {
    const nuevos = [...items];
    nuevos[idx].cantidad = Math.max(1, nuevos[idx].cantidad + delta);
    setItems(nuevos);
  };

  const handleGuardarCombo = () => {
    if (!nombre.trim()) return toast.error("Ingresá un nombre para el combo.");
    if (!precioCombo || Number(precioCombo) <= 0) return toast.error("Ingresá un precio válido para el combo.");
    if (items.length === 0) return toast.error("Agregá al menos un producto al combo.");

    startTransition(async () => {
      const res = await guardarCombo({
        id: comboEditando?.id,
        nombre,
        descripcion,
        precio_combo: Number(precioCombo),
        descuento_porc: descuentoPorc ? Number(descuentoPorc) : 0,
        activo: comboEditando ? comboEditando.activo : true,
        items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))
      });

      if (res.success) {
        toast.success(`Combo ${comboEditando ? "actualizado" : "creado"} con éxito.`);
        setModalOpen(false);
        cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleEliminar = (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este combo promocional?")) return;
    startTransition(async () => {
      const res = await eliminarCombo(id);
      if (res.success) {
        toast.success("Combo eliminado.");
        cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleToggle = (id: number, activoActual: boolean) => {
    startTransition(async () => {
      const res = await toggleComboActivo(id, !activoActual);
      if (res.success) {
        toast.success(!activoActual ? "Combo activado." : "Combo pausado.");
        cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/inventario">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <Sparkles className="h-7 w-7 text-amber-500" />
              Gestión de Combos y Promociones
            </h1>
            <p className="text-sm text-slate-500">
              Creá paquetes de productos con precio cerrado y descuento para la app de vendedores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading} className="h-9 gap-1.5 font-bold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          <Button onClick={handleAbrirCrear} className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Nuevo Combo
          </Button>
        </div>
      </div>

      {/* LISTA DE COMBOS */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="font-semibold text-sm">Cargando combos...</p>
        </div>
      ) : combos.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed">
          <Layers className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-700">No hay combos ni promociones registradas.</p>
          <p className="text-xs text-slate-400 mt-1">Hacé clic en &quot;Nuevo Combo&quot; para armar tu primer paquete promocional.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {combos.map((combo) => (
            <Card key={combo.id} className={`border rounded-2xl shadow-sm transition-all flex flex-col justify-between ${combo.activo ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-slate-50/70 border-slate-200 opacity-70'}`}>
              <div>
                <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-black text-slate-900 leading-tight">
                        {combo.nombre}
                      </CardTitle>
                      {(combo.descuento_porcentaje || combo.descuento_porc) > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] px-1.5">
                          {combo.descuento_porcentaje || combo.descuento_porc}% OFF
                        </Badge>
                      )}
                    </div>
                    {combo.descripcion && (
                      <p className="text-xs text-slate-500 leading-relaxed">{combo.descripcion}</p>
                    )}
                  </div>

                  <Switch
                    checked={combo.activo}
                    onCheckedChange={() => handleToggle(combo.id, combo.activo)}
                    title={combo.activo ? "Desactivar combo" : "Activar combo"}
                  />
                </CardHeader>

                <CardContent className="p-5 pt-2 space-y-4">
                  {/* PRECIO */}
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Precio Promo:</span>
                    <span className="text-2xl font-black text-indigo-900">{formatCurrency(combo.precio_combo, "ARS")}</span>
                  </div>

                  {/* ITEMS INCLUIDOS */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      <Package className="h-3 w-3" /> Productos Incluidos ({combo.items?.length || 0}):
                    </p>
                    <div className="space-y-1">
                      {combo.items?.map((it: any) => (
                        <div key={it.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">
                            {it.producto?.nombre_producto}
                          </span>
                          <Badge variant="outline" className="font-mono font-bold text-slate-600 bg-white shrink-0">
                            x{it.cantidad}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* FOOTER ACCIONES */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl">
                <Button variant="ghost" size="sm" onClick={() => handleAbrirEditar(combo)} className="h-8 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                  <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEliminar(combo.id)} className="h-8 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR COMBO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl rounded-2xl border-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-300" />
                {comboEditando ? "Editar Combo Promocional" : "Nuevo Combo Promocional"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white hover:opacity-80 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-white">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nombre del Combo <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="Ej: Pack Desayuno / Combo Limpieza x3"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200 text-sm font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Descripción / Detalles (Opcional)</Label>
                <Input
                  placeholder="Ej: Incluye 2 paquetes de galletitas y 1 café"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-indigo-700">Precio Final del Combo ($) <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-indigo-400">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 4500"
                      value={precioCombo}
                      onChange={(e) => setPrecioCombo(e.target.value)}
                      className="h-11 pl-8 font-black text-lg text-indigo-900 bg-indigo-50/50 border-indigo-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-amber-700">Descuento Visual (%)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-amber-500">%</span>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ej: 10"
                      value={descuentoPorc}
                      onChange={(e) => setDescuentoPorc(e.target.value)}
                      className="h-11 pl-8 font-black text-lg text-amber-900 bg-amber-50/50 border-amber-200"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN AGREGAR PRODUCTOS */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Productos del Combo
                </Label>

                {/* BUSCADOR DE PRODUCTOS */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar producto para agregar al combo..."
                    value={queryProd}
                    onChange={(e) => setQueryProd(e.target.value)}
                    className="pl-9 h-10 bg-slate-50 border-slate-200 text-sm"
                  />
                  {buscandoProd && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                  )}

                  {prodsBuscados.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {prodsBuscados.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAgregarProducto(p)}
                          className="p-3 flex items-center justify-between hover:bg-indigo-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-800">{p.nombre_producto}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.codigo_articulo}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 font-bold">
                            + Agregar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ITEMS SELECCIONADOS */}
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed">
                      No hay productos agregados al combo.
                    </p>
                  ) : (
                    items.map((it, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{it.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{it.codigo}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-xs font-bold"
                            onClick={() => handleCambiarCantidadItem(idx, -1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-black text-sm">{it.cantidad}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-xs font-bold"
                            onClick={() => handleCambiarCantidadItem(idx, 1)}
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50 ml-1"
                            onClick={() => handleQuitarItem(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGuardarCombo}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Guardar Combo
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
