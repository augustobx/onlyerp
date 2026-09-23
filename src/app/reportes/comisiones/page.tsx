"use client";

import { useEffect, useState, useTransition, Fragment } from "react";
import {
    calcularPreliquidacionVendedores,
    guardarLiquidacion,
    pagarLiquidacion,
    obtenerDetalleLiquidacionVendedor
} from "@/app/actions/comisiones";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import {
    Award,
    Calendar,
    DollarSign,
    RefreshCw,
    CheckCircle2,
    Clock,
    User,
    TrendingUp,
    Receipt,
    Wallet,
    Eye,
    EyeOff,
    X,
    Printer,
    Ban,
    Sparkles,
    AlertOctagon,
    ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function LiquidacionComisionesPage() {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [baseCalculo, setBaseCalculo] = useState<'FACTURACION' | 'COBRANZA'>('FACTURACION');

    const [vendedores, setVendedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Estado del Modal de Detalle
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState<any | null>(null);
    const [detalleCargando, setDetalleCargando] = useState(false);
    const [detalleDatos, setDetalleDatos] = useState<any | null>(null);
    const [filtroModal, setFiltroModal] = useState<"TODAS" | "ACTIVAS" | "CANCELADAS">("TODAS");
    const [opExpandida, setOpExpandida] = useState<string | null>(null);

    const cargarComisiones = async () => {
        setLoading(true);
        try {
            const res = await calcularPreliquidacionVendedores(mes, anio, baseCalculo);
            if (res.success && res.data) {
                setVendedores(res.data);
            } else {
                toast.error(res.error || "Error al calcular comisiones");
            }
        } catch (e) {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarComisiones();
    }, [mes, anio, baseCalculo]);

    const abrirDetalleVendedor = async (vendedor: any) => {
        setVendedorSeleccionado(vendedor);
        setDetalleCargando(true);
        setDetalleDatos(null);
        setFiltroModal("TODAS");
        setOpExpandida(null);

        try {
            const res = await obtenerDetalleLiquidacionVendedor(vendedor.usuarioId, mes, anio, baseCalculo);
            if (res.success) {
                setDetalleDatos(res);
            } else {
                toast.error(res.error || "No se pudo cargar el detalle del vendedor.");
            }
        } catch (e) {
            toast.error("Error al cargar auditoría del vendedor");
        } finally {
            setDetalleCargando(false);
        }
    };

    const cerrarDetalleVendedor = () => {
        setVendedorSeleccionado(null);
        setDetalleDatos(null);
    };

    const handleGuardarLiquidacion = (vendedor: any) => {
        startTransition(async () => {
            const res = await guardarLiquidacion({
                usuarioId: vendedor.usuarioId,
                mes,
                anio,
                total_ventas: vendedor.total_ventas,
                total_cobranzas: vendedor.total_cobranzas,
                porcentaje_comision: vendedor.porcentaje_comision,
                monto_comision: vendedor.monto_comision
            });

            if (res.success) {
                toast.success(`Liquidación guardada para ${vendedor.nombre}`);
                cargarComisiones();
            } else {
                toast.error(res.error || "Error al guardar");
            }
        });
    };

    const handlePagarLiquidacion = (liquidacionId: number) => {
        startTransition(async () => {
            const res = await pagarLiquidacion(liquidacionId);
            if (res.success) {
                toast.success("Liquidación marcada como PAGADA.");
                cargarComisiones();
                if (vendedorSeleccionado) {
                    abrirDetalleVendedor(vendedorSeleccionado);
                }
            } else {
                toast.error(res.error || "Error al registrar pago");
            }
        });
    };

    const totalBase = vendedores.reduce((acc, v) => acc + v.base_monto, 0);
    const totalComisiones = vendedores.reduce((acc, v) => acc + v.monto_comision, 0);
    const totalCancelado = vendedores.reduce((acc, v) => acc + (v.total_cancelado || 0), 0);
    const totalComisionesCanceladas = vendedores.reduce((acc, v) => acc + (v.comision_cancelada || 0), 0);

    // Operaciones filtradas en el modal
    const operacionesModalFiltradas = (detalleDatos?.operaciones || []).filter((op: any) => {
        if (filtroModal === "ACTIVAS") return op.estadoComision === "ACTIVA";
        if (filtroModal === "CANCELADAS") return op.estadoComision === "CANCELADA";
        return true;
    });

    return (
        <div className="p-6 max-w-[1500px] mx-auto space-y-6 pb-16 print:p-0">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl text-white shadow-md shadow-amber-500/20">
                        <Award className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Liquidación Mensual de Comisiones
                            </h1>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold border-amber-300 text-amber-800 bg-amber-50">
                                Cierre de Mes
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Cálculo sobre facturación o cobranzas con desglose por fecha, día, cliente y pedidos cancelados.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                    <Link href="/reportes/vendedores">
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-xl">
                            <TrendingUp className="mr-2 h-4 w-4" /> Rendimiento Preventa
                        </Button>
                    </Link>
                    <button
                        onClick={cargarComisiones}
                        disabled={loading}
                        className="p-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-xl transition"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* BARRA DE CONTROLES: PERÍODO Y BASE DE CÁLCULO */}
            <div className="bg-white dark:bg-zinc-900 p-4 px-6 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between shadow-sm print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase">Mes:</span>
                        <select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                            {MESES.map((nombre, i) => (
                                <option key={i + 1} value={i + 1}>{nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Año:</span>
                        <select
                            value={anio}
                            onChange={(e) => setAnio(Number(e.target.value))}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 dark:border-zinc-800 pl-4">
                        <span className="text-xs font-bold text-slate-400 uppercase">Calcular Sobre:</span>
                        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button
                                onClick={() => setBaseCalculo('FACTURACION')}
                                className={`px-3.5 py-1 text-xs font-bold rounded-lg transition ${
                                    baseCalculo === 'FACTURACION' ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                📄 Ventas Facturadas
                            </button>
                            <button
                                onClick={() => setBaseCalculo('COBRANZA')}
                                className={`px-3.5 py-1 text-xs font-bold rounded-lg transition ${
                                    baseCalculo === 'COBRANZA' ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                💵 Cobranzas en CC
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-500">
                    <div>
                        Base Total ({baseCalculo}): <span className="text-slate-900 dark:text-white font-black text-sm">{formatCurrency(totalBase)}</span>
                    </div>
                    {totalCancelado > 0 && (
                        <div className="text-rose-600">
                            Pedidos Cancelados: <span className="font-black text-sm">{formatCurrency(totalCancelado)}</span>
                        </div>
                    )}
                    <div>
                        Comisiones a Pagar: <span className="text-amber-600 font-black text-base">{formatCurrency(totalComisiones)}</span>
                    </div>
                </div>
            </div>

            {/* TABLA PRINCIPAL DE VENDEDORES */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-800/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3.5 px-4">VENDEDOR / PREVENTISTA</th>
                            <th className="py-3.5 px-4 text-center">% COMISIÓN</th>
                            <th className="py-3.5 px-4 text-right">TOTAL FACTURADO</th>
                            <th className="py-3.5 px-4 text-right">COBRADO EN CC</th>
                            <th className="py-3.5 px-4 text-right text-rose-600">PEDIDOS CANCELADOS</th>
                            <th className="py-3.5 px-4 text-right bg-amber-50/30 dark:bg-amber-950/20">BASE CÁLCULO</th>
                            <th className="py-3.5 px-4 text-right font-black">COMISIÓN A PAGAR</th>
                            <th className="py-3.5 px-4 text-center">ESTADO</th>
                            <th className="py-3.5 px-4 text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="py-16 text-center text-slate-400">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
                                    Calculando comisiones del período...
                                </td>
                            </tr>
                        ) : vendedores.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                                    No se registraron ventas, cobranzas ni cancelaciones para los vendedores en este período.
                                </td>
                            </tr>
                        ) : (
                            vendedores.map(v => {
                                const liq = v.liquidacion_guardada;
                                const pagada = liq?.estado === 'PAGADA';

                                return (
                                    <tr key={v.usuarioId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                {v.nombre}
                                            </div>
                                            <p className="text-[10px] text-slate-400">@{v.username} ({v.rol})</p>
                                        </td>

                                        <td className="py-3.5 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                            {v.porcentaje_comision}%
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                            {formatCurrency(v.total_ventas)}
                                            <span className="block text-[10px] text-slate-400 font-normal">{v.cantidad_ventas} ventas</span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                            {formatCurrency(v.total_cobranzas)}
                                        </td>

                                        {/* PEDIDOS CANCELADOS */}
                                        <td className="py-3.5 px-4 text-right">
                                            {v.total_cancelado > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-rose-600 line-through">
                                                        {formatCurrency(v.total_cancelado)}
                                                    </span>
                                                    <span className="text-[10px] text-rose-500 font-bold">
                                                        {v.cantidad_cancelados} pedidos (Comisión $0)
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white bg-amber-50/30 dark:bg-amber-950/20">
                                            {formatCurrency(v.base_monto)}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-black text-sm text-amber-600 dark:text-amber-400">
                                            {formatCurrency(v.monto_comision)}
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                pagada ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                liq ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {pagada ? 'Pagada' : liq ? 'Guardada / Pendiente' : 'Preliquidación'}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                            {/* BOTÓN VER DETALLE */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => abrirDetalleVendedor(v)}
                                                className="h-8 text-xs font-bold border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg px-2.5"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" /> Ver Detalle
                                            </Button>

                                            {!pagada && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleGuardarLiquidacion(v)}
                                                    disabled={isPending}
                                                    className="h-8 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 rounded-lg px-2.5"
                                                >
                                                    Guardar
                                                </Button>
                                            )}

                                            {liq && !pagada && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePagarLiquidacion(liq.id)}
                                                    disabled={isPending}
                                                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3"
                                                >
                                                    Pagar
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ============================================================== */}
            {/* MODAL / DRAWER: AUDITORÍA DETALLADA DEL VENDEDOR               */}
            {/* ============================================================== */}
            {vendedorSeleccionado && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* ENCABEZADO DEL MODAL */}
                        <div className="p-6 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest block">
                                        Liquidación Individual • {MESES[mes - 1]} {anio}
                                    </span>
                                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 font-mono text-[10px]">
                                        Comisión Asignada: {vendedorSeleccionado.porcentaje_comision}%
                                    </Badge>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                                    {vendedorSeleccionado.nombre}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Usuario: @{vendedorSeleccionado.username} • Rol: {vendedorSeleccionado.rol}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="h-9 border-slate-200 text-slate-700 font-bold rounded-xl"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={cerrarDetalleVendedor}
                                    className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* CONTENIDO DEL MODAL */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {detalleCargando ? (
                                <div className="py-20 text-center text-slate-400">
                                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-600 mb-3" />
                                    Cargando auditoría de operaciones del vendedor...
                                </div>
                            ) : !detalleDatos ? (
                                <div className="py-20 text-center text-slate-400 font-medium">
                                    No se encontraron datos para este vendedor en el período.
                                </div>
                            ) : (
                                <>
                                    {/* TARJETAS RESUMEN DE LA LIQUIDACIÓN */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Facturado Activo</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                                                {formatCurrency(detalleDatos.resumen?.totalFacturadoActivo || 0)}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">Base de cálculo activo</span>
                                        </div>

                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                                            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">Comisión a Pagar</span>
                                            <span className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5 block">
                                                {formatCurrency(detalleDatos.resumen?.comisionesActivas || 0)}
                                            </span>
                                            <span className="text-[10px] text-emerald-600 font-bold">Comisión activa computable</span>
                                        </div>

                                        <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                                            <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 block tracking-wider">Pedidos Cancelados</span>
                                            <span className="text-xl font-black text-rose-800 dark:text-rose-300 mt-0.5 block">
                                                {formatCurrency(detalleDatos.resumen?.totalCancelado || 0)}
                                            </span>
                                            <span className="text-[10px] text-rose-600 font-bold">
                                                Comisión cancelada: {formatCurrency(detalleDatos.resumen?.comisionesCanceladas || 0)}
                                            </span>
                                        </div>

                                        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50">
                                            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 block tracking-wider">Cobrado en CC</span>
                                            <span className="text-xl font-black text-indigo-800 dark:text-indigo-300 mt-0.5 block">
                                                {formatCurrency(detalleDatos.resumen?.totalCobrado || 0)}
                                            </span>
                                            <span className="text-[10px] text-indigo-600 font-bold">
                                                {detalleDatos.cobranzas?.length || 0} recibos generados
                                            </span>
                                        </div>
                                    </div>

                                    {/* FILTRO DE ESTADO DENTRO DEL MODAL */}
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setFiltroModal("TODAS")}
                                                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                                                    filtroModal === "TODAS" ? "bg-white dark:bg-zinc-900 text-slate-900 shadow-xs" : "text-slate-500"
                                                }`}
                                            >
                                                Todas ({detalleDatos.operaciones?.length || 0})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFiltroModal("ACTIVAS")}
                                                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                                                    filtroModal === "ACTIVAS" ? "bg-white dark:bg-zinc-900 text-emerald-700 shadow-xs" : "text-slate-500"
                                                }`}
                                            >
                                                Solo Activas
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFiltroModal("CANCELADAS")}
                                                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                                                    filtroModal === "CANCELADAS" ? "bg-white dark:bg-zinc-900 text-rose-700 shadow-xs" : "text-slate-500"
                                                }`}
                                            >
                                                Solo Canceladas
                                            </button>
                                        </div>

                                        <span className="text-xs font-bold text-slate-400">
                                            Mostrando {operacionesModalFiltradas.length} operaciones
                                        </span>
                                    </div>

                                    {/* TABLA DE OPERACIONES */}
                                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-zinc-800/70 text-slate-500 uppercase font-bold text-[10px]">
                                                <tr>
                                                    <th className="py-3 px-4">Fecha / Día</th>
                                                    <th className="py-3 px-4">Operación</th>
                                                    <th className="py-3 px-4">Cliente</th>
                                                    <th className="py-3 px-4 text-right">Total</th>
                                                    <th className="py-3 px-4 text-center">Descuento & Regla</th>
                                                    <th className="py-3 px-4 text-center">Estado Comisión</th>
                                                    <th className="py-3 px-4 text-right">Comisión</th>
                                                    <th className="py-3 px-4 text-center">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                {operacionesModalFiltradas.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                                                            No hay operaciones para este filtro.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    operacionesModalFiltradas.map((op: any) => {
                                                        const esCancel = op.estadoComision === "CANCELADA";
                                                        const expandido = opExpandida === op.id;

                                                        return (
                                                            <Fragment key={op.id}>
                                                                <tr className={`hover:bg-slate-50/50 ${esCancel ? 'bg-rose-50/20' : ''}`}>
                                                                    <td className="py-3 px-4">
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                                                            {formatFechaLocal(op.fecha)}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                                            {op.horaStr} hs
                                                                        </span>
                                                                    </td>

                                                                    <td className="py-3 px-4">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                                op.tipo === "VENTA" ? "bg-purple-100 text-purple-700" :
                                                                                esCancel ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                                                                            }`}>
                                                                                {op.tipo}
                                                                            </span>
                                                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                                                {op.comprobante}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                            Estado: {op.estadoOperacion}
                                                                        </span>
                                                                    </td>

                                                                    <td className="py-3 px-4">
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[170px]" title={op.cliente?.nombre_razon_social}>
                                                                            {op.cliente?.nombre_razon_social || "Consumidor Final"}
                                                                        </span>
                                                                        {op.cliente?.dni_cuit && (
                                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                                {op.cliente.dni_cuit}
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className={`py-3 px-4 text-right font-black ${esCancel ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                                        {formatCurrency(op.total)}
                                                                    </td>

                                                                    <td className="py-3 px-4 text-center">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                            op.esPenalizado ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                            Dto: {op.dtoPorcentaje?.toFixed(1)}% (Límite: {op.limite}%)
                                                                        </span>
                                                                    </td>

                                                                    <td className="py-3 px-4 text-center">
                                                                        {esCancel ? (
                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                                                                CANCELADA
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                                A PAGAR
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className="py-3 px-4 text-right font-black">
                                                                        {esCancel ? (
                                                                            <div>
                                                                                <span className="text-rose-600 text-sm block">$0.00</span>
                                                                                <span className="text-[9px] text-rose-400 line-through">
                                                                                    {formatCurrency(op.comisionCancelada)}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div>
                                                                                <span className="text-emerald-700 dark:text-emerald-400 text-sm block">
                                                                                    {formatCurrency(op.comisionGenerada)}
                                                                                </span>
                                                                                <span className="text-[9px] text-slate-400">
                                                                                    {op.porcentajeAplicado?.toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    <td className="py-3 px-4 text-center">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => setOpExpandida(prev => prev === op.id ? null : op.id)}
                                                                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                                                                        >
                                                                            {expandido ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                    </td>
                                                                </tr>

                                                                {/* DESPLIEGUE DE ARTÍCULOS */}
                                                                {expandido && (
                                                                    <tr className="bg-slate-50 dark:bg-zinc-800/40">
                                                                        <td colSpan={8} className="p-3 px-8">
                                                                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 p-3 space-y-2">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                                                                    Artículos de la Operación ({op.detalles?.length || 0})
                                                                                </span>
                                                                                <div className="space-y-1 divide-y divide-slate-100">
                                                                                    {op.detalles?.map((det: any, dIdx: number) => (
                                                                                        <div key={dIdx} className="pt-1 first:pt-0 flex justify-between items-center text-xs">
                                                                                            <span className="text-slate-800 dark:text-slate-200">
                                                                                                <strong className="text-indigo-600 mr-2">{det.cantidad}x</strong>
                                                                                                {det.nombre} <span className="text-[10px] text-slate-400">({det.codigo})</span>
                                                                                            </span>
                                                                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                                                                {formatCurrency(det.subtotal)}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* PIE DEL MODAL CON ACCIÓN RÁPIDA DE PAGO */}
                        <div className="p-4 px-6 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                            <div className="text-xs">
                                <span className="text-slate-400 font-bold block uppercase text-[9px]">Comisión Neta Liquidada</span>
                                <span className="font-black text-lg text-emerald-700 dark:text-emerald-400">
                                    {formatCurrency(detalleDatos?.resumen?.comisionesActivas || vendedorSeleccionado.monto_comision)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={cerrarDetalleVendedor}
                                    className="border-slate-200 rounded-xl text-xs font-bold"
                                >
                                    Cerrar
                                </Button>
                                {vendedorSeleccionado.liquidacion_guardada && vendedorSeleccionado.liquidacion_guardada.estado !== "PAGADA" && (
                                    <Button
                                        onClick={() => handlePagarLiquidacion(vendedorSeleccionado.liquidacion_guardada.id)}
                                        disabled={isPending}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                                    >
                                        Registrar Pago
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
