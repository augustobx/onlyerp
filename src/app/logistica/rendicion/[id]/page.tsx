"use client";

import { useEffect, useState, useTransition, use } from "react";
import { obtenerHojaDeRutaDetalle, procesarRendicionChofer, RendicionItemPayload } from "@/app/actions/logistica";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import {
    DollarSign,
    CheckCircle2,
    XCircle,
    Truck,
    ArrowLeft,
    RefreshCw,
    Plus,
    Trash2,
    AlertTriangle,
    Save,
    Landmark
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RendicionChoferPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [ruta, setRuta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [kmFinal, setKmFinal] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [cobros, setCobros] = useState<RendicionItemPayload[]>([]);

    // Modal Cheque
    const [modalChequeAbierto, setModalChequeAbierto] = useState(false);
    const [chequePedidoId, setChequePedidoId] = useState<number | null>(null);
    const [chequeBanco, setChequeBanco] = useState("");
    const [chequeNumero, setChequeNumero] = useState("");
    const [chequeMonto, setChequeMonto] = useState("");
    const [chequeFechaCobro, setChequeFechaCobro] = useState(new Date().toISOString().split('T')[0]);
    const [chequeTipo, setChequeTipo] = useState<'FISICO' | 'ECHEQ'>('FISICO');

    const cargarRuta = async () => {
        setLoading(true);
        try {
            const res = await obtenerHojaDeRutaDetalle(Number(id));
            if (res.success && res.data) {
                setRuta(res.data);
                setKmFinal(res.data.km_final ? String(res.data.km_final) : "");

                // Inicializar cobros a partir de los pedidos de la hoja de ruta
                const cobrosInit: RendicionItemPayload[] = ((res.data as any).detalles || []).map((d: any) => {
                    const p = d.pedido;
                    const esCC = p.metodo_pago === 'CUENTA_CORRIENTE';
                    const esTransf = p.metodo_pago === 'TRANSFERENCIA';

                    return {
                        pedidoId: p.id,
                        estado_entrega: d.estado_entrega === 'RECHAZADO_TOTAL' ? 'RECHAZADO_TOTAL' : 'ENTREGADO',
                        motivo_rechazo: d.motivo_rechazo || "",
                        monto_cobrado_efectivo: (!esCC && !esTransf) ? p.total : 0,
                        monto_cobrado_transferencia: esTransf ? p.total : 0,
                        comprobante_transferencia: "",
                        monto_cuenta_corriente: esCC ? p.total : 0,
                        cheques: []
                    };
                });
                setCobros(cobrosInit);
            } else {
                toast.error(res.error || "Error al cargar hoja de ruta");
            }
        } catch (e) {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarRuta();
    }, [id]);

    const updateCobro = (pedidoId: number, field: keyof RendicionItemPayload, value: any) => {
        setCobros(prev => prev.map(c => c.pedidoId === pedidoId ? { ...c, [field]: value } : c));
    };

    const abrirModalCheque = (pedidoId: number) => {
        setChequePedidoId(pedidoId);
        setChequeBanco("");
        setChequeNumero("");
        setChequeMonto("");
        setChequeFechaCobro(new Date().toISOString().split('T')[0]);
        setChequeTipo('FISICO');
        setModalChequeAbierto(true);
    };

    const agregarCheque = () => {
        if (!chequePedidoId || !chequeBanco || !chequeNumero || !chequeMonto || Number(chequeMonto) <= 0) {
            toast.error("Complete los datos del cheque.");
            return;
        }

        setCobros(prev => prev.map(c => {
            if (c.pedidoId === chequePedidoId) {
                const nuevoCheque = {
                    numero_cheque: chequeNumero.trim(),
                    banco: chequeBanco.trim(),
                    monto: Number(chequeMonto),
                    fecha_cobro: chequeFechaCobro,
                    tipo: chequeTipo
                };
                return {
                    ...c,
                    cheques: [...(c.cheques || []), nuevoCheque]
                };
            }
            return c;
        }));

        setModalChequeAbierto(false);
        toast.success("Cheque agregado al cobro.");
    };

    const eliminarCheque = (pedidoId: number, index: number) => {
        setCobros(prev => prev.map(c => {
            if (c.pedidoId === pedidoId) {
                const nuevos = [...(c.cheques || [])];
                nuevos.splice(index, 1);
                return { ...c, cheques: nuevos };
            }
            return c;
        }));
    };

    // Cálculos en tiempo real
    const totalEsperado = ruta?.detalles?.reduce((acc: number, d: any) => acc + (d.pedido?.total || 0), 0) || 0;

    let totalEfectivo = 0;
    let totalCheques = 0;
    let totalTransferencias = 0;
    let totalCredito = 0;
    let totalRechazado = 0;

    cobros.forEach(c => {
        if (c.estado_entrega === 'RECHAZADO_TOTAL') {
            const p = ruta?.detalles?.find((d: any) => d.pedidoId === c.pedidoId)?.pedido;
            totalRechazado += (p?.total || 0);
        } else {
            totalEfectivo += Number(c.monto_cobrado_efectivo || 0);
            totalTransferencias += Number(c.monto_cobrado_transferencia || 0);
            totalCredito += Number(c.monto_cuenta_corriente || 0);
            totalCheques += (c.cheques?.reduce((acc, ch) => acc + ch.monto, 0) || 0);
        }
    });

    const totalRendido = totalEfectivo + totalCheques + totalTransferencias + totalCredito;
    const diferencia = totalRendido - (totalEsperado - totalRechazado);

    const handleProcesarRendicion = () => {
        startTransition(async () => {
            const res = await procesarRendicionChofer({
                hojaDeRutaId: Number(id),
                km_final: kmFinal ? Number(kmFinal) : undefined,
                observaciones,
                cobros
            });

            if (res.success) {
                toast.success("Rendición procesada exitosamente. Se impactó en Caja Diaria.");
                router.push("/logistica/hojas-de-ruta");
            } else {
                toast.error(res.error || "Error al procesar rendición");
            }
        });
    };

    if (loading) {
        return (
            <div className="p-16 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-3" />
                <p className="text-sm font-semibold text-slate-500">Cargando datos de rendición...</p>
            </div>
        );
    }

    const yaRendida = ruta?.estado === 'RENDIDA';

    return (
        <div className="p-6 max-w-[1500px] mx-auto space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href="/logistica/hojas-de-ruta"
                        className="p-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                                Ruta #{ruta?.numero}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                yaRendida ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {yaRendida ? 'Rendida' : 'En Reparto / Pendiente Rendición'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                            Rendición de Reparto — {ruta?.repartidor?.nombre}
                        </h1>
                    </div>
                </div>

                {!yaRendida && (
                    <button
                        onClick={handleProcesarRendicion}
                        disabled={isPending}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg transition"
                    >
                        <Save className="h-4 w-4" /> {isPending ? "Procesando..." : "Confirmar y Conciliar Rendición"}
                    </button>
                )}
            </div>

            {/* KPIs de Rendición en Tiempo Real */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Total Esperado</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(totalEsperado)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/50 bg-emerald-50/30 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-emerald-600">Efectivo en Mano</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalEfectivo)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-950/50 bg-indigo-50/30 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-indigo-600">Cheques Recibidos</p>
                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(totalCheques)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-950/50 bg-blue-50/30 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-blue-600">Transferencias</p>
                    <p className="text-lg font-black text-blue-700 dark:text-blue-400">{formatCurrency(totalTransferencias)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-950/50 bg-amber-50/30 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-amber-600">Queda en Cta. Cte.</p>
                    <p className="text-lg font-black text-amber-700 dark:text-amber-400">{formatCurrency(totalCredito)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-red-200 dark:border-red-950/50 bg-red-50/30 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-red-600">Mercadería Rechazada</p>
                    <p className="text-lg font-black text-red-700 dark:text-red-400">{formatCurrency(totalRechazado)}</p>
                </div>
            </div>

            {/* Alerta de Diferencia si la hay */}
            {Math.abs(diferencia) > 0.01 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300 text-sm font-bold">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span>Existe una diferencia entre lo rendido y lo esperado:</span>
                    </div>
                    <span className={`text-base font-black ${diferencia < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {diferencia < 0 ? `Faltante: -${formatCurrency(Math.abs(diferencia))}` : `Sobrante: +${formatCurrency(diferencia)}`}
                    </span>
                </div>
            )}

            {/* Tabla de Rendición por Parada */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">Detalle de Cobranzas y Entregas por Cliente</h2>
                    <span className="text-xs text-slate-400 font-bold">{ruta?.detalles?.length || 0} paradas</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {ruta?.detalles?.map((d: any) => {
                        const p = d.pedido;
                        const cobro = cobros.find(c => c.pedidoId === p.id);
                        if (!cobro) return null;

                        const esRechazado = cobro.estado_entrega === 'RECHAZADO_TOTAL';

                        return (
                            <div key={d.id} className={`p-5 space-y-4 transition ${esRechazado ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center">
                                            {d.orden_parada}
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {p.cliente?.nombre_razon_social}
                                                </h3>
                                                <span className="text-xs font-mono text-slate-400">Pedido #{p.numero}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{p.cliente?.direccion || "Sin dirección"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Importe Pedido</p>
                                            <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(p.total)}</p>
                                        </div>

                                        {!yaRendida && (
                                            <select
                                                value={cobro.estado_entrega}
                                                onChange={(e) => updateCobro(p.id, 'estado_entrega', e.target.value as any)}
                                                className={`text-xs font-bold px-3 py-2 rounded-xl border ${
                                                    esRechazado ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                }`}
                                            >
                                                <option value="ENTREGADO">✅ Entregado Conforme</option>
                                                <option value="RECHAZADO_TOTAL">❌ Rechazado / No Entregado</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Desglose de Pago si fue Entregado */}
                                {!esRechazado && !yaRendida && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500">💵 Efectivo ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={cobro.monto_cobrado_efectivo}
                                                onChange={(e) => updateCobro(p.id, 'monto_cobrado_efectivo', Number(e.target.value))}
                                                className="w-full mt-1 p-2 text-xs font-bold border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500">🏦 Transferencia ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={cobro.monto_cobrado_transferencia}
                                                onChange={(e) => updateCobro(p.id, 'monto_cobrado_transferencia', Number(e.target.value))}
                                                className="w-full mt-1 p-2 text-xs font-bold border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500">📑 Queda en Cta. Cte. ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={cobro.monto_cuenta_corriente}
                                                onChange={(e) => updateCobro(p.id, 'monto_cuenta_corriente', Number(e.target.value))}
                                                className="w-full mt-1 p-2 text-xs font-bold border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                                            />
                                        </div>

                                        <div className="flex flex-col justify-end">
                                            <button
                                                type="button"
                                                onClick={() => abrirModalCheque(p.id)}
                                                className="w-full p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition"
                                            >
                                                <Landmark className="h-3.5 w-3.5" /> + Cobrar con Cheque
                                            </button>
                                        </div>

                                        {/* Lista de Cheques Cargados a este Pedido */}
                                        {cobro.cheques && cobro.cheques.length > 0 && (
                                            <div className="col-span-full space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-700">
                                                <p className="text-[10px] font-bold uppercase text-indigo-600">Cheques asociados a este cobro:</p>
                                                {cobro.cheques.map((ch, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-zinc-900 p-2 rounded-lg text-xs border border-indigo-100 dark:border-zinc-800">
                                                        <span>{ch.banco} - N° {ch.numero_cheque} (Vence: {ch.fecha_cobro})</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-indigo-600">{formatCurrency(ch.monto)}</span>
                                                            <button
                                                                onClick={() => eliminarCheque(p.id, idx)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Motivo si fue Rechazado */}
                                {esRechazado && !yaRendida && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900 space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-red-700 dark:text-red-400">
                                            Motivo de Rechazo (La mercadería reingresará automáticamente al stock):
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Local cerrado / Cliente no tenía el dinero / Mercadería no solicitada"
                                            value={cobro.motivo_rechazo}
                                            onChange={(e) => updateCobro(p.id, 'motivo_rechazo', e.target.value)}
                                            className="w-full p-2 text-xs border border-red-300 dark:border-red-800 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal para Cargar Cheque */}
            {modalChequeAbierto && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <h3 className="font-black text-base text-slate-900 dark:text-white">Ingresar Cheque / eCheq</h3>
                            <button onClick={() => setModalChequeAbierto(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Banco Emisor *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Banco Galicia / Banco Nación"
                                    value={chequeBanco}
                                    onChange={(e) => setChequeBanco(e.target.value)}
                                    className="w-full mt-1 p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Número de Cheque *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 00123456"
                                    value={chequeNumero}
                                    onChange={(e) => setChequeNumero(e.target.value)}
                                    className="w-full mt-1 p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400">Monto ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={chequeMonto}
                                        onChange={(e) => setChequeMonto(e.target.value)}
                                        className="w-full mt-1 p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-black"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400">Fecha de Cobro *</label>
                                    <input
                                        type="date"
                                        value={chequeFechaCobro}
                                        onChange={(e) => setChequeFechaCobro(e.target.value)}
                                        className="w-full mt-1 p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400">Tipo de Cheque</label>
                                <select
                                    value={chequeTipo}
                                    onChange={(e) => setChequeTipo(e.target.value as any)}
                                    className="w-full mt-1 p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                                >
                                    <option value="FISICO">Cheque Físico en Papel</option>
                                    <option value="ECHEQ">eCheq Electrónico</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                                onClick={() => setModalChequeAbierto(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={agregarCheque}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                            >
                                Agregar Cheque
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
