"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { getDatosEmpresa } from "@/app/actions/configuracion-empresa";
import { getPedidoParaImprimir } from "@/app/actions/pedidos";
import { Store, Loader2, Printer, ArrowLeft, Scissors, FileText, LayoutTemplate, MessageSquare, Truck, Clock, CheckCircle2 } from "lucide-react";
import { generarLinkWhatsAppComprobante } from "@/lib/whatsapp";

type FormatoImpresion = "AUTO" | "DOBLE" | "A4";

export default function PedidoA4PrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const pedidoId = Number(id);
    const searchParams = useSearchParams();

    const [pedido, setPedido] = useState<any>(null);
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const formatoParam = searchParams.get("formato") as FormatoImpresion | null;
    const [formato, setFormato] = useState<FormatoImpresion>(formatoParam || "AUTO");

    useEffect(() => {
        const cargarDatos = async () => {
            const [pRes, emp] = await Promise.all([
                getPedidoParaImprimir(pedidoId),
                getDatosEmpresa()
            ]);
            if (pRes.success) {
                setPedido(pRes.data);
            }
            setEmpresa(emp);
            setLoading(false);

            if (pRes.success && pRes.data) {
                setTimeout(() => window.print(), 600);
            }
        };
        cargarDatos();
    }, [pedidoId]);

    if (loading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600">Preparando comprobante de pedido para impresión...</p>
            </div>
        );
    }

    if (!pedido) {
        return (
            <div className="p-10 font-bold text-center text-slate-800">
                <p className="text-lg">Pedido no encontrado.</p>
                <button
                    onClick={() => window.history.back()}
                    className="mt-4 bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl shadow"
                >
                    Volver
                </button>
            </div>
        );
    }

    const letraComprobante = "X";
    const fechaEmision = new Date(pedido.fecha).toLocaleDateString("es-AR");
    const fechaEntrega = pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleDateString("es-AR") : null;

    const renderComprobanteCuerpo = (copiaEtiqueta?: string | null, esCompacto: boolean = false) => {
        return (
            <div className={`bg-white text-black font-sans ${esCompacto ? 'text-[11px] p-4' : 'text-xs p-6'}`}>
                {/* ETIQUETA COPIA (Para formato doble) */}
                {copiaEtiqueta && (
                    <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2">
                        <span>{copiaEtiqueta}</span>
                        <span>{empresa?.nombre_fantasia || "NanoLabs OnlyERP"}</span>
                    </div>
                )}

                {/* CABECERA */}
                <div className={`relative border border-black p-3 mb-2 flex justify-between ${esCompacto ? 'h-[115px]' : 'h-[140px]'}`}>
                    {/* Cuadro Central Letra X */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-white px-3 border-x border-b border-black flex flex-col items-center">
                        <span className={`${esCompacto ? 'text-2xl' : 'text-3xl'} font-black leading-none`}>{letraComprobante}</span>
                        <span className="text-[7px] font-bold text-slate-600">COD. 000</span>
                        <span className="text-[7px] font-black uppercase text-indigo-700">REMITO</span>
                    </div>

                    {/* Izquierda: Empresa */}
                    <div className="w-[45%] flex flex-col justify-between overflow-hidden">
                        <div>
                            {empresa?.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={empresa.logo_url} alt="Logo" className={`${esCompacto ? 'max-h-7' : 'max-h-9'} mb-1 object-contain`} />
                            ) : (
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Store className="h-4 w-4 text-slate-800 shrink-0" />
                                    <h1 className={`${esCompacto ? 'text-xs' : 'text-sm'} font-black uppercase tracking-tight truncate`}>
                                        {empresa?.nombre_fantasia || "Distribuidora"}
                                    </h1>
                                </div>
                            )}
                            <p className="font-bold uppercase text-[10px] truncate">{empresa?.razon_social}</p>
                            <p className="truncate text-[10px] text-slate-600">{empresa?.direccion}</p>
                            <p className="text-[10px] text-slate-600">Tel: {empresa?.telefono || "S/D"}</p>
                        </div>
                        <div className="border-t border-slate-200 pt-0.5 text-[9px] text-slate-500">
                            <span>CUIT: {empresa?.cuit || "---"}</span> • <span>{empresa?.condicion_iva || "RESPONSABLE INSCRIPTO"}</span>
                        </div>
                    </div>

                    {/* Derecha: Datos del Pedido */}
                    <div className="w-[45%] text-right flex flex-col justify-between">
                        <div>
                            <div className="inline-block bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[10px] tracking-wide mb-1">
                                COMPROBANTE DE PEDIDO / REMITO
                            </div>
                            <h2 className={`${esCompacto ? 'text-sm' : 'text-base'} font-black text-slate-900 tracking-tight`}>
                                Nº 0001-{String(pedido.numero).padStart(8, "0")}
                            </h2>
                            <p className="text-[10px] text-slate-700">
                                <strong>Emisión:</strong> {fechaEmision}
                            </p>
                            {fechaEntrega && (
                                <p className="text-[10px] text-indigo-700 font-bold">
                                    <strong>Fecha Entrega:</strong> {fechaEntrega}
                                </p>
                            )}
                            {pedido.venta && (
                                <p className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded mt-0.5 inline-block">
                                    🧾 Facturado: {pedido.venta.tipo_comprobante?.replace('_', ' ')} 000{pedido.venta.punto_venta}-{pedido.venta.numero_comprobante}
                                </p>
                            )}
                        </div>
                        <div className="border-t border-slate-200 pt-0.5 text-[8px] text-slate-500 uppercase font-bold">
                            DOCUMENTO NO VÁLIDO COMO FACTURA
                        </div>
                    </div>
                </div>

                {/* DATOS DEL CLIENTE Y DESPACHO */}
                <div className="border border-black p-2 mb-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                        <p><strong>Cliente:</strong> <span className="font-bold uppercase text-[11px]">{pedido.cliente?.nombre_razon_social}</span></p>
                        <p><strong>CUIT / DNI:</strong> {pedido.cliente?.dni_cuit || "Consumidor Final"}</p>
                        <p><strong>Condición IVA:</strong> {pedido.cliente?.condicion_iva?.replace('_', ' ') || "CONSUMIDOR FINAL"}</p>
                        <p><strong>Dirección:</strong> {pedido.cliente?.direccion || "Retira en Local"}</p>
                        <p><strong>Teléfono:</strong> {pedido.cliente?.telefono || "---"}</p>
                    </div>
                    <div className="border-l border-slate-200 pl-2">
                        <p><strong>Estado Pedido:</strong> <span className="font-black uppercase text-indigo-700">{pedido.estado}</span></p>
                        <p><strong>Condición de Pago:</strong> <span className="font-bold">{pedido.metodo_pago?.replace('_', ' ') || "CONTADO"}</span></p>
                        <p><strong>Preventista:</strong> {pedido.usuario?.nombre || "Oficina Central"}</p>
                        {pedido.repartidor && (
                            <p><strong>Repartidor Asignado:</strong> <span className="font-bold text-emerald-800">{pedido.repartidor.nombre}</span></p>
                        )}
                        <p><strong>Lista de Precios:</strong> {pedido.listaPrecio?.nombre || "Estándar"}</p>
                    </div>
                </div>

                {/* TABLA DE PRODUCTOS */}
                <div className="border border-black mb-2 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-b border-black text-[9px] font-black uppercase text-slate-800">
                                <th className="p-1 w-[12%] text-center">Cód.</th>
                                <th className="p-1 w-[10%] text-center">Cant</th>
                                <th className="p-1">Descripción / Artículo</th>
                                <th className="p-1 text-right w-[14%]">P. Unit</th>
                                <th className="p-1 text-right w-[10%]">Dto</th>
                                <th className="p-1 text-right w-[16%]">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[10px]">
                            {pedido.detalles?.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-1 text-center font-mono text-[9px] text-slate-500">
                                        {item.producto?.codigo_articulo || String(item.productoId).padStart(4, "0")}
                                    </td>
                                    <td className="p-1 text-center font-black">
                                        {item.cantidad}
                                    </td>
                                    <td className="p-1">
                                        <span className="font-bold">{item.producto?.nombre_producto || "Artículo"}</span>
                                        {item.combo_nombre && (
                                            <span className="block text-[8px] font-bold text-indigo-600">
                                                (Combo: {item.combo_nombre})
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-1 text-right font-mono">
                                        ${item.precio_unitario?.toFixed(2)}
                                    </td>
                                    <td className="p-1 text-right font-mono text-emerald-700">
                                        {item.descuento_individual > 0 ? `${item.descuento_individual}%` : "-"}
                                    </td>
                                    <td className="p-1 text-right font-black font-mono">
                                        ${item.subtotal?.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* OBSERVACIONES Y TOTALES */}
                <div className="flex gap-2 mb-2 items-stretch">
                    {/* Observaciones */}
                    <div className="w-[60%] border border-black p-2 flex flex-col justify-between text-[9px]">
                        <div>
                            <span className="font-bold text-slate-700 uppercase block mb-0.5">Observaciones / Indicaciones:</span>
                            <p className="text-slate-600 whitespace-pre-wrap">{pedido.notas || "Sin observaciones registradas."}</p>
                            {pedido.motivo_no_entrega && (
                                <p className="mt-1 text-rose-700 font-bold">Obs. Entrega: {pedido.motivo_no_entrega}</p>
                            )}
                        </div>
                        <div className="border-t border-slate-200 pt-1 mt-1 text-[8px] text-slate-400">
                            Comprobante interno para logística, preparación y control de despacho.
                        </div>
                    </div>

                    {/* Resumen Totales */}
                    <div className="w-[40%] border border-black p-2 text-[10px] space-y-1">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Subtotal:</span>
                            <span className="font-mono font-bold">${pedido.subtotal?.toFixed(2)}</span>
                        </div>
                        {pedido.descuento_global > 0 && (
                            <div className="flex justify-between text-emerald-700">
                                <span>Descuento ({pedido.descuento_global}%):</span>
                                <span className="font-mono font-bold">-${((pedido.subtotal * pedido.descuento_global) / 100).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-black border-t-2 border-black pt-1">
                            <span>TOTAL:</span>
                            <span className="font-mono text-sm text-slate-900">${pedido.total?.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* TALÓN DE CONFORMIDAD Y RECEPCIÓN */}
                <div className="border border-dashed border-black p-2 rounded text-[9px]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold uppercase tracking-wider text-[8px] text-slate-500">CONSTANCIA DE RECEPCIÓN Y CONFORMIDAD DE MERCADERÍA</span>
                        <span className="text-[8px] text-slate-400">Pedido #{pedido.numero}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 pt-2 text-center text-[8px] text-slate-600">
                        <div className="border-t border-slate-400 pt-1">Firma Receptor</div>
                        <div className="border-t border-slate-400 pt-1">Aclaración</div>
                        <div className="border-t border-slate-400 pt-1">DNI</div>
                        <div className="border-t border-slate-400 pt-1">Fecha y Hora Entrega</div>
                    </div>
                </div>
            </div>
        );
    };

    const linkWpp = pedido.cliente?.telefono
        ? generarLinkWhatsAppComprobante({
            telefono: pedido.cliente.telefono,
            clienteNombre: pedido.cliente.nombre_razon_social,
            tipoComprobante: "Comprobante de Pedido",
            numeroComprobante: String(pedido.numero),
            total: pedido.total,
            urlComprobante: typeof window !== "undefined" ? `${window.location.origin}/imprimir/pedido/${pedido.id}` : undefined,
        })
        : null;

    return (
        <div className="bg-slate-200 py-4 print:bg-white print:py-0 min-h-screen">
            {/* BARRA DE ACCIONES (Oculta al imprimir) */}
            <div className="print:hidden max-w-[210mm] mx-auto mb-3 flex flex-wrap gap-2 justify-between items-center bg-slate-900 text-white p-3 rounded-2xl shadow-lg">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.history.back()}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Volver
                    </button>
                    <span className="text-xs font-black text-slate-300">
                        Pedido #{pedido.numero} • {pedido.cliente?.nombre_razon_social}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Switcher Formatos */}
                    <button
                        onClick={() => setFormato("AUTO")}
                        className={`text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-all ${
                            formato === "AUTO" ? "bg-indigo-600 text-white shadow" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                        title="1 Comprobante adaptable a media hoja"
                    >
                        <FileText className="w-3 h-3" /> Simple
                    </button>
                    <button
                        onClick={() => setFormato("DOBLE")}
                        className={`text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-all ${
                            formato === "DOBLE" ? "bg-indigo-600 text-white shadow" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                        title="Original y Duplicado en una sola hoja A4 con línea de corte"
                    >
                        <Scissors className="w-3 h-3" /> Original + Duplicado
                    </button>
                    <button
                        onClick={() => setFormato("A4")}
                        className={`text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-all ${
                            formato === "A4" ? "bg-indigo-600 text-white shadow" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                        title="1 Comprobante ocupando toda la hoja A4"
                    >
                        <LayoutTemplate className="w-3 h-3" /> Hoja Completa
                    </button>

                    {linkWpp && (
                        <a
                            href={linkWpp}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 shadow"
                        >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white font-black py-1.5 px-4 rounded-xl text-xs shadow flex items-center gap-1.5 ml-1"
                    >
                        <Printer className="w-3.5 h-3.5" /> IMPRIMIR
                    </button>
                </div>
            </div>

            {/* HOJA DE IMPRESIÓN */}
            <div className="w-[210mm] max-w-full bg-white text-black mx-auto shadow-2xl print:shadow-none print:m-0 border border-slate-300 print:border-none">
                {formato === "DOBLE" ? (
                    <div>
                        {/* Original */}
                        {renderComprobanteCuerpo("ORIGINAL - CLIENTE", true)}

                        {/* Línea de corte punteada */}
                        <div className="relative py-1 border-t-2 border-dashed border-slate-400 flex items-center justify-center my-0">
                            <span className="bg-white px-3 text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                                <Scissors className="w-3 h-3 text-slate-600" /> Cortar por aquí (Original arriba / Duplicado abajo)
                            </span>
                        </div>

                        {/* Duplicado */}
                        {renderComprobanteCuerpo("DUPLICADO - CONTROL LOGÍSTICA / ARCHIVO", true)}
                    </div>
                ) : (
                    <div>
                        {renderComprobanteCuerpo(null, formato === "AUTO")}
                    </div>
                )}
            </div>
        </div>
    );
}
