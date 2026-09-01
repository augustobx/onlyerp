"use client";

import { useEffect, useState } from "react";
import { obtenerSugeridoCompras } from "@/app/actions/compras-sugerido";
import { getProveedores } from "@/app/actions/productos";
import { formatCurrency } from "@/lib/utils";
import {
    Sparkles,
    ShoppingCart,
    Building2,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Printer,
    Download,
    TrendingDown,
    ShieldAlert,
    Clock,
    Search
} from "lucide-react";
import { toast } from "sonner";

export default function SugeridoComprasPage() {
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [reporte, setReporte] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroProveedor, setFiltroProveedor] = useState("0");
    const [diasCobertura, setDiasCobertura] = useState(30);
    const [diasAnalisis, setDiasAnalisis] = useState(30);
    const [filtroUrgencia, setFiltroUrgencia] = useState("TODOS");
    const [filtroTermino, setFiltroTermino] = useState("");

    const cargarSugerido = async () => {
        setLoading(true);
        try {
            const [resSugerido, resProv] = await Promise.all([
                obtenerSugeridoCompras({
                    proveedorId: Number(filtroProveedor) || undefined,
                    diasCobertura,
                    diasAnalisis
                }),
                getProveedores()
            ]);

            if (resSugerido.success && resSugerido.data) {
                setReporte(resSugerido.data);
            } else {
                toast.error(resSugerido.error || "Error al calcular sugerido");
            }
            setProveedores(resProv || []);
        } catch (e) {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarSugerido();
    }, [filtroProveedor, diasCobertura, diasAnalisis]);

    const articulosFiltrados = (reporte?.todosLosArticulos || []).filter((item: any) => {
        if (filtroUrgencia === 'SOLO_PEDIR' && item.cantidad_sugerida <= 0) return false;
        if (filtroUrgencia === 'CRITICO' && item.urgencia !== 'CRITICO') return false;
        if (filtroUrgencia === 'ALERTA' && item.urgencia !== 'ALERTA') return false;
        if (filtroUrgencia === 'SOBRESTOCK' && item.urgencia !== 'SOBRESTOCK') return false;

        if (filtroTermino.trim() !== "") {
            const t = filtroTermino.toLowerCase();
            return item.nombre_producto.toLowerCase().includes(t) || item.codigo_articulo.toLowerCase().includes(t) || item.proveedor.toLowerCase().includes(t);
        }

        return true;
    });

    const totalInversionFiltrada = articulosFiltrados.reduce((acc: number, item: any) => acc + item.costo_total_estimado, 0);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Sugerido de Compras & Reabastecimiento
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Algoritmo predictivo basado en velocidad de ventas de los últimos 30/60 días y stock de seguridad
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={cargarSugerido}
                        disabled={loading}
                        className="p-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-xl transition"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-sm transition"
                    >
                        <Printer className="h-4 w-4" /> Imprimir Orden de Compra
                    </button>
                </div>
            </div>

            {/* KPIS DE ABASTECIMIENTO */}
            {reporte && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Artículos a Reponer</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{reporte.totalProductosAPedir}</p>
                        <p className="text-xs text-slate-500 font-semibold">de {reporte.todosLosArticulos?.length || 0} artículos analizados</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/50 bg-emerald-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-emerald-600">Inversión Estimada</p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(reporte.costoTotalInversion)}</p>
                        <p className="text-xs text-emerald-600/80 font-semibold">para {diasCobertura} días de stock</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-red-200 dark:border-red-950/50 bg-red-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-red-600">En Quiebre / Críticos</p>
                        <p className="text-2xl font-black text-red-700 dark:text-red-400">
                            {reporte.todosLosArticulos?.filter((r: any) => r.urgencia === 'CRITICO').length || 0}
                        </p>
                        <p className="text-xs text-red-600/80 font-semibold">quedan 0 o pocos días</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-950/50 bg-amber-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-amber-600">En Alerta Próxima</p>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                            {reporte.todosLosArticulos?.filter((r: any) => r.urgencia === 'ALERTA').length || 0}
                        </p>
                        <p className="text-xs text-amber-600/80 font-semibold">reponer en los próximos días</p>
                    </div>
                </div>
            )}

            {/* BARRA DE FILTROS & PARÁMETROS DEL ALGORITMO */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Proveedor:</span>
                        <select
                            value={filtroProveedor}
                            onChange={(e) => setFiltroProveedor(e.target.value)}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                            <option value="0">Todos los proveedores</option>
                            {proveedores.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Días Cobertura:</span>
                        <select
                            value={diasCobertura}
                            onChange={(e) => setDiasCobertura(Number(e.target.value))}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                        >
                            <option value={15}>15 días (Rotación rápida)</option>
                            <option value={30}>30 días (1 mes estándar)</option>
                            <option value={45}>45 días</option>
                            <option value={60}>60 días (2 meses)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Historial Ventas:</span>
                        <select
                            value={diasAnalisis}
                            onChange={(e) => setDiasAnalisis(Number(e.target.value))}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                        >
                            <option value={30}>Últimos 30 días</option>
                            <option value={60}>Últimos 60 días</option>
                            <option value={90}>Últimos 90 días (Trimestre)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Ver:</span>
                        <select
                            value={filtroUrgencia}
                            onChange={(e) => setFiltroUrgencia(e.target.value)}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                            <option value="SOLO_PEDIR">⚠️ Solo sugeridos a pedir ({reporte?.totalProductosAPedir || 0})</option>
                            <option value="TODOS">Todos los artículos ({reporte?.todosLosArticulos?.length || 0})</option>
                            <option value="CRITICO">🔴 En Quiebre / Crítico</option>
                            <option value="ALERTA">🟡 En Alerta</option>
                            <option value="SOBRESTOCK">🔵 Sobrestock</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto o código..."
                        value={filtroTermino}
                        onChange={(e) => setFiltroTermino(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 w-56"
                    />
                </div>
            </div>

            {/* TABLA DE SUGERIDO DE COMPRA */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-800/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3.5 px-4">ARTÍCULO / PROVEEDOR</th>
                            <th className="py-3.5 px-4 text-center">STOCK NETO</th>
                            <th className="py-3.5 px-4 text-center">VENTA/DÍA</th>
                            <th className="py-3.5 px-4 text-center">DÍAS RESTANTES</th>
                            <th className="py-3.5 px-4 text-center">ESTADO</th>
                            <th className="py-3.5 px-4 text-right bg-indigo-50/40 dark:bg-indigo-950/20 font-black">CANT. SUGERIDA</th>
                            <th className="py-3.5 px-4 text-right">COSTO UNIT.</th>
                            <th className="py-3.5 px-4 text-right font-black">SUBTOTAL ($)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                                    Calculando necesidades de compra...
                                </td>
                            </tr>
                        ) : articulosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    No hay artículos que requieran compra con los filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            articulosFiltrados.map((item: any) => (
                                <tr key={item.productoId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition">
                                    <td className="py-3.5 px-4">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {item.nombre_producto}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                                            <span className="font-mono">{item.codigo_articulo}</span>
                                            <span>•</span>
                                            <span className="font-bold text-slate-600 dark:text-slate-400">{item.proveedor}</span>
                                        </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                                        {item.stock_disponible} {item.tipo_medicion}
                                        {item.stock_comprometido > 0 && (
                                            <div className="text-[10px] text-amber-600 font-normal">
                                                ({item.stock_comprometido} comp.)
                                            </div>
                                        )}
                                    </td>

                                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-400">
                                        {item.venta_promedio_diaria}/día
                                        <div className="text-[10px] text-slate-400">({item.ventas_periodo} total)</div>
                                    </td>

                                    <td className="py-3.5 px-4 text-center font-bold">
                                        <span className={
                                            item.dias_stock_restantes <= 7 ? 'text-red-600 font-black' :
                                            item.dias_stock_restantes <= 15 ? 'text-amber-600' : 'text-slate-600'
                                        }>
                                            {typeof item.dias_stock_restantes === 'number' ? `${item.dias_stock_restantes} días` : item.dias_stock_restantes}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            item.urgencia === 'CRITICO' ? 'bg-red-100 text-red-700' :
                                            item.urgencia === 'ALERTA' ? 'bg-amber-100 text-amber-700' :
                                            item.urgencia === 'SOBRESTOCK' ? 'bg-blue-100 text-blue-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {item.urgencia === 'CRITICO' ? '🔴 Quiebre / Crítico' :
                                             item.urgencia === 'ALERTA' ? '🟡 Alerta Próxima' :
                                             item.urgencia === 'SOBRESTOCK' ? '🔵 Sobrestock' : '🟢 Normal'}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-right font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20">
                                        {item.cantidad_sugerida > 0 ? `+${item.cantidad_sugerida} ${item.tipo_medicion}` : "0"}
                                    </td>

                                    <td className="py-3.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">
                                        {formatCurrency(item.precio_costo)}
                                    </td>

                                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                                        {formatCurrency(item.costo_total_estimado)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {articulosFiltrados.length > 0 && (
                        <tfoot>
                            <tr className="bg-slate-50 dark:bg-zinc-800/80 font-black border-t-2 border-slate-200 dark:border-zinc-700">
                                <td colSpan={7} className="py-3.5 px-4 text-right uppercase tracking-wider text-xs">
                                    Total Inversión Estimada:
                                </td>
                                <td className="py-3.5 px-4 text-right text-base text-emerald-600">
                                    {formatCurrency(totalInversionFiltrada)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
