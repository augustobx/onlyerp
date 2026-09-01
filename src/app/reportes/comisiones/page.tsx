"use client";

import { useEffect, useState, useTransition } from "react";
import { calcularPreliquidacionVendedores, guardarLiquidacion, pagarLiquidacion } from "@/app/actions/comisiones";
import { formatCurrency } from "@/lib/utils";
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
    Wallet
} from "lucide-react";
import { toast } from "sonner";

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
            } else {
                toast.error(res.error || "Error al registrar pago");
            }
        });
    };

    const totalBase = vendedores.reduce((acc, v) => acc + v.base_monto, 0);
    const totalComisiones = vendedores.reduce((acc, v) => acc + v.monto_comision, 0);

    return (
        <div className="p-6 max-w-[1500px] mx-auto space-y-6">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                        <Award className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Liquidación de Comisiones a Vendedores
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Cálculo automático sobre facturación bruta o cobranzas efectivas en Cuentas Corrientes
                        </p>
                    </div>
                </div>

                <button
                    onClick={cargarComisiones}
                    disabled={loading}
                    className="p-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-xl transition"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* BARRA DE CONTROLES: PERÍODO Y BASE DE CÁLCULO */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase">Mes:</span>
                        <select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
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
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 dark:border-zinc-800 pl-4">
                        <span className="text-xs font-bold text-slate-400 uppercase">Calcular Sobre:</span>
                        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                            <button
                                onClick={() => setBaseCalculo('FACTURACION')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                                    baseCalculo === 'FACTURACION' ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                📄 Ventas Facturadas
                            </button>
                            <button
                                onClick={() => setBaseCalculo('COBRANZA')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                                    baseCalculo === 'COBRANZA' ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                💵 Cobranzas Reales en CC
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <div>
                        Base Total ({baseCalculo}): <span className="text-slate-900 dark:text-white font-black text-sm">{formatCurrency(totalBase)}</span>
                    </div>
                    <div>
                        Comisiones a Pagar: <span className="text-amber-600 font-black text-sm">{formatCurrency(totalComisiones)}</span>
                    </div>
                </div>
            </div>

            {/* TABLA DE VENDEDORES */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-800/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3.5 px-4">VENDEDOR</th>
                            <th className="py-3.5 px-4 text-center">% COMISIÓN</th>
                            <th className="py-3.5 px-4 text-right">TOTAL FACTURADO</th>
                            <th className="py-3.5 px-4 text-right">TOTAL COBRADO</th>
                            <th className="py-3.5 px-4 text-right bg-amber-50/30 dark:bg-amber-950/20">BASE CÁLCULO</th>
                            <th className="py-3.5 px-4 text-right font-black">COMISIÓN ($)</th>
                            <th className="py-3.5 px-4 text-center">ESTADO</th>
                            <th className="py-3.5 px-4 text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
                                    Calculando comisiones del período...
                                </td>
                            </tr>
                        ) : vendedores.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    No se registraron ventas ni cobranzas para los vendedores en este período.
                                </td>
                            </tr>
                        ) : (
                            vendedores.map(v => {
                                const liq = v.liquidacion_guardada;
                                const pagada = liq?.estado === 'PAGADA';

                                return (
                                    <tr key={v.usuarioId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {v.nombre}
                                            </div>
                                            <p className="text-[10px] text-slate-400">@{v.username} ({v.rol})</p>
                                        </td>

                                        <td className="py-3.5 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                            {v.porcentaje_comision}%
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                            {formatCurrency(v.total_ventas)}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                            {formatCurrency(v.total_cobranzas)}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white bg-amber-50/30 dark:bg-amber-950/20">
                                            {formatCurrency(v.base_monto)}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-black text-sm text-amber-600 dark:text-amber-400">
                                            {formatCurrency(v.monto_comision)}
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                pagada ? 'bg-emerald-100 text-emerald-700' :
                                                liq ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {pagada ? 'Pagada' : liq ? 'Guardada / Pendiente' : 'Preliquidación'}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right space-x-2">
                                            {!pagada && (
                                                <button
                                                    onClick={() => handleGuardarLiquidacion(v)}
                                                    disabled={isPending}
                                                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-lg transition"
                                                >
                                                    Guardar
                                                </button>
                                            )}

                                            {liq && !pagada && (
                                                <button
                                                    onClick={() => handlePagarLiquidacion(liq.id)}
                                                    disabled={isPending}
                                                    className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
