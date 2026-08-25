"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { getDatosEmpresa, getVentaParaTicket } from "@/app/actions/configuracion-empresa";
import { Store, Loader2, Printer, ArrowLeft, Scissors, FileText, LayoutTemplate, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { generarQRBase64 } from "@/lib/afipQrAlgorithm";

type FormatoImpresion = "AUTO" | "DOBLE" | "A4";

export default function FacturaA4PrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const ventaId = Number(id);
    const searchParams = useSearchParams();

    const [venta, setVenta] = useState<any>(null);
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Formato seleccionado: "AUTO" (Media Hoja / Adaptable), "DOBLE" (Original + Duplicado), "A4" (Hoja Completa)
    const formatoParam = searchParams.get("formato") as FormatoImpresion | null;
    const [formato, setFormato] = useState<FormatoImpresion>(formatoParam || "AUTO");

    useEffect(() => {
        const cargarDatos = async () => {
            const [v, emp] = await Promise.all([
                getVentaParaTicket(ventaId),
                getDatosEmpresa()
            ]);
            setVenta(v);
            setEmpresa(emp);
            setLoading(false);

            if (v) {
                // Auto-disparo de impresión suave tras cargar
                setTimeout(() => window.print(), 600);
            }
        };
        cargarDatos();
    }, [ventaId]);

    if (loading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600">Preparando comprobante para impresión...</p>
            </div>
        );
    }

    if (!venta) {
        return (
            <div className="p-10 font-bold text-center text-slate-800">
                <p className="text-lg">Comprobante no encontrado.</p>
                <button
                    onClick={() => window.history.back()}
                    className="mt-4 bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl shadow"
                >
                    Volver
                </button>
            </div>
        );
    }

    let letraComprobante = "X";
    let codComprobante = "000";
    let tipoTexto = "COMPROBANTE NO FISCAL";

    if (venta.tipo_comprobante === "FACTURA_A") { letraComprobante = "A"; codComprobante = "001"; tipoTexto = "FACTURA"; }
    else if (venta.tipo_comprobante === "FACTURA_B") { letraComprobante = "B"; codComprobante = "006"; tipoTexto = "FACTURA"; }
    else if (venta.tipo_comprobante === "FACTURA_C") { letraComprobante = "C"; codComprobante = "011"; tipoTexto = "FACTURA"; }

    const qrBase64 = generarQRBase64(venta, empresa);

    // Totales IVA si es Factura A
    let subNeto = venta.subtotal;
    let impIva = 0;
    if (venta.tipo_comprobante === "FACTURA_A") {
        subNeto = venta.subtotal / 1.21;
        impIva = venta.subtotal - subNeto;
    }

    // Componente interno que renderiza el cuerpo del comprobante
    const renderComprobanteCuerpo = (copiaEtiqueta?: string | null, esCompacto: boolean = false) => {
        return (
            <div className={`bg-white text-black font-sans ${esCompacto ? 'text-[11px] p-4' : 'text-xs p-6'}`}>
                {/* ETIQUETA COPIA (Si aplica para Doble comprobante) */}
                {copiaEtiqueta && (
                    <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2">
                        <span>{copiaEtiqueta}</span>
                        <span>{empresa?.nombre_fantasia || "Sanu Distribuidora"}</span>
                    </div>
                )}

                {/* CABECERA TRIPARTITA */}
                <div className={`relative border border-black p-3 mb-2 flex justify-between ${esCompacto ? 'h-[110px]' : 'h-[135px]'}`}>
                    {/* Cuadro Central Letra */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-[1px] bg-white border border-black w-[44px] h-[44px] flex flex-col items-center justify-center z-10">
                        <span className="text-2xl font-black leading-none">{letraComprobante}</span>
                        <span className="text-[8px] font-bold mt-0.5 leading-none border-t border-black w-full text-center pt-0.5">COD {codComprobante}</span>
                    </div>
                    {/* Linea divisoria central */}
                    <div className="absolute left-1/2 top-[44px] bottom-0 w-[1px] bg-black"></div>

                    {/* Izquierda: Empresa */}
                    <div className="w-[47%] pr-2">
                        {empresa?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={empresa.logo_url} alt="Logo" className="max-h-8 mb-1 object-contain" />
                        ) : (
                            <div className="flex items-center gap-1.5 mb-1">
                                <Store className="h-4 w-4 text-black shrink-0" />
                                <h1 className="text-sm font-black uppercase tracking-tight truncate">{empresa?.nombre_fantasia || "Mi Empresa"}</h1>
                            </div>
                        )}
                        <p className="font-bold text-[10px] uppercase truncate">{empresa?.razon_social}</p>
                        <p className="text-[10px] leading-tight truncate">{empresa?.direccion}</p>
                        <p className="text-[10px] leading-tight">Tel: {empresa?.telefono}</p>
                        <p className="text-[10px] font-bold uppercase mt-0.5">IVA {empresa?.condicion_iva}</p>
                    </div>

                    {/* Derecha: Comprobante */}
                    <div className="w-[47%] pl-2 text-left">
                        <h2 className="text-base font-black uppercase leading-tight">{tipoTexto}</h2>
                        <div className="flex gap-2 items-center my-0.5">
                            <p className="font-black text-xs">Nº {String(venta.punto_venta).padStart(4, '0')}-{String(venta.numero_comprobante).padStart(8, '0')}</p>
                        </div>
                        <p className="text-[10px]"><strong>Fecha:</strong> {new Date(venta.fecha_emision).toLocaleDateString('es-AR')}</p>
                        <p className="text-[10px]"><strong>CUIT:</strong> {empresa?.cuit}</p>
                        <p className="text-[10px]"><strong>IIBB:</strong> {empresa?.cuit}</p>
                    </div>
                </div>

                {/* DATOS DEL CLIENTE */}
                <div className="border border-black p-2.5 mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] bg-slate-50/50">
                    <div><span className="font-bold">Cliente:</span> {venta.cliente?.nombre_razon_social || "Consumidor Final"}</div>
                    <div><span className="font-bold">CUIT/DNI:</span> {venta.cliente?.dni_cuit || "---"}</div>
                    <div><span className="font-bold">Condición de IVA:</span> {venta.cliente?.condicion_iva || "Consumidor Final"}</div>
                    <div className="flex items-center">
                        <span className="font-bold whitespace-nowrap mr-1">Pago:</span>
                        <span className="truncate">
                            {venta.pagos && venta.pagos.length > 0 ? (
                                venta.pagos.map((p: any) => `${p.metodo_pago.replace('_', ' ')} ($${p.monto})`).join(", ")
                            ) : (
                                venta.metodo_pago.replace('_', ' ')
                            )}
                        </span>
                    </div>
                    {venta.direccion_envio && (
                        <div className="col-span-2 text-[10px] text-slate-700">
                            <span className="font-bold">Entrega en:</span> {venta.direccion_envio}
                        </div>
                    )}
                </div>

                {/* TABLA DE ÍTEMS */}
                <div className={`border border-black flex flex-col relative ${formato === 'A4' ? 'min-h-[140mm]' : 'min-h-0'}`}>
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b border-black bg-slate-100 font-bold">
                                <th className="py-1 px-2 border-r border-black w-10 text-center">Cant</th>
                                <th className="py-1 px-2 border-r border-black">Descripción del Artículo</th>
                                <th className="py-1 px-2 border-r border-black w-20 text-right">P. Unit</th>
                                {venta.tipo_comprobante === "FACTURA_A" && <th className="py-1 px-2 border-r border-black w-14 text-right">% IVA</th>}
                                <th className="py-1 px-2 w-24 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {venta.detalles?.map((det: any) => {
                                let itemUnitario = det.precio_unitario;
                                let itemSubtotal = det.subtotal;
                                if (venta.tipo_comprobante === "FACTURA_A") {
                                    itemUnitario = det.precio_unitario / 1.21;
                                    itemSubtotal = det.subtotal / 1.21;
                                }
                                return (
                                    <tr key={det.id} className="align-top border-b border-slate-200 last:border-b-0">
                                        <td className="py-1 px-2 border-r border-black text-center font-bold">{det.cantidad}</td>
                                        <td className="py-1 px-2 border-r border-black">
                                            <span>{det.producto?.nombre_producto || 'Producto genérico'}</span>
                                            {det.descuento_individual > 0 && (
                                                <span className="text-[9px] text-slate-500 font-semibold ml-1">(-{det.descuento_individual}%)</span>
                                            )}
                                        </td>
                                        <td className="py-1 px-2 border-r border-black text-right">${itemUnitario.toFixed(2)}</td>
                                        {venta.tipo_comprobante === "FACTURA_A" && <td className="py-1 px-2 border-r border-black text-right">21%</td>}
                                        <td className="py-1 px-2 text-right font-bold">${itemSubtotal.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* TOTALES */}
                <div className="border border-t-0 border-black mb-2 flex">
                    <div className="w-[55%] border-r border-black p-2 flex flex-col text-[10px] text-slate-600 justify-center">
                        {venta.tipo_comprobante === "FACTURA_A" ? (
                            <p>Los importes expresados son netos sujetos a la aplicación del IVA.</p>
                        ) : (
                            <p>Documento no válido como factura fiscal en compras a cuenta.</p>
                        )}
                        {venta.notas_venta && (
                            <p className="mt-0.5 font-bold text-slate-800">Nota: {venta.notas_venta}</p>
                        )}
                    </div>
                    <div className="w-[45%] p-2 space-y-1 text-xs">
                        {venta.tipo_comprobante === "FACTURA_A" && (
                            <>
                                <div className="flex justify-between text-[11px]">
                                    <span>Subtotal Neto:</span>
                                    <span>${subNeto.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span>IVA 21%:</span>
                                    <span>${impIva.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        {venta.tipo_comprobante !== "FACTURA_A" && (
                            <div className="flex justify-between text-[11px]">
                                <span>Subtotal:</span>
                                <span>${venta.subtotal.toFixed(2)}</span>
                            </div>
                        )}
                        {venta.descuento_global > 0 && (
                            <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                                <span>Descuento Global:</span>
                                <span>-${venta.descuento_global.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-sm border-t border-black pt-1">
                            <span>TOTAL:</span>
                            <span>${venta.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* FOOTER QR CAE / FIRMA */}
                <div className="flex justify-between items-end pt-1">
                    <div className="flex items-center gap-3">
                        {letraComprobante !== "X" && qrBase64 && (
                            <QRCodeSVG value={`https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`} size={esCompacto ? 60 : 75} className="border border-black p-0.5" />
                        )}
                        {letraComprobante !== "X" && venta.cae && (
                            <div className="text-[10px]">
                                <p className="font-bold">CAE N°: <span className="font-normal">{venta.cae}</span></p>
                                <p className="font-bold">Vto CAE: <span className="font-normal">{new Date(venta.cae_vto).toLocaleDateString('es-AR')}</span></p>
                            </div>
                        )}
                        {copiaEtiqueta?.includes("DUPLICADO") && (
                            <div className="border border-dashed border-slate-400 p-2 rounded text-[10px] w-56 text-center">
                                <div className="h-6"></div>
                                <div className="border-t border-black pt-0.5 font-bold">Firma y Aclaración de Recepción</div>
                            </div>
                        )}
                    </div>
                    <div className="text-right text-[9px] text-slate-500">
                        <span className="font-bold block">Emisor: {venta.usuario ? (venta.usuario.nombre || venta.usuario.nombre_completo) : "Sistema"}</span>
                        <span>{empresa?.nombre_fantasia || "Sanu Distribuidora"}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0mm;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff;
                    }
                }
            `}} />

            {/* BARRA DE CONTROL DE FORMATO Y BOTONERA (Oculta al imprimir) */}
            <div className="print:hidden sticky top-0 z-50 bg-slate-900 text-white p-4 shadow-xl border-b border-slate-800">
                <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    
                    {/* VOLVER */}
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al POS
                    </button>

                    {/* SELECTOR DE FORMATO */}
                    <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
                        <button
                            onClick={() => setFormato("AUTO")}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                                formato === "AUTO"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5" /> Media Hoja (Adaptable)
                        </button>

                        <button
                            onClick={() => setFormato("DOBLE")}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                                formato === "DOBLE"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            }`}
                        >
                            <Scissors className="h-3.5 w-3.5" /> 2 en 1 (Original + Duplicado)
                        </button>

                        <button
                            onClick={() => setFormato("A4")}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                                formato === "A4"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            }`}
                        >
                            <LayoutTemplate className="h-3.5 w-3.5" /> A4 Completa
                        </button>
                    </div>

                    {/* BOTÓN IMPRIMIR */}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 text-xs transition-all"
                    >
                        <Printer className="h-4 w-4" /> IMPRIMIR AHORA
                    </button>
                </div>
            </div>

            {/* CONTENEDOR DE IMPRESIÓN SEGÚN FORMATO SELECCIONADO */}
            <div className="bg-slate-100 py-6 print:bg-white print:py-0 min-h-screen">
                
                {/* 1. MODO MEDIA HOJA / AUTO-ADAPTABLE */}
                {formato === "AUTO" && (
                    <div className="w-[210mm] max-w-full bg-white shadow-xl print:shadow-none mx-auto border print:border-none border-slate-200">
                        {renderComprobanteCuerpo(null, false)}
                    </div>
                )}

                {/* 2. MODO 2 EN 1: ORIGINAL + DUPLICADO EN HOJA A4 */}
                {formato === "DOBLE" && (
                    <div className="w-[210mm] max-w-full min-h-[297mm] bg-white shadow-xl print:shadow-none mx-auto border print:border-none border-slate-200 flex flex-col justify-between p-4 print:p-2">
                        {/* COPIA 1: ORIGINAL */}
                        <div className="flex-1">
                            {renderComprobanteCuerpo("ORIGINAL - COMPROBANTE PARA EL CLIENTE", true)}
                        </div>

                        {/* LÍNEA DE CORTE */}
                        <div className="my-2 border-b-2 border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase tracking-widest relative">
                            <span className="bg-white px-3 flex items-center gap-1 -mb-[9px]">
                                <Scissors className="h-3.5 w-3.5 text-slate-600" /> Cortar por aquí (Original arriba / Duplicado abajo)
                            </span>
                        </div>

                        {/* COPIA 2: DUPLICADO */}
                        <div className="flex-1">
                            {renderComprobanteCuerpo("DUPLICADO - CONSTANCIA DE ENTREGA / FIRMA", true)}
                        </div>
                    </div>
                )}

                {/* 3. MODO A4 COMPLETA */}
                {formato === "A4" && (
                    <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl print:shadow-none mx-auto border print:border-none border-slate-200">
                        {renderComprobanteCuerpo(null, false)}
                    </div>
                )}
            </div>
        </>
    );
}