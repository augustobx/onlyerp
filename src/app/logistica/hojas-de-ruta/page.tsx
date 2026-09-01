"use client";

import { useEffect, useState, useTransition } from "react";
import {
    obtenerHojasDeRuta,
    obtenerPedidosParaAsignarRuta,
    crearHojaDeRuta,
    cambiarEstadoHojaDeRuta
} from "@/app/actions/logistica";
import { obtenerRepartidores } from "@/app/actions/pedidos";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import {
    Truck,
    Route,
    Plus,
    Calendar,
    User,
    CheckCircle2,
    Clock,
    AlertCircle,
    Printer,
    FileSpreadsheet,
    DollarSign,
    RefreshCw,
    X,
    ChevronRight,
    MapPin,
    ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function HojasDeRutaPage() {
    const [rutas, setRutas] = useState<any[]>([]);
    const [repartidores, setRepartidores] = useState<any[]>([]);
    const [pedidosDisponibles, setPedidosDisponibles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState("TODOS");
    const [filtroRepartidor, setFiltroRepartidor] = useState("0");
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

    // Modal Crear Ruta
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [formRepartidorId, setFormRepartidorId] = useState("");
    const [formFechaDespacho, setFormFechaDespacho] = useState(new Date().toISOString().split('T')[0]);
    const [formVehiculo, setFormVehiculo] = useState("");
    const [formZona, setFormZona] = useState("");
    const [formKmInicial, setFormKmInicial] = useState("");
    const [formNotas, setFormNotas] = useState("");
    const [pedidosSeleccionados, setPedidosSeleccionados] = useState<number[]>([]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [resRutas, resRepartidores] = await Promise.all([
                obtenerHojasDeRuta({
                    estado: filtroEstado,
                    repartidorId: Number(filtroRepartidor) || undefined,
                    fecha_desde: filtroFechaDesde || undefined,
                    fecha_hasta: filtroFechaHasta || undefined
                }),
                obtenerRepartidores()
            ]);

            if (resRutas.success && resRutas.data) {
                setRutas(resRutas.data);
            }
            setRepartidores(resRepartidores || []);
        } catch (e) {
            toast.error("Error al cargar hojas de ruta");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [filtroEstado, filtroRepartidor, filtroFechaDesde, filtroFechaHasta]);

    const abrirModalCrear = async () => {
        setFormRepartidorId(repartidores[0]?.id ? String(repartidores[0].id) : "");
        setPedidosSeleccionados([]);
        const resPedidos = await obtenerPedidosParaAsignarRuta();
        if (resPedidos.success && resPedidos.data) {
            setPedidosDisponibles(resPedidos.data);
        }
        setModalCrearAbierto(true);
    };

    const togglePedidoSeleccionado = (id: number) => {
        setPedidosSeleccionados(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleGuardarRuta = () => {
        if (!formRepartidorId) {
            toast.error("Seleccione un chofer/repartidor.");
            return;
        }
        if (pedidosSeleccionados.length === 0) {
            toast.error("Seleccione al menos un pedido para armar la ruta.");
            return;
        }

        startTransition(async () => {
            const res = await crearHojaDeRuta({
                repartidorId: Number(formRepartidorId),
                fecha_despacho: formFechaDespacho,
                vehiculo: formVehiculo,
                zona: formZona,
                km_inicial: formKmInicial ? Number(formKmInicial) : undefined,
                notas: formNotas,
                pedidosIds: pedidosSeleccionados
            });

            if (res.success && res.data) {
                toast.success(`Hoja de Ruta #${res.data.numero} creada exitosamente.`);
                setModalCrearAbierto(false);
                cargarDatos();
            } else {
                toast.error(res.error || "Error al crear hoja de ruta");
            }
        });
    };

    const handleCambiarEstado = async (id: number, estado: 'EN_PREPARACION' | 'EN_RUTA' | 'CANCELADA') => {
        startTransition(async () => {
            const res = await cambiarEstadoHojaDeRuta(id, estado);
            if (res.success) {
                toast.success(`Ruta actualizada a ${estado}`);
                cargarDatos();
            } else {
                toast.error(res.error || "Error al actualizar estado");
            }
        });
    };

    const totalImporteSeleccionado = pedidosDisponibles
        .filter(p => pedidosSeleccionados.includes(p.id))
        .reduce((acc, p) => acc + p.total, 0);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Route className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Hojas de Ruta & Despacho
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Gestión de camiones, consolidado de carga para depósito y rendición de choferes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={cargarDatos}
                        disabled={loading}
                        className="p-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-xl transition"
                        title="Refrescar"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={abrirModalCrear}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition"
                    >
                        <Plus className="h-4 w-4" /> Armar Nueva Hoja de Ruta
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Estado:</span>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="EN_PREPARACION">En Preparación (Depósito)</option>
                        <option value="EN_RUTA">En Ruta (Repartiendo)</option>
                        <option value="RENDIDA">Rendida / Finalizada</option>
                        <option value="CANCELADA">Cancelada</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Chofer:</span>
                    <select
                        value={filtroRepartidor}
                        onChange={(e) => setFiltroRepartidor(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                    >
                        <option value="0">Todos los choferes</option>
                        {repartidores.map(r => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Fecha:</span>
                    <input
                        type="date"
                        value={filtroFechaDesde}
                        onChange={(e) => setFiltroFechaDesde(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        value={filtroFechaHasta}
                        onChange={(e) => setFiltroFechaHasta(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                    />
                </div>
            </div>

            {/* LISTADO DE HOJAS DE RUTA */}
            {loading ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Cargando hojas de ruta...</p>
                </div>
            ) : rutas.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
                    <Truck className="h-12 w-12 mx-auto text-slate-300 dark:text-zinc-700" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay hojas de ruta registradas</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Crea una nueva hoja de ruta agrupando los pedidos listos para despachar con un chofer y vehículo.
                    </p>
                    <button
                        onClick={abrirModalCrear}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition"
                    >
                        <Plus className="h-4 w-4" /> Armar Primera Ruta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {rutas.map(ruta => {
                        const totalImporte = ruta.detalles.reduce((acc: number, d: any) => acc + (d.pedido?.total || 0), 0);
                        const totalBultos = ruta.detalles.reduce((acc: number, d: any) => acc + (d.pedido?.detalles?.length || 0), 0);

                        return (
                            <div
                                key={ruta.id}
                                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                            >
                                {/* Header Card */}
                                <div className="p-5 border-b border-slate-100 dark:border-zinc-800 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                                                Ruta #{ruta.numero}
                                            </span>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                                                {ruta.zona || "Ruta General"}
                                            </h3>
                                        </div>

                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                            ruta.estado === 'RENDIDA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                                            ruta.estado === 'EN_RUTA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                                            ruta.estado === 'EN_PREPARACION' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' :
                                            'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-400'
                                        }`}>
                                            {ruta.estado === 'EN_PREPARACION' ? 'En Preparación' :
                                             ruta.estado === 'EN_RUTA' ? 'En Reparto' :
                                             ruta.estado === 'RENDIDA' ? 'Rendida' : ruta.estado}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            <span>{formatFechaLocal(ruta.fecha_despacho)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="font-bold truncate">{ruta.repartidor?.nombre}</span>
                                        </div>
                                        {ruta.vehiculo && (
                                            <div className="flex items-center gap-1.5 col-span-2">
                                                <Truck className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="truncate">{ruta.vehiculo}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Body Card - Paradas */}
                                <div className="p-5 space-y-3 bg-slate-50/50 dark:bg-zinc-900/50">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span>{ruta.detalles.length} Entregas ({totalBultos} bultos)</span>
                                        <span className="text-slate-900 dark:text-white font-black text-sm">{formatCurrency(totalImporte)}</span>
                                    </div>

                                    {/* Preview Paradas */}
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {ruta.detalles.map((d: any) => (
                                            <div key={d.id} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-800/60 p-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="font-black text-slate-400 w-4 text-center">{d.orden_parada}</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {d.pedido?.cliente?.nombre_razon_social}
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0 ml-2">
                                                    {formatCurrency(d.pedido?.total || 0)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer Card - Acciones */}
                                <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-zinc-900">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/imprimir/consolidado-carga/${ruta.id}`}
                                            target="_blank"
                                            className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                                            title="Imprimir Picking para Depósito"
                                        >
                                            <Printer className="h-3.5 w-3.5" /> Picking
                                        </Link>
                                        <Link
                                            href={`/imprimir/hoja-de-ruta/${ruta.id}`}
                                            target="_blank"
                                            className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                                            title="Imprimir Hoja de Ruta Chofer"
                                        >
                                            <FileSpreadsheet className="h-3.5 w-3.5" /> Ruta
                                        </Link>
                                    </div>

                                    {ruta.estado === 'EN_PREPARACION' && (
                                        <button
                                            onClick={() => handleCambiarEstado(ruta.id, 'EN_RUTA')}
                                            disabled={isPending}
                                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition"
                                        >
                                            Despachar Camión
                                        </button>
                                    )}

                                    {ruta.estado === 'EN_RUTA' && (
                                        <Link
                                            href={`/logistica/rendicion/${ruta.id}`}
                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"
                                        >
                                            <DollarSign className="h-3.5 w-3.5" /> Rendir Chofer
                                        </Link>
                                    )}

                                    {ruta.estado === 'RENDIDA' && (
                                        <Link
                                            href={`/logistica/rendicion/${ruta.id}`}
                                            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg flex items-center gap-1"
                                        >
                                            Ver Rendición
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL CREAR HOJA DE RUTA */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-8">
                        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Armar Nueva Hoja de Ruta</h2>
                                <p className="text-xs text-slate-500">Agrupa los pedidos en un camión para el picking y reparto</p>
                            </div>
                            <button onClick={() => setModalCrearAbierto(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Datos Cabecera */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Chofer / Repartidor *</label>
                                    <select
                                        value={formRepartidorId}
                                        onChange={(e) => setFormRepartidorId(e.target.value)}
                                        className="w-full mt-1.5 p-2.5 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium"
                                    >
                                        <option value="">Seleccione Chofer</option>
                                        {repartidores.map(r => (
                                            <option key={r.id} value={r.id}>{r.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Fecha Despacho *</label>
                                    <input
                                        type="date"
                                        value={formFechaDespacho}
                                        onChange={(e) => setFormFechaDespacho(e.target.value)}
                                        className="w-full mt-1.5 p-2.5 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Zona / Recorrido</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Ruta 9 Norte / Centro"
                                        value={formZona}
                                        onChange={(e) => setFormZona(e.target.value)}
                                        className="w-full mt-1.5 p-2.5 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Vehículo / Camión</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Ford 4000 - AA123BB"
                                        value={formVehiculo}
                                        onChange={(e) => setFormVehiculo(e.target.value)}
                                        className="w-full mt-1.5 p-2.5 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">KM Inicial</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formKmInicial}
                                        onChange={(e) => setFormKmInicial(e.target.value)}
                                        className="w-full mt-1.5 p-2.5 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Notas / Obs.</label>
                                    <input
                                        type="text"
                                        placeholder="Observaciones de reparto..."
                                        value={formNotas}
                                        onChange={(e) => setFormNotas(e.target.value)}
                                        className="w-full mt-1.5 p-2.5 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Selector de Pedidos */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                        Seleccionar Pedidos para la Carga ({pedidosSeleccionados.length} elegidos)
                                    </h3>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                        Total Carga: {formatCurrency(totalImporteSeleccionado)}
                                    </span>
                                </div>

                                {pedidosDisponibles.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-6 text-center bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                                        No hay pedidos pendientes de asignar en este momento.
                                    </p>
                                ) : (
                                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                                        {pedidosDisponibles.map(p => {
                                            const isSelected = pedidosSeleccionados.includes(p.id);
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => togglePedidoSeleccionado(p.id)}
                                                    className={`p-3 flex items-center justify-between cursor-pointer transition ${
                                                        isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                            className="rounded border-slate-300 text-indigo-600 h-4 w-4 pointer-events-none"
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-xs text-slate-900 dark:text-white">
                                                                    Pedido #{p.numero}
                                                                </span>
                                                                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                                    {p.cliente?.nombre_razon_social}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                                <MapPin className="h-3 w-3" /> {p.cliente?.direccion || "Sin dirección"}
                                                                <span>•</span>
                                                                <span>{p.detalles?.length || 0} productos</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="font-black text-sm text-slate-900 dark:text-white">
                                                            {formatCurrency(p.total)}
                                                        </span>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400">
                                                            {p.metodo_pago}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-zinc-900">
                            <button
                                onClick={() => setModalCrearAbierto(false)}
                                className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardarRuta}
                                disabled={isPending || pedidosSeleccionados.length === 0}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition"
                            >
                                {isPending ? "Creando..." : "Confirmar y Generar Ruta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
