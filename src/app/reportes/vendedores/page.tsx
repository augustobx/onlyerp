"use client";

import { useState, useEffect, useTransition, Fragment } from "react";
import { obtenerRendimiento } from "@/app/actions/rendimiento-vendedores";
import {
    Users, Calendar, Filter, TrendingUp, AlertOctagon, BadgeDollarSign,
    Search, FileText, Download, Wallet, Eye, EyeOff, Settings, Ban,
    CheckCircle2, Clock, ChevronDown, ChevronRight, Printer, Sparkles, Building2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import Link from "next/link";

export default function RendimientoVendedoresPage() {
    const [isPending, startTransition] = useTransition();

    // Rango de fechas
    const [fechaDesde, setFechaDesde] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);

    // Filtros
    const [vendedorId, setVendedorId] = useState<number | "TODOS">("TODOS");
    const [clienteId, setClienteId] = useState<number | "TODOS">("TODOS");
    const [estadoFiltro, setEstadoFiltro] = useState<"TODAS" | "ACTIVAS" | "CANCELADAS">("TODAS");
    const [busquedaTexto, setBusquedaTexto] = useState("");

    // Modo de visualización
    const [vistaModo, setVistaModo] = useState<"DETALLE" | "DIA" | "CLIENTE">("DETALLE");

    // Datos del servidor
    const [ventas, setVentas] = useState<any[]>([]);
    const [todasOperaciones, setTodasOperaciones] = useState<any[]>([]);
    const [recibos, setRecibos] = useState<any[]>([]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [metricasServidor, setMetricasServidor] = useState<any>(null);
    const [totalCobrado, setTotalCobrado] = useState(0);

    // Estado visual
    const [ventaExpandida, setVentaExpandida] = useState<string | null>(null);

    const cargarDatos = () => {
        startTransition(async () => {
            const res = await obtenerRendimiento({
                fechaDesde,
                fechaHasta,
                vendedorId,
                clienteId,
                estadoFiltro
            });
            if (res.success) {
                setVentas(res.ventas || []);
                setTodasOperaciones(res.todasOperaciones || []);
                setRecibos(res.recibos || []);
                setVendedores(res.vendedores || []);
                setClientes(res.clientes || []);
                setMetricasServidor(res.metricas || null);
                setTotalCobrado(res.totalCobrado || 0);
            }
        });
    };

    useEffect(() => {
        cargarDatos();
    }, [estadoFiltro]);

    const toggleDetalles = (id: string) => {
        setVentaExpandida(prev => prev === id ? null : id);
    };

    // Presets de fechas
    const aplicarPreset = (preset: "HOY" | "AYER" | "SEMANA" | "MES" | "MES_ANTERIOR") => {
        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];

        if (preset === "HOY") {
            setFechaDesde(hoyStr);
            setFechaHasta(hoyStr);
        } else if (preset === "AYER") {
            const ayer = new Date();
            ayer.setDate(hoy.getDate() - 1);
            const ayerStr = ayer.toISOString().split('T')[0];
            setFechaDesde(ayerStr);
            setFechaHasta(ayerStr);
        } else if (preset === "SEMANA") {
            const semanaAtras = new Date();
            semanaAtras.setDate(hoy.getDate() - 7);
            setFechaDesde(semanaAtras.toISOString().split('T')[0]);
            setFechaHasta(hoyStr);
        } else if (preset === "MES") {
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            setFechaDesde(inicioMes.toISOString().split('T')[0]);
            setFechaHasta(hoyStr);
        } else if (preset === "MES_ANTERIOR") {
            const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
            setFechaDesde(inicioMesAnt.toISOString().split('T')[0]);
            setFechaHasta(finMesAnt.toISOString().split('T')[0]);
        }
    };

    // Filtrar operaciones por texto de búsqueda adicional
    const operacionesFiltradas = ventas.filter(op => {
        if (!busquedaTexto.trim()) return true;
        const q = busquedaTexto.toLowerCase();
        const matchCliente = op.cliente?.nombre_razon_social?.toLowerCase().includes(q) || op.cliente?.dni_cuit?.includes(q);
        const matchComprobante = op.comprobante?.toLowerCase().includes(q);
        const matchVendedor = op.usuario?.nombre?.toLowerCase().includes(q);
        return matchCliente || matchComprobante || matchVendedor;
    });

    // Métricas dinámicas calculadas sobre las operaciones filtradas
    const metricas = metricasServidor || {
        totalFacturado: 0,
        totalCancelado: 0,
        comisionesTotales: 0,
        comisionesCanceladas: 0,
        totalPenalizaciones: 0,
        operacionesPenalizadas: 0,
        operacionesActivas: 0,
        operacionesCanceladas: 0,
        totalOperaciones: 0
    };

    // Agrupación por Día
    const operacionesPorDia = operacionesFiltradas.reduce((acc: any, op: any) => {
        const d = op.diaStr || "Sin fecha";
        if (!acc[d]) {
            acc[d] = {
                dia: d,
                fecha: op.fecha,
                operaciones: [],
                totalActivo: 0,
                totalCancelado: 0,
                comisionActiva: 0,
                comisionCancelada: 0,
            };
        }
        acc[d].operaciones.push(op);
        if (op.estadoComision === "CANCELADA") {
            acc[d].totalCancelado += op.total;
            acc[d].comisionCancelada += op.comisionCancelada;
        } else {
            acc[d].totalActivo += op.total;
            acc[d].comisionActiva += op.comisionGenerada;
        }
        return acc;
    }, {});

    const diasList = Object.values(operacionesPorDia).sort((a: any, b: any) => b.dia.localeCompare(a.dia));

    // Agrupación por Cliente
    const operacionesPorCliente = operacionesFiltradas.reduce((acc: any, op: any) => {
        const cId = op.cliente?.id || 0;
        const cNombre = op.cliente?.nombre_razon_social || "Consumidor Final";
        if (!acc[cId]) {
            acc[cId] = {
                id: cId,
                nombre: cNombre,
                cuit: op.cliente?.dni_cuit || "",
                operaciones: [],
                totalActivo: 0,
                totalCancelado: 0,
                comisionActiva: 0,
                comisionCancelada: 0,
            };
        }
        acc[cId].operaciones.push(op);
        if (op.estadoComision === "CANCELADA") {
            acc[cId].totalCancelado += op.total;
            acc[cId].comisionCancelada += op.comisionCancelada;
        } else {
            acc[cId].totalActivo += op.total;
            acc[cId].comisionActiva += op.comisionGenerada;
        }
        return acc;
    }, {});

    const clientesList = Object.values(operacionesPorCliente).sort((a: any, b: any) => (b.totalActivo + b.totalCancelado) - (a.totalActivo + a.totalCancelado));

    return (
        <div className="flex flex-col gap-6 max-w-[1500px] mx-auto pb-16 print:p-0">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3.5 rounded-2xl text-white shadow-md shadow-indigo-500/20">
                        <TrendingUp className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Rendimiento y Comisiones de Vendedores
                            </h1>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
                                Auditoría Comercial
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Control detallado por fecha, día, cliente y producto con gestión de penalizaciones y pedidos cancelados.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="border-slate-200 text-slate-700 font-bold rounded-xl"
                    >
                        <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
                    </Button>
                    <Link href="/configuracion/comercial">
                        <Button variant="outline" className="border-slate-200 font-bold text-slate-600 rounded-xl">
                            <Settings className="mr-2 h-4 w-4" /> Reglas Comerciales
                        </Button>
                    </Link>
                    <Link href="/reportes/comisiones">
                        <Button variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold rounded-xl">
                            <BadgeDollarSign className="mr-2 h-4 w-4" /> Liquidación Mensual
                        </Button>
                    </Link>
                </div>
            </div>

            {/* PANEL DE FILTROS AVANZADOS */}
            <Card className="shadow-sm border-slate-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 print:hidden">
                <CardContent className="p-5 space-y-4">
                    {/* PRESETS DE FECHA */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <Calendar className="h-4 w-4 text-indigo-600" /> Períodos Rápidos:
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: "HOY", label: "Hoy" },
                                { id: "AYER", label: "Ayer" },
                                { id: "SEMANA", label: "Últimos 7 días" },
                                { id: "MES", label: "Este Mes" },
                                { id: "MES_ANTERIOR", label: "Mes Anterior" },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => aplicarPreset(p.id as any)}
                                    className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SELECTORES DE FECHA, VENDEDOR, CLIENTE Y ESTADO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Desde</label>
                            <Input
                                type="date"
                                value={fechaDesde}
                                onChange={e => setFechaDesde(e.target.value)}
                                className="h-11 bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-slate-100 rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Hasta</label>
                            <Input
                                type="date"
                                value={fechaHasta}
                                onChange={e => setFechaHasta(e.target.value)}
                                className="h-11 bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-slate-100 rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Vendedor / Preventista</label>
                            <select
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-semibold text-slate-800 dark:text-slate-100"
                                value={vendedorId}
                                onChange={e => setVendedorId(e.target.value === "TODOS" ? "TODOS" : Number(e.target.value))}
                            >
                                <option value="TODOS">TODOS LOS VENDEDORES</option>
                                {vendedores.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.nombre} ({v.comision_personalizada ? `${v.comision_personalizada}%` : "Global"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Cliente</label>
                            <select
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-semibold text-slate-800 dark:text-slate-100"
                                value={clienteId}
                                onChange={e => setClienteId(e.target.value === "TODOS" ? "TODOS" : Number(e.target.value))}
                            >
                                <option value="TODOS">TODOS LOS CLIENTES</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Button
                                onClick={cargarDatos}
                                disabled={isPending}
                                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20"
                            >
                                {isPending ? "Filtrando..." : "Aplicar Filtros"} <Filter className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* FILTRO DE ESTADO Y BARRA DE BÚSQUEDA */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                        {/* Pestañas de Estado */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setEstadoFiltro("TODAS")}
                                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                                    estadoFiltro === "TODAS"
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                Todas ({metricas.totalOperaciones})
                            </button>
                            <button
                                type="button"
                                onClick={() => setEstadoFiltro("ACTIVAS")}
                                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                                    estadoFiltro === "ACTIVAS"
                                        ? "bg-white dark:bg-zinc-900 text-emerald-700 shadow-xs"
                                        : "text-slate-500 hover:text-emerald-700"
                                }`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Activas ({metricas.operacionesActivas})
                            </button>
                            <button
                                type="button"
                                onClick={() => setEstadoFiltro("CANCELADAS")}
                                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                                    estadoFiltro === "CANCELADAS"
                                        ? "bg-white dark:bg-zinc-900 text-rose-700 shadow-xs"
                                        : "text-slate-500 hover:text-rose-700"
                                }`}
                            >
                                <Ban className="h-3.5 w-3.5 text-rose-600" />
                                Canceladas ({metricas.operacionesCanceladas})
                            </button>
                        </div>

                        {/* Buscador de texto */}
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar comprobante, cliente o vendedor..."
                                value={busquedaTexto}
                                onChange={e => setBusquedaTexto(e.target.value)}
                                className="pl-9 h-10 bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-xs rounded-xl"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* TARJETAS DE MÉTRICAS CONSOLIDADAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Facturación Activa */}
                <Card className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl">
                    <CardContent className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facturación Activa</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                {formatCurrency(metricas.totalFacturado)}
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                                {metricas.operacionesActivas} operaciones vigentes
                            </p>
                        </div>
                        <div className="bg-slate-100 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600">
                            <FileText className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Comisiones a Pagar (Activas) */}
                <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50 shadow-sm rounded-3xl">
                    <CardContent className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                                Comisiones a Pagar
                            </p>
                            <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                                {formatCurrency(metricas.comisionesTotales)}
                            </h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-1">
                                Neto activo computable
                            </p>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 p-2.5 rounded-2xl">
                            <BadgeDollarSign className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Pedidos & Comisiones CANCELADAS */}
                <Card className="bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-sm rounded-3xl">
                    <CardContent className="p-5 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                                <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                                    Comisiones Canceladas
                                </p>
                            </div>
                            <h3 className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">
                                {formatCurrency(metricas.comisionesCanceladas)}
                            </h3>
                            <p className="text-xs font-bold text-rose-600 mt-1">
                                {metricas.operacionesCanceladas} pedidos cancelados ({formatCurrency(metricas.totalCancelado)})
                            </p>
                        </div>
                        <div className="bg-rose-100 dark:bg-rose-900/50 text-rose-700 p-2.5 rounded-2xl">
                            <Ban className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Penalizaciones por Exceso de Descuento */}
                <Card className="bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 shadow-sm rounded-3xl">
                    <CardContent className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                                Penalizaciones Dto.
                            </p>
                            <h3 className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
                                -{formatCurrency(metricas.totalPenalizaciones)}
                            </h3>
                            <p className="text-xs font-semibold text-amber-600 mt-1">
                                {metricas.operacionesPenalizadas} exceso de límite
                            </p>
                        </div>
                        <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 p-2.5 rounded-2xl">
                            <AlertOctagon className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Cobranzas Cta Cte */}
                <Card className="bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/50 shadow-sm rounded-3xl">
                    <CardContent className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                                Cobranzas en CC
                            </p>
                            <h3 className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-1">
                                {formatCurrency(totalCobrado)}
                            </h3>
                            <p className="text-xs font-semibold text-indigo-600 mt-1">
                                {recibos.length} recibos ingresados
                            </p>
                        </div>
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 p-2.5 rounded-2xl">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BARRA DE VISTAS (DETALLE vs AGRUPADO POR DÍA vs AGRUPADO POR CLIENTE) */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-3.5 px-6 rounded-2xl border border-slate-200 dark:border-zinc-800 print:hidden">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-400">Modalidad de Visualización:</span>
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setVistaModo("DETALLE")}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                                vistaModo === "DETALLE"
                                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            📋 Listado Detallado ({operacionesFiltradas.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setVistaModo("DIA")}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                                vistaModo === "DIA"
                                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            📅 Agrupado por Día ({diasList.length} días)
                        </button>
                        <button
                            type="button"
                            onClick={() => setVistaModo("CLIENTE")}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                                vistaModo === "CLIENTE"
                                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            🏢 Agrupado por Cliente ({clientesList.length})
                        </button>
                    </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                    Mostrando <span className="font-black text-slate-900 dark:text-white">{operacionesFiltradas.length}</span> operaciones evaluadas
                </div>
            </div>

            {/* ============================================================== */}
            {/* VISTA 1: LISTADO CRONOLÓGICO DETALLADO                         */}
            {/* ============================================================== */}
            {vistaModo === "DETALLE" && (
                <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-800/50 text-slate-500 font-bold uppercase tracking-wider">
                                    <th className="py-3.5 px-4 w-12 text-center">Detalle</th>
                                    <th className="py-3.5 px-4">Fecha / Hora</th>
                                    <th className="py-3.5 px-4">Operación</th>
                                    <th className="py-3.5 px-4">Vendedor / Preventista</th>
                                    <th className="py-3.5 px-4">Cliente</th>
                                    <th className="py-3.5 px-4 text-right">Monto Total</th>
                                    <th className="py-3.5 px-4 text-center">Control de Descuento</th>
                                    <th className="py-3.5 px-4 text-center">Estado Comisión</th>
                                    <th className="py-3.5 px-4 text-right">Comisión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {operacionesFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                                            No se encontraron operaciones con los filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    operacionesFiltradas.map((op) => {
                                        const esCancelada = op.estadoComision === "CANCELADA";
                                        const expandido = ventaExpandida === op.id;

                                        return (
                                            <Fragment key={op.id}>
                                                <tr className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition ${
                                                    esCancelada ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                                                }`}>
                                                    <td className="py-3 px-4 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => toggleDetalles(op.id)}
                                                            className={`h-8 w-8 rounded-lg ${
                                                                expandido ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-700'
                                                            }`}
                                                        >
                                                            {expandido ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </td>

                                                    {/* FECHA Y HORA */}
                                                    <td className="py-3 px-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{formatFechaLocal(op.fecha)}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{op.horaStr} hs</p>
                                                    </td>

                                                    {/* OPERACIÓN & TIPO */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                                op.tipo === "VENTA"
                                                                    ? "bg-purple-100 text-purple-700"
                                                                    : esCancelada
                                                                    ? "bg-rose-100 text-rose-700"
                                                                    : "bg-blue-100 text-blue-700"
                                                            }`}>
                                                                {op.tipo}
                                                            </span>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={op.comprobante}>
                                                                {op.comprobante}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            Estado: <span className="font-semibold">{op.estadoOperacion}</span>
                                                        </p>
                                                    </td>

                                                    {/* VENDEDOR */}
                                                    <td className="py-3 px-4">
                                                        <p className="font-bold text-slate-900 dark:text-white">{op.usuario?.nombre || "Sin Asignar"}</p>
                                                        <p className="text-[10px] text-slate-400">{op.usuario?.rol || "Preventista"}</p>
                                                    </td>

                                                    {/* CLIENTE */}
                                                    <td className="py-3 px-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={op.cliente?.nombre_razon_social}>
                                                            {op.cliente?.nombre_razon_social || "Consumidor Final"}
                                                        </p>
                                                        {op.cliente?.dni_cuit && (
                                                            <p className="text-[10px] text-slate-400 font-mono">{op.cliente.dni_cuit}</p>
                                                        )}
                                                    </td>

                                                    {/* MONTO TOTAL */}
                                                    <td className="py-3 px-4 text-right">
                                                        <span className={`font-black text-sm ${esCancelada ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                            {formatCurrency(op.total)}
                                                        </span>
                                                        {op.descuento_global > 0 && (
                                                            <p className="text-[10px] text-rose-500 font-semibold">
                                                                Dto: -{formatCurrency(op.descuento_global)}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* CONTROL DE DESCUENTO Y REGLAS */}
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <Badge variant="outline" className={`font-mono text-[10px] ${
                                                                op.esPenalizado
                                                                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                                                                    : 'text-slate-600 bg-slate-50 border-slate-200'
                                                            }`}>
                                                                Dto: {op.dtoPorcentaje.toFixed(1)}% (Max: {op.limiteAplicado}%)
                                                            </Badge>
                                                            {op.excedenteGlobal > 0 ? (
                                                                <span className="text-[9px] font-black text-rose-600 mt-0.5">
                                                                    Excede +{op.excedenteGlobal.toFixed(1)}% (Penalizado)
                                                                </span>
                                                            ) : op.esPenalizado ? (
                                                                <span className="text-[9px] font-black text-amber-600 mt-0.5">
                                                                    Exceso en ítems
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold text-emerald-600 mt-0.5">
                                                                    Dentro de límite
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* ESTADO COMISIÓN */}
                                                    <td className="py-3 px-4 text-center">
                                                        {esCancelada ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                                                <Ban className="h-3 w-3" /> CANCELADA
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> A PAGAR
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* MONTO COMISIÓN */}
                                                    <td className="py-3 px-4 text-right">
                                                        {esCancelada ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-black text-rose-600 text-sm">$0.00</span>
                                                                <span className="text-[10px] text-rose-400 font-bold line-through">
                                                                    Anulada: {formatCurrency(op.comisionCancelada)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                <span className={`font-black text-sm ${op.esPenalizado ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                                                    {formatCurrency(op.comisionGenerada)}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {op.porcentajeComisionAplicado.toFixed(1)}% asig.
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* DESPLIEGUE DE ARTÍCULOS AUDITADOS */}
                                                {expandido && (
                                                    <tr className="bg-indigo-50/30 dark:bg-indigo-950/20">
                                                        <td colSpan={9} className="p-4 px-12 border-b border-indigo-100 dark:border-zinc-800">
                                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <div className="flex justify-between items-center">
                                                                    <h4 className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <Sparkles className="h-3.5 w-3.5" /> Auditoría de Artículos y Límites Comerciales
                                                                    </h4>
                                                                    {op.notas && (
                                                                        <span className="text-[11px] text-slate-500 font-medium italic">
                                                                            Notas: {op.notas}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-indigo-100 dark:border-zinc-800 overflow-hidden">
                                                                    <table className="w-full text-left text-xs">
                                                                        <thead className="bg-indigo-50/70 dark:bg-zinc-800 text-[10px] text-indigo-900 dark:text-zinc-200 uppercase font-bold">
                                                                            <tr>
                                                                                <th className="py-2 px-4">Código / Producto</th>
                                                                                <th className="py-2 px-4 text-center">Cantidad</th>
                                                                                <th className="py-2 px-4 text-right">Precio Unitario</th>
                                                                                <th className="py-2 px-4 text-center">Dto. Individual</th>
                                                                                <th className="py-2 px-4 text-center">Límite Aplicado</th>
                                                                                <th className="py-2 px-4 text-right">Subtotal</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                                            {op.detalles?.map((det: any, idx: number) => (
                                                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                                                    <td className="py-2 px-4">
                                                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{det.nombre}</p>
                                                                                        <p className="text-[10px] text-slate-400 font-mono">SKU: {det.codigo}</p>
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                                                                        {det.cantidad}
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-right font-medium text-slate-600">
                                                                                        {formatCurrency(det.precio_unitario)}
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-center">
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                            det.excedente > 0
                                                                                                ? 'bg-rose-100 text-rose-700 font-black'
                                                                                                : 'text-slate-600'
                                                                                        }`}>
                                                                                            {det.descuento_individual}%
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-center">
                                                                                        <span className="text-[10px] text-slate-500">
                                                                                            Max: {det.limiteAplicado}%
                                                                                        </span>
                                                                                        {det.excedente > 0 && (
                                                                                            <span className="block text-[9px] font-black text-rose-600">
                                                                                                Excede +{det.excedente}%
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">
                                                                                        {formatCurrency(det.subtotal)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
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
                </Card>
            )}

            {/* ============================================================== */}
            {/* VISTA 2: AGRUPADO POR DÍA                                      */}
            {/* ============================================================== */}
            {vistaModo === "DIA" && (
                <div className="space-y-4">
                    {diasList.length === 0 ? (
                        <Card className="p-12 text-center text-slate-400 font-medium">
                            No hay operaciones en este rango de fechas.
                        </Card>
                    ) : (
                        diasList.map((dItem: any) => (
                            <Card key={dItem.dia} className="border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-zinc-900">
                                <div className="p-4 px-6 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-base text-slate-900 dark:text-white">
                                                {formatFechaLocal(dItem.fecha)}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {dItem.operaciones.length} operaciones registradas
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 text-xs">
                                        <div>
                                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Total Activo</span>
                                            <span className="font-black text-sm text-slate-900 dark:text-white">
                                                {formatCurrency(dItem.totalActivo)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-emerald-600 font-bold block uppercase text-[9px]">Comisiones a Pagar</span>
                                            <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                                                {formatCurrency(dItem.comisionActiva)}
                                            </span>
                                        </div>
                                        {dItem.comisionCancelada > 0 && (
                                            <div className="border-l border-slate-200 dark:border-zinc-700 pl-4">
                                                <span className="text-rose-600 font-bold block uppercase text-[9px]">Comisiones Canceladas</span>
                                                <span className="font-black text-sm text-rose-700">
                                                    {formatCurrency(dItem.comisionCancelada)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 pb-2">
                                                <th className="pb-2">Hora</th>
                                                <th className="pb-2">Comprobante</th>
                                                <th className="pb-2">Vendedor</th>
                                                <th className="pb-2">Cliente</th>
                                                <th className="pb-2 text-right">Total</th>
                                                <th className="pb-2 text-center">Estado</th>
                                                <th className="pb-2 text-right">Comisión</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {dItem.operaciones.map((op: any) => {
                                                const esCancel = op.estadoComision === "CANCELADA";
                                                return (
                                                    <tr key={op.id} className="hover:bg-slate-50/50">
                                                        <td className="py-2.5 font-mono text-slate-500">{op.horaStr}</td>
                                                        <td className="py-2.5 font-bold text-slate-800">{op.comprobante}</td>
                                                        <td className="py-2.5 text-slate-700">{op.usuario?.nombre}</td>
                                                        <td className="py-2.5 text-slate-700">{op.cliente?.nombre_razon_social}</td>
                                                        <td className={`py-2.5 text-right font-black ${esCancel ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                            {formatCurrency(op.total)}
                                                        </td>
                                                        <td className="py-2.5 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                esCancel ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                                                            }`}>
                                                                {op.estadoComision}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 text-right font-black">
                                                            {esCancel ? (
                                                                <span className="text-rose-600">$0.00 (Anulada)</span>
                                                            ) : (
                                                                <span className="text-emerald-700">{formatCurrency(op.comisionGenerada)}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* ============================================================== */}
            {/* VISTA 3: AGRUPADO POR CLIENTE                                  */}
            {/* ============================================================== */}
            {vistaModo === "CLIENTE" && (
                <div className="space-y-4">
                    {clientesList.length === 0 ? (
                        <Card className="p-12 text-center text-slate-400 font-medium">
                            No hay operaciones en este rango de fechas.
                        </Card>
                    ) : (
                        clientesList.map((cItem: any) => (
                            <Card key={cItem.id} className="border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-zinc-900">
                                <div className="p-4 px-6 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 text-purple-700 rounded-xl font-black text-xs">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-base text-slate-900 dark:text-white">
                                                {cItem.nombre}
                                            </h3>
                                            {cItem.cuit && (
                                                <p className="text-xs text-slate-400 font-mono">CUIT: {cItem.cuit}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 text-xs">
                                        <div>
                                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Operaciones</span>
                                            <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                                                {cItem.operaciones.length}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Total Facturado</span>
                                            <span className="font-black text-sm text-slate-900 dark:text-white">
                                                {formatCurrency(cItem.totalActivo)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-emerald-600 font-bold block uppercase text-[9px]">Comisiones a Pagar</span>
                                            <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                                                {formatCurrency(cItem.comisionActiva)}
                                            </span>
                                        </div>
                                        {cItem.comisionCancelada > 0 && (
                                            <div className="border-l border-slate-200 dark:border-zinc-700 pl-4">
                                                <span className="text-rose-600 font-bold block uppercase text-[9px]">Canceladas</span>
                                                <span className="font-black text-sm text-rose-700">
                                                    {formatCurrency(cItem.comisionCancelada)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 pb-2">
                                                <th className="pb-2">Fecha</th>
                                                <th className="pb-2">Comprobante</th>
                                                <th className="pb-2">Vendedor</th>
                                                <th className="pb-2 text-right">Total</th>
                                                <th className="pb-2 text-center">Estado</th>
                                                <th className="pb-2 text-right">Comisión</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {cItem.operaciones.map((op: any) => {
                                                const esCancel = op.estadoComision === "CANCELADA";
                                                return (
                                                    <tr key={op.id} className="hover:bg-slate-50/50">
                                                        <td className="py-2.5 text-slate-600">{formatFechaLocal(op.fecha)}</td>
                                                        <td className="py-2.5 font-bold text-slate-800">{op.comprobante}</td>
                                                        <td className="py-2.5 text-slate-700">{op.usuario?.nombre}</td>
                                                        <td className={`py-2.5 text-right font-black ${esCancel ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                            {formatCurrency(op.total)}
                                                        </td>
                                                        <td className="py-2.5 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                esCancel ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                                                            }`}>
                                                                {op.estadoComision}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 text-right font-black">
                                                            {esCancel ? (
                                                                <span className="text-rose-600">$0.00 (Anulada)</span>
                                                            ) : (
                                                                <span className="text-emerald-700">{formatCurrency(op.comisionGenerada)}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}