"use client";

import { useEffect, useState, useTransition } from "react";
import {
    obtenerCheques,
    obtenerKpisCarteraValores,
    registrarChequeManual,
    depositarChequesEnLote,
    endosarChequesAProveedor,
    marcarChequeRechazado
} from "@/app/actions/cheques";
import { getProveedores } from "@/app/actions/productos";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import {
    Landmark,
    Plus,
    Calendar,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Building2,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    FileSpreadsheet,
    ShieldAlert
} from "lucide-react";
import { toast } from "sonner";

export default function CarteraValoresPage() {
    const [cheques, setCheques] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState("EN_CARTERA");
    const [filtroTipo, setFiltroTipo] = useState("TODOS");
    const [filtroBanco, setFiltroBanco] = useState("");
    const [filtroTermino, setFiltroTermino] = useState("");
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

    // Selección múltiple
    const [seleccionados, setSeleccionados] = useState<number[]>([]);

    // Modales
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [modalEndosoAbierto, setModalEndosoAbierto] = useState(false);
    const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
    const [chequeParaRechazo, setChequeParaRechazo] = useState<any>(null);
    const [motivoRechazo, setMotivoRechazo] = useState("");

    // Form Nuevo Cheque
    const [formBanco, setFormBanco] = useState("");
    const [formNumero, setFormNumero] = useState("");
    const [formMonto, setFormMonto] = useState("");
    const [formFechaCobro, setFormFechaCobro] = useState(new Date().toISOString().split('T')[0]);
    const [formTipo, setFormTipo] = useState<'FISICO' | 'ECHEQ'>('FISICO');
    const [formLibrador, setFormLibrador] = useState("");
    const [formCuitLibrador, setFormCuitLibrador] = useState("");
    const [formNotas, setFormNotas] = useState("");

    // Form Endoso
    const [proveedorEndosoId, setProveedorEndosoId] = useState("");
    const [notasEndoso, setNotasEndoso] = useState("");

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [resCheques, resKpis, resProv] = await Promise.all([
                obtenerCheques({
                    estado: filtroEstado,
                    tipo: filtroTipo,
                    banco: filtroBanco,
                    termino: filtroTermino,
                    fecha_desde: filtroFechaDesde,
                    fecha_hasta: filtroFechaHasta
                }),
                obtenerKpisCarteraValores(),
                getProveedores()
            ]);

            if (resCheques.success && resCheques.data) setCheques(resCheques.data);
            if (resKpis.success && resKpis.data) setKpis(resKpis.data);
            setProveedores(resProv || []);
        } catch (e) {
            toast.error("Error al cargar cartera de valores");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [filtroEstado, filtroTipo, filtroBanco, filtroTermino, filtroFechaDesde, filtroFechaHasta]);

    const toggleSeleccion = (id: number) => {
        setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleDepositarLote = () => {
        if (seleccionados.length === 0) return;
        startTransition(async () => {
            const res = await depositarChequesEnLote(seleccionados, "Depósito registrado desde Cartera de Valores");
            if (res.success) {
                toast.success(`${seleccionados.length} cheque(s) marcados como depositados.`);
                setSeleccionados([]);
                cargarDatos();
            } else {
                toast.error(res.error || "Error al depositar cheques");
            }
        });
    };

    const handleEndosarLote = () => {
        if (!proveedorEndosoId) {
            toast.error("Seleccione el proveedor.");
            return;
        }

        startTransition(async () => {
            const res = await endosarChequesAProveedor(seleccionados, Number(proveedorEndosoId), notasEndoso);
            if (res.success) {
                toast.success(`${seleccionados.length} cheque(s) endosados al proveedor.`);
                setModalEndosoAbierto(false);
                setSeleccionados([]);
                cargarDatos();
            } else {
                toast.error(res.error || "Error al endosar cheques");
            }
        });
    };

    const handleConfirmarRechazo = () => {
        if (!motivoRechazo.trim()) {
            toast.error("Indique el motivo del rechazo.");
            return;
        }

        startTransition(async () => {
            const res = await marcarChequeRechazado(chequeParaRechazo.id, motivoRechazo);
            if (res.success) {
                toast.warning("Cheque marcado como RECHAZADO y deuda reabierta en Cuenta Corriente del cliente.");
                setModalRechazoAbierto(false);
                cargarDatos();
            } else {
                toast.error(res.error || "Error al registrar rechazo");
            }
        });
    };

    const handleGuardarNuevoCheque = () => {
        startTransition(async () => {
            const res = await registrarChequeManual({
                numero_cheque: formNumero,
                banco: formBanco,
                monto: Number(formMonto),
                fecha_cobro: formFechaCobro,
                tipo: formTipo,
                nombre_librador: formLibrador,
                cuit_librador: formCuitLibrador,
                notas: formNotas
            });

            if (res.success) {
                toast.success("Cheque registrado en Cartera de Valores.");
                setModalCrearAbierto(false);
                cargarDatos();
            } else {
                toast.error(res.error || "Error al registrar cheque");
            }
        });
    };

    const totalSeleccionadoMonto = cheques
        .filter(c => seleccionados.includes(c.id))
        .reduce((acc, c) => acc + c.monto, 0);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Cartera de Valores & Cheques
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Control de cheques físicos, eCheqs diferidos, depósitos y endosos a proveedores
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={cargarDatos}
                        disabled={loading}
                        className="p-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-xl transition"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setModalCrearAbierto(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition"
                    >
                        <Plus className="h-4 w-4" /> Ingresar Cheque Manual
                    </button>
                </div>
            </div>

            {/* KPIS DE CARTERA */}
            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400">En Cartera Total</p>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(kpis.enCarteraMonto)}</p>
                        <p className="text-xs text-slate-500 font-semibold">{kpis.enCarteraCantidad} cheque(s)</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-950/50 bg-amber-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-amber-600">Vence en 7 Días</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-400">{formatCurrency(kpis.porVencerMonto)}</p>
                        <p className="text-xs text-amber-600/80 font-semibold">{kpis.porVencerCantidad} a cobrar pronto</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/50 bg-emerald-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-emerald-600">Cobrados este Mes</p>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(kpis.cobradosMesMonto)}</p>
                        <p className="text-xs text-emerald-600/80 font-semibold">{kpis.cobradosMesCantidad} depositados/cobrados</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-950/50 bg-blue-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-blue-600">Endosados a Proveedor</p>
                        <p className="text-xl font-black text-blue-700 dark:text-blue-400">{formatCurrency(kpis.endosadosMonto)}</p>
                        <p className="text-xs text-blue-600/80 font-semibold">{kpis.endosadosCantidad} cedidos en pago</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-red-200 dark:border-red-950/50 bg-red-50/20 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-red-600">Rechazados</p>
                        <p className="text-xl font-black text-red-700 dark:text-red-400">{formatCurrency(kpis.rechazadosMonto)}</p>
                        <p className="text-xs text-red-600/80 font-semibold">{kpis.rechazadosCantidad} con problemas</p>
                    </div>
                </div>
            )}

            {/* FILTROS & BARRA DE ACCIONES EN LOTE */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Estado:</span>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                        >
                            <option value="TODOS">Todos los estados</option>
                            <option value="EN_CARTERA">🟢 En Cartera (Disponible)</option>
                            <option value="DEPOSITADO">🔵 Depositado en Banco</option>
                            <option value="ENDOSADO_PROVEEDOR">🟣 Endosado a Proveedor</option>
                            <option value="COBRADO">✅ Cobrado</option>
                            <option value="RECHAZADO">🔴 Rechazado</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Tipo:</span>
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                        >
                            <option value="TODOS">Físicos y eCheqs</option>
                            <option value="FISICO">Cheques Físicos</option>
                            <option value="ECHEQ">eCheqs Electrónicos</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar nro, banco, cliente..."
                            value={filtroTermino}
                            onChange={(e) => setFiltroTermino(e.target.value)}
                            className="text-sm border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 w-56"
                        />
                    </div>
                </div>

                {/* Acciones en Lote */}
                {seleccionados.length > 0 && (
                    <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/60 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800">
                        <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                            {seleccionados.length} seleccionados ({formatCurrency(totalSeleccionadoMonto)})
                        </span>
                        <button
                            onClick={handleDepositarLote}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
                        >
                            Depositar en Banco
                        </button>
                        <button
                            onClick={() => setModalEndosoAbierto(true)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                        >
                            Endosar a Proveedor
                        </button>
                    </div>
                )}
            </div>

            {/* TABLA DE CHEQUES */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-800/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3.5 px-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={cheques.length > 0 && seleccionados.length === cheques.length}
                                    onChange={(e) => {
                                        if (e.target.checked) setSeleccionados(cheques.map(c => c.id));
                                        else setSeleccionados([]);
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                                />
                            </th>
                            <th className="py-3.5 px-4">CHEQUE / BANCO</th>
                            <th className="py-3.5 px-4">EMISOR / CLIENTE</th>
                            <th className="py-3.5 px-4">FECHA COBRO</th>
                            <th className="py-3.5 px-4 text-right">IMPORTE</th>
                            <th className="py-3.5 px-4 text-center">ESTADO</th>
                            <th className="py-3.5 px-4 text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                                    Cargando valores...
                                </td>
                            </tr>
                        ) : cheques.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    No se encontraron cheques con los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            cheques.map(ch => {
                                const hoy = new Date();
                                const fechaCobro = new Date(ch.fecha_cobro);
                                const diffDias = Math.ceil((fechaCobro.getTime() - hoy.getTime()) / (1000 * 3600 * 24));

                                const isSelected = seleccionados.includes(ch.id);

                                return (
                                    <tr key={ch.id} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                                        <td className="py-3.5 px-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSeleccion(ch.id)}
                                                className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                                            />
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {ch.banco}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                                                <span>N° {ch.numero_cheque}</span>
                                                <span>•</span>
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${ch.tipo === 'ECHEQ' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {ch.tipo}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {ch.cliente?.nombre_razon_social || ch.nombre_librador || "Librador Particular"}
                                            </div>
                                            {ch.cuit_librador && (
                                                <p className="text-[10px] text-slate-400 font-mono">CUIT: {ch.cuit_librador}</p>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {formatFechaLocal(ch.fecha_cobro)}
                                            </div>
                                            {ch.estado === 'EN_CARTERA' && (
                                                <span className={`text-[10px] font-bold ${
                                                    diffDias < 0 ? 'text-red-600 font-black' :
                                                    diffDias <= 7 ? 'text-amber-600' : 'text-slate-400'
                                                }`}>
                                                    {diffDias < 0 ? `Vencido hace ${Math.abs(diffDias)}d` :
                                                     diffDias === 0 ? "Vence hoy" : `En ${diffDias} días`}
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-black text-sm text-slate-900 dark:text-white">
                                            {formatCurrency(ch.monto)}
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                ch.estado === 'EN_CARTERA' ? 'bg-emerald-100 text-emerald-700' :
                                                ch.estado === 'DEPOSITADO' ? 'bg-blue-100 text-blue-700' :
                                                ch.estado === 'ENDOSADO_PROVEEDOR' ? 'bg-purple-100 text-purple-700' :
                                                ch.estado === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {ch.estado === 'EN_CARTERA' ? 'En Cartera' :
                                                 ch.estado === 'DEPOSITADO' ? 'Depositado' :
                                                 ch.estado === 'ENDOSADO_PROVEEDOR' ? `Endosado (${ch.proveedor?.nombre || 'Proveedor'})` :
                                                 ch.estado === 'RECHAZADO' ? 'Rechazado' : ch.estado}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                            {ch.estado === 'EN_CARTERA' && (
                                                <button
                                                    onClick={() => {
                                                        setChequeParaRechazo(ch);
                                                        setMotivoRechazo("");
                                                        setModalRechazoAbierto(true);
                                                    }}
                                                    className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                                                    title="Marcar como rechazado"
                                                >
                                                    Rechazo
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

            {/* MODAL CREAR CHEQUE MANUAL */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <h3 className="font-black text-base text-slate-900 dark:text-white">Ingreso de Cheque a Cartera</h3>
                            <button onClick={() => setModalCrearAbierto(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Banco Emisor *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Banco Santander"
                                    value={formBanco}
                                    onChange={(e) => setFormBanco(e.target.value)}
                                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Número de Cheque *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 00987654"
                                    value={formNumero}
                                    onChange={(e) => setFormNumero(e.target.value)}
                                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400">Monto ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formMonto}
                                        onChange={(e) => setFormMonto(e.target.value)}
                                        className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-black"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400">Fecha de Cobro *</label>
                                    <input
                                        type="date"
                                        value={formFechaCobro}
                                        onChange={(e) => setFormFechaCobro(e.target.value)}
                                        className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400">Librador / Titular</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del librador"
                                        value={formLibrador}
                                        onChange={(e) => setFormLibrador(e.target.value)}
                                        className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400">CUIT Librador</label>
                                    <input
                                        type="text"
                                        placeholder="30-12345678-9"
                                        value={formCuitLibrador}
                                        onChange={(e) => setFormCuitLibrador(e.target.value)}
                                        className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Tipo de Cheque</label>
                                <select
                                    value={formTipo}
                                    onChange={(e) => setFormTipo(e.target.value as any)}
                                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                >
                                    <option value="FISICO">Cheque Físico en Papel</option>
                                    <option value="ECHEQ">eCheq Electrónico</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                                onClick={() => setModalCrearAbierto(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardarNuevoCheque}
                                disabled={isPending || !formNumero || !formBanco || !formMonto}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                            >
                                {isPending ? "Guardando..." : "Guardar en Cartera"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ENDOSO A PROVEEDOR */}
            {modalEndosoAbierto && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <h3 className="font-black text-base text-slate-900 dark:text-white">Endosar Cheques a Proveedor</h3>
                            <button onClick={() => setModalEndosoAbierto(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
                                <span className="font-bold">Total a endosar: </span>
                                <span className="font-black text-sm">{formatCurrency(totalSeleccionadoMonto)}</span> ({seleccionados.length} cheques)
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Seleccione Proveedor Destinatario *</label>
                                <select
                                    value={proveedorEndosoId}
                                    onChange={(e) => setProveedorEndosoId(e.target.value)}
                                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium"
                                >
                                    <option value="">Seleccione Proveedor</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Notas / Recibo de Pago del Proveedor</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Pago factura compra #1234"
                                    value={notasEndoso}
                                    onChange={(e) => setNotasEndoso(e.target.value)}
                                    className="w-full mt-1 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                                onClick={() => setModalEndosoAbierto(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEndosarLote}
                                disabled={isPending || !proveedorEndosoId}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                            >
                                Confirmar Endoso
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MARCAR RECHAZO */}
            {modalRechazoAbierto && chequeParaRechazo && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
                        <div className="flex items-center gap-2 text-red-600 border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <ShieldAlert className="h-5 w-5" />
                            <h3 className="font-black text-base text-slate-900 dark:text-white">Registrar Rechazo de Cheque</h3>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 space-y-1">
                                <p className="font-bold">Cheque #{chequeParaRechazo.numero_cheque} — {chequeParaRechazo.banco}</p>
                                <p className="text-sm font-black">{formatCurrency(chequeParaRechazo.monto)}</p>
                                <p className="text-[11px] text-red-700 dark:text-red-400">
                                    ⚠️ Al marcarlo como rechazado, se generará automáticamente un CARGO en la Cuenta Corriente del cliente para reabrir la deuda.
                                </p>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Motivo del Rechazo Bancario *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Sin fondos / Firma no coincide / Orden de no pago"
                                    value={motivoRechazo}
                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                    className="w-full mt-1 p-2.5 border border-red-300 dark:border-red-800 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                                onClick={() => setModalRechazoAbierto(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarRechazo}
                                disabled={isPending || !motivoRechazo.trim()}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                            >
                                Confirmar Rechazo y Reabrir Deuda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
