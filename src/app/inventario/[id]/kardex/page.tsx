"use client";

import { useState, useEffect, useTransition, use } from "react";
import { obtenerKardexProducto, KardexItem } from "@/app/actions/kardex";
import { getDepositos } from "@/app/actions/configuracion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
    ArrowLeft, Printer, RefreshCw, Calendar, Package, TrendingUp, TrendingDown,
    Layers, Search, Filter, ShieldCheck, AlertCircle, ArrowDownRight, ArrowUpRight
} from "lucide-react";

export default function KardexProductoPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const productoId = Number(resolvedParams.id);

    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<any>(null);
    const [depositos, setDepositos] = useState<any[]>([]);
    
    // Filtros
    const [depositoId, setDepositoId] = useState<string>("");
    const [fechaDesde, setFechaDesde] = useState<string>("");
    const [fechaHasta, setFechaHasta] = useState<string>("");
    const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");

    const cargarDatos = () => {
        startTransition(async () => {
            const [resKardex, resDeps] = await Promise.all([
                obtenerKardexProducto(productoId, {
                    depositoId: depositoId ? Number(depositoId) : undefined,
                    fechaDesde: fechaDesde || undefined,
                    fechaHasta: fechaHasta || undefined
                }),
                getDepositos()
            ]);

            if (resKardex.success) {
                setData(resKardex.data);
            } else {
                toast.error(resKardex.error || "Error al cargar Kardex");
            }

            if (resDeps) setDepositos(resDeps);
        });
    };

    useEffect(() => {
        cargarDatos();
    }, [productoId, depositoId, fechaDesde, fechaHasta]);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-bold">Calculando Kardex y trazabilidad...</p>
            </div>
        );
    }

    const { producto, kardex, resumen } = data;

    const kardexFiltrado = kardex.filter((item: KardexItem) => {
        if (filtroTipo === "TODOS") return true;
        return item.tipoBadge === filtroTipo;
    });

    return (
        <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
            
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <Link href="/inventario">
                        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kardex de Trazabilidad</h1>
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs">
                                {producto.codigo_articulo}
                            </Badge>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-0.5">{producto.nombre_producto}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={cargarDatos}
                        disabled={isPending}
                        className="rounded-xl h-10 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /> Actualizar
                    </Button>
                    <Button
                        onClick={() => window.print()}
                        className="rounded-xl h-10 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                    >
                        <Printer className="h-4 w-4" /> Imprimir Ficha
                    </Button>
                </div>
            </div>

            {/* CABECERA IMPRIMIBLE (Solo en print) */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight">FICHA KARDEX DE INVENTARIO</h1>
                        <p className="text-sm font-bold text-slate-700">{producto.nombre_producto}</p>
                        <p className="text-xs text-slate-500">Cód: {producto.codigo_articulo} | Marca: {producto.marca?.nombre || 'S/M'} | Proveedor: {producto.proveedor?.nombre || 'S/P'}</p>
                    </div>
                    <div className="text-right text-xs">
                        <p className="font-bold">Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}</p>
                        <p className="font-black text-base mt-1">Stock Físico: {resumen.stockActual} u</p>
                    </div>
                </div>
            </div>

            {/* TARJETAS DE RESUMEN EJECUTIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-indigo-100 bg-indigo-50/40 shadow-sm">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Stock Actual</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{resumen.stockActual} u</p>
                        </div>
                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                            <Package className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-emerald-50/40 shadow-sm">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Total Ingresos (+)</p>
                            <p className="text-2xl font-black text-emerald-700 mt-1">{resumen.totalEntradas} u</p>
                        </div>
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-rose-100 bg-rose-50/40 shadow-sm">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Total Salidas (-)</p>
                            <p className="text-2xl font-black text-rose-700 mt-1">{resumen.totalSalidas} u</p>
                        </div>
                        <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Registros</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{resumen.totalMovimientos}</p>
                        </div>
                        <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                            <Layers className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BARRA DE FILTROS (Oculta en Print) */}
            <Card className="border-slate-200 shadow-sm print:hidden">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Depósito</label>
                        <select
                            value={depositoId}
                            onChange={(e) => setDepositoId(e.target.value)}
                            className="w-full h-10 mt-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold px-3 outline-none"
                        >
                            <option value="">TODOS LOS DEPÓSITOS</option>
                            {depositos.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo Operación</label>
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            className="w-full h-10 mt-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold px-3 outline-none"
                        >
                            <option value="TODOS">TODAS LAS OPERACIONES</option>
                            <option value="ENTRADA">🟢 Solo Entradas / Compras / Reingresos</option>
                            <option value="SALIDA">🔴 Solo Salidas / Ventas / Despachos</option>
                            <option value="TRANSFERENCIA">🔄 Transferencias</option>
                            <option value="AJUSTE">⚙️ Ajustes Manuales</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha Desde</label>
                        <Input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="h-10 mt-1 text-xs font-bold"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha Hasta</label>
                        <Input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="h-10 mt-1 text-xs font-bold"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* TABLA KARDEX CRONOLÓGICA */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="p-3.5">Fecha / Hora</th>
                                <th className="p-3.5">Tipo de Movimiento</th>
                                <th className="p-3.5">Depósito</th>
                                <th className="p-3.5 text-center">Operador</th>
                                <th className="p-3.5 text-right">Cantidad</th>
                                <th className="p-3.5 text-right font-black text-slate-900 bg-slate-100/60">Saldo Progresivo</th>
                                <th className="p-3.5">Observaciones / Motivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {kardexFiltrado.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        No se encontraron movimientos registrados con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                kardexFiltrado.map((item: KardexItem) => (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="p-3.5 font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                                            {new Date(item.fecha).toLocaleString('es-AR', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-3.5">
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                                    item.tipoBadge === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    item.tipoBadge === 'SALIDA' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    item.tipoBadge === 'TRANSFERENCIA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                {item.tipo.replace(/_/g, ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-3.5 text-xs font-semibold text-slate-700">
                                            {item.depositoNombre}
                                        </td>
                                        <td className="p-3.5 text-center text-xs font-medium text-slate-600">
                                            {item.usuarioNombre}
                                        </td>
                                        <td className="p-3.5 text-right font-black text-sm whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-0.5 ${item.cantidad > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {item.cantidad > 0 ? (
                                                    <><ArrowUpRight className="h-3.5 w-3.5" /> +{item.cantidad}</>
                                                ) : (
                                                    <><ArrowDownRight className="h-3.5 w-3.5" /> {item.cantidad}</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right font-black text-sm font-mono text-slate-900 bg-slate-50/50">
                                            {item.saldoResultante} u
                                        </td>
                                        <td className="p-3.5 text-xs text-slate-500 max-w-[200px] truncate" title={item.notas}>
                                            {item.notas || "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
