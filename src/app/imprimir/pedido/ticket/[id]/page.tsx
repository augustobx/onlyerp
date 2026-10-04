"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { getDatosEmpresa } from "@/app/actions/configuracion-empresa";
import { getPedidoParaImprimir } from "@/app/actions/pedidos";
import { Loader2 } from "lucide-react";

export default function PedidoTicketPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const pedidoId = Number(id);
    const searchParams = useSearchParams();
    const mostrarDescuentos = searchParams.get("descuentos") !== "false";

    const [pedido, setPedido] = useState<any>(null);
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                setTimeout(() => window.print(), 500);
            }
        };
        cargarDatos();
    }, [pedidoId]);

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-6 w-6 inline" /></div>;
    if (!pedido || !empresa) return <div className="p-10 font-bold text-center">Comprobante de pedido no encontrado.</div>;

    const fechaEmision = new Date(pedido.fecha).toLocaleDateString("es-AR");
    const horaEmision = new Date(pedido.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    const fechaEntrega = pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleDateString("es-AR") : null;

    return (
        <div className="w-[80mm] min-h-[100px] bg-white text-black font-mono text-[12px] leading-tight mx-auto print:mx-auto pb-10">

            {/* BOTÓN VOLVER (Oculto al imprimir) */}
            <div className="print:hidden text-center mb-4 pt-4 px-2 space-y-2">
                <button 
                    onClick={() => window.history.back()} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow-md w-full text-xs"
                >
                    ← Volver
                </button>
                <button 
                    onClick={() => window.print()} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-4 rounded-xl shadow-md w-full text-xs"
                >
                    🖨️ IMPRIMIR TICKET (80mm)
                </button>
            </div>

            {/* 1. CABECERA: DATOS DE LA EMPRESA */}
            <div className="text-center pt-2 mb-2">
                <h1 className="text-[17px] font-black uppercase mb-0.5">{empresa.nombre_fantasia}</h1>
                <p className="font-bold text-[10px] uppercase">{empresa.razon_social}</p>
                <p className="mt-1 text-[11px]">{empresa.direccion}</p>
                <p className="text-[11px]">Tel: {empresa.telefono || "S/D"}</p>
                <p className="text-[10px] text-slate-600">CUIT: {empresa.cuit}</p>
            </div>

            {/* 2. RECUADRO CENTRAL LETRA X (REMITO / NOTA DE PEDIDO) */}
            <div className="flex justify-center relative my-3">
                <div className="absolute w-full border-t-2 border-black border-dashed top-1/2 -translate-y-1/2 z-0"></div>
                <div className="bg-white px-3 py-0.5 border-2 border-black flex flex-col items-center z-10">
                    <span className="text-xl font-black leading-none">X</span>
                    <span className="text-[8px] font-bold leading-tight mt-0.5">DOC. NO FISCAL</span>
                </div>
            </div>

            <div className="text-center border-b-2 border-black border-dashed pb-2 mb-3">
                <h2 className="text-[14px] font-black uppercase">COMPROBANTE DE PEDIDO / REMITO</h2>
                <p className="font-black text-[14px]">Nº 0001-{String(pedido.numero).padStart(8, '0')}</p>
                <p className="text-[11px] mt-1">Emisión: {fechaEmision} {horaEmision}</p>
                {fechaEntrega && (
                    <p className="text-[11px] font-bold">Fecha Entrega: {fechaEntrega}</p>
                )}
                {pedido.venta && (
                    <p className="text-[10px] font-bold mt-0.5">
                        🧾 Facturado: {pedido.venta.tipo_comprobante?.replace('_', ' ')} 000{pedido.venta.punto_venta}-{pedido.venta.numero_comprobante}
                    </p>
                )}
            </div>

            {/* 3. DATOS DEL CLIENTE Y DESPACHO */}
            <div className="border-b-2 border-black border-dashed pb-3 mb-3 text-[11px] space-y-0.5">
                <p><span className="font-bold">Cliente:</span> {pedido.cliente?.nombre_razon_social}</p>
                <p><span className="font-bold">CUIT/DNI:</span> {pedido.cliente?.dni_cuit || "Consumidor Final"}</p>
                <p><span className="font-bold">Dirección:</span> {pedido.cliente?.direccion || "Retira en Local"}</p>
                {pedido.cliente?.telefono && (
                    <p><span className="font-bold">Teléfono:</span> {pedido.cliente.telefono}</p>
                )}
                <p><span className="font-bold">Estado:</span> {pedido.estado}</p>
                <p><span className="font-bold">Pago:</span> {pedido.metodo_pago?.replace('_', ' ') || "CONTADO"}</p>
                {pedido.repartidor && (
                    <p><span className="font-bold">Repartidor:</span> {pedido.repartidor.nombre}</p>
                )}
                {pedido.usuario && (
                    <p><span className="font-bold">Vendedor:</span> {pedido.usuario.nombre}</p>
                )}
            </div>

            {/* 4. CUERPO: DETALLE DE ARTÍCULOS */}
            <div className="border-b-2 border-black border-dashed pb-3 mb-3">
                <table className="w-full text-left text-[11px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="py-1 w-2/12">Cant</th>
                            <th className="py-1 w-7/12">Producto</th>
                            <th className="py-1 w-3/12 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/20">
                        {pedido.detalles?.map((item: any, i: number) => (
                            <tr key={i} className="align-top">
                                <td className="py-1 font-bold">{item.cantidad}</td>
                                <td className="py-1">
                                    <span className="font-medium">{item.producto?.nombre_producto || "Producto"}</span>
                                    {item.combo_nombre && (
                                        <span className="block text-[9px] text-slate-600 font-bold">(Combo: {item.combo_nombre})</span>
                                    )}
                                    <span className="block text-[9px] text-slate-500 font-mono">
                                        ${item.precio_unitario?.toFixed(2)} c/u
                                        {mostrarDescuentos && item.descuento_individual > 0 ? ` (dto ${item.descuento_individual}%)` : ""}
                                    </span>
                                </td>
                                <td className="py-1 text-right font-black font-mono">
                                    ${item.subtotal?.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 5. TOTALES */}
            <div className="border-b-2 border-black border-dashed pb-3 mb-3 text-right">
                <p className="text-[12px]">Subtotal: <span className="font-mono font-bold">${pedido.subtotal?.toFixed(2)}</span></p>
                {pedido.descuento_global > 0 && (
                    <p className="text-[11px]">Descuento ({pedido.descuento_global}%): <span className="font-mono">-${((pedido.subtotal * pedido.descuento_global) / 100).toFixed(2)}</span></p>
                )}
                <p className="text-[18px] font-black mt-1">TOTAL: <span className="font-mono">${pedido.total?.toFixed(2)}</span></p>
            </div>

            {/* 6. OBSERVACIONES */}
            {pedido.notas && (
                <div className="border-b-2 border-black border-dashed pb-2 mb-3 text-[10px]">
                    <span className="font-bold uppercase">Notas / Indicaciones:</span>
                    <p className="whitespace-pre-wrap mt-0.5">{pedido.notas}</p>
                </div>
            )}

            {/* 7. TALÓN DE FIRMA / RECEPCIÓN */}
            <div className="pt-2 text-center text-[9px] space-y-4">
                <p className="uppercase text-[8px] font-bold">Documento no válido como factura • Control de Entrega</p>
                <div className="pt-8 border-t border-black/40 mx-4">
                    <p className="font-bold">Firma y Aclaración de Quien Recibe</p>
                    <p className="text-[8px] text-slate-500">DNI: _______________________ Fecha: ___/___/___</p>
                </div>
                <p className="text-[10px] font-bold pt-2">¡Gracias por su compra!</p>
            </div>
        </div>
    );
}
