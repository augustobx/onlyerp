import { obtenerHojaDeRutaDetalle } from "@/app/actions/logistica";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import BotonImprimir from "@/app/imprimir/boton-imprimir";
import { MapPin, Phone } from "lucide-react";

export default async function HojaDeRutaPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await obtenerHojaDeRutaDetalle(Number(id));

    if (!res.success || !res.data) {
        return (
            <div className="p-8 text-center text-red-600 font-bold">
                {res.error || "No se pudo cargar la hoja de ruta."}
            </div>
        );
    }

    const ruta: any = res.data;
    const totalImporte = (ruta.detalles || []).reduce((acc: number, d: any) => acc + (d.pedido?.total || 0), 0);

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen font-sans">
            {/* Barra de Acciones (Oculta al imprimir) */}
            <div className="print:hidden mb-6 flex justify-between items-center bg-slate-100 p-4 rounded-xl">
                <div>
                    <h2 className="font-bold text-slate-800">Hoja de Ruta para Chofer</h2>
                    <p className="text-xs text-slate-500">Documento de viaje con paradas ordenadas, datos de contacto y cobranzas</p>
                </div>
                <BotonImprimir />
            </div>

            {/* Cabecera del Documento */}
            <div className="border-b-2 border-black pb-4 mb-6 space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">HOJA DE RUTA DE REPARTO</h1>
                        <p className="text-sm font-bold text-gray-700">RUTA #{ruta.numero} — {ruta.zona || "General"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">Fecha: {formatFechaLocal(ruta.fecha_despacho)}</p>
                        <p className="text-xs text-gray-600">Chofer: <span className="font-bold text-black">{ruta.repartidor?.nombre}</span></p>
                        {ruta.vehiculo && <p className="text-xs text-gray-600">Vehículo: {ruta.vehiculo}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 text-xs border-t border-gray-300">
                    <div><span className="font-bold">Total Paradas:</span> {ruta.detalles.length}</div>
                    <div><span className="font-bold">Total a Cobrar en Calle:</span> {formatCurrency(totalImporte)}</div>
                    <div><span className="font-bold">Estado:</span> {ruta.estado}</div>
                </div>
            </div>

            {/* Lista de Paradas / Entregas */}
            <div className="space-y-4">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b-2 border-black bg-gray-100">
                            <th className="py-2 px-2 w-8 text-center">#</th>
                            <th className="py-2 px-2 w-20">PEDIDO</th>
                            <th className="py-2 px-2">CLIENTE Y DOMICILIO</th>
                            <th className="py-2 px-2 w-28 text-center">FORMA PAGO</th>
                            <th className="py-2 px-2 w-28 text-right font-black">A COBRAR</th>
                            <th className="py-2 px-2 w-32 text-center">FIRMA CLIENTE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                        {ruta.detalles.map((d: any) => {
                            const p = d.pedido;
                            const totalBultos = p?.detalles?.reduce((acc: number, item: any) => acc + item.cantidad, 0) || 0;

                            return (
                                <tr key={d.id} className="align-top">
                                    <td className="py-3 px-2 text-center font-black text-sm">{d.orden_parada}</td>
                                    <td className="py-3 px-2 font-mono font-bold text-gray-700">#{p?.numero}</td>
                                    <td className="py-3 px-2 space-y-1">
                                        <div className="font-bold text-black text-sm">{p?.cliente?.nombre_razon_social}</div>
                                        <div className="text-[11px] text-gray-600 flex items-center gap-1">
                                            <MapPin className="h-3 w-3 inline shrink-0" />
                                            {p?.cliente?.direccion || "Sin dirección registrada"}
                                        </div>
                                        {p?.cliente?.telefono && (
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                <Phone className="h-3 w-3 inline shrink-0" /> {p?.cliente?.telefono}
                                            </div>
                                        )}
                                        {p?.usuario && (
                                            <div className="text-[10px] text-gray-700 font-medium">
                                                👤 <span className="font-bold">Prev:</span> {p.usuario.nombre} {p.usuario.telefono ? `(Tel: ${p.usuario.telefono})` : ''}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-gray-400">
                                            {p?.detalles?.length || 0} ítems ({totalBultos} unidades) {p?.notas ? `• Obs: ${p.notas}` : ''}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-center uppercase font-bold text-[11px] text-gray-700">
                                        {p?.metodo_pago}
                                    </td>
                                    <td className="py-3 px-2 text-right font-black text-sm text-black">
                                        {formatCurrency(p?.total || 0)}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        <div className="h-10 border border-dashed border-gray-400 rounded flex items-end justify-center pb-1 text-[9px] text-gray-400">
                                            Firma / Recibido
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Resumen de Cierre de Viaje */}
            <div className="mt-10 pt-6 border-t-2 border-black grid grid-cols-3 gap-6 text-xs">
                <div className="space-y-1">
                    <p className="font-bold text-gray-700">Control de Kilometraje:</p>
                    <p>KM Salida: <span className="font-mono">{ruta.km_inicial || "_______"}</span></p>
                    <p>KM Regreso: <span className="font-mono">{ruta.km_final || "_______"}</span></p>
                </div>
                <div className="space-y-1">
                    <p className="font-bold text-gray-700">Rendición de Valores:</p>
                    <p>Efectivo: $________________</p>
                    <p>Cheques: $________________</p>
                    <p>Transf.: $________________</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-black w-40 mx-auto mt-6 mb-1"></div>
                    <p className="font-bold">Firma Chofer al Cierre</p>
                </div>
            </div>
        </div>
    );
}
