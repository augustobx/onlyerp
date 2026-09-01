import { obtenerConsolidadoCarga } from "@/app/actions/logistica";
import { formatCurrency, formatFechaLocal } from "@/lib/utils";
import { Truck, Package, Printer } from "lucide-react";
import BotonImprimir from "@/app/imprimir/boton-imprimir";

export default async function ConsolidadoCargaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await obtenerConsolidadoCarga(Number(id));

    if (!res.success || !res.data) {
        return (
            <div className="p-8 text-center text-red-600 font-bold">
                {res.error || "No se pudo cargar el consolidado de carga."}
            </div>
        );
    }

    const { ruta, itemsConsolidados, totalPedidos, totalImporte } = res.data;

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen font-sans">
            {/* Barra de Acciones (Oculta al imprimir) */}
            <div className="print:hidden mb-6 flex justify-between items-center bg-slate-100 p-4 rounded-xl">
                <div>
                    <h2 className="font-bold text-slate-800">Consolidado de Picking para Depósito</h2>
                    <p className="text-xs text-slate-500">Imprime esta hoja para que el personal arme la carga del camión</p>
                </div>
                <BotonImprimir />
            </div>

            {/* Cabecera del Documento */}
            <div className="border-b-2 border-black pb-4 mb-6 space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">CONSOLIDADO DE CARGA (PICKING)</h1>
                        <p className="text-sm font-bold text-gray-700">HOJA DE RUTA #{ruta.numero} — {ruta.zona || "General"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">Fecha: {formatFechaLocal(ruta.fecha_despacho)}</p>
                        <p className="text-xs text-gray-600">Chofer: <span className="font-bold text-black">{ruta.repartidor?.nombre}</span></p>
                        {ruta.vehiculo && <p className="text-xs text-gray-600">Vehículo: {ruta.vehiculo}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 text-xs border-t border-gray-300">
                    <div><span className="font-bold">Total Pedidos en Camión:</span> {totalPedidos}</div>
                    <div><span className="font-bold">Total Artículos Distintos:</span> {itemsConsolidados.length}</div>
                    <div><span className="font-bold">Valor Total Mercadería:</span> {formatCurrency(totalImporte)}</div>
                </div>
            </div>

            {/* Tabla de Picking Consolidado */}
            <div className="space-y-4">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b-2 border-black bg-gray-100">
                            <th className="py-2 px-2 w-10 text-center">CHECK</th>
                            <th className="py-2 px-2 w-24">CÓDIGO</th>
                            <th className="py-2 px-2">DESCRIPCIÓN DEL PRODUCTO</th>
                            <th className="py-2 px-2 w-28">MARCA</th>
                            <th className="py-2 px-2 w-20 text-center">UNIDAD</th>
                            <th className="py-2 px-2 w-24 text-right font-black">CANT. TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                        {itemsConsolidados.map((item: any, idx: number) => (
                            <tr key={item.productoId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="py-2 px-2 text-center">
                                    <div className="w-4 h-4 border border-black mx-auto"></div>
                                </td>
                                <td className="py-2 px-2 font-mono font-bold text-gray-700">{item.codigo_articulo}</td>
                                <td className="py-2 px-2 font-bold text-black">
                                    {item.nombre_producto}
                                    <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                                        Distribuido en {item.pedidos_detalle.length} entrega(s)
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-gray-600">{item.marca}</td>
                                <td className="py-2 px-2 text-center uppercase text-gray-600">{item.tipo_medicion}</td>
                                <td className="py-2 px-2 text-right font-black text-sm text-black">
                                    {item.cantidad_total}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Firmas de Control */}
            <div className="mt-12 pt-8 border-t border-gray-400 grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                    <div className="border-b border-black w-48 mx-auto mb-2"></div>
                    <p className="font-bold">Firma y Aclaración Responsable Depósito</p>
                    <p className="text-[10px] text-gray-500">Mercadería armada y controlada</p>
                </div>
                <div>
                    <div className="border-b border-black w-48 mx-auto mb-2"></div>
                    <p className="font-bold">Firma y Aclaración Chofer / Repartidor</p>
                    <p className="text-[10px] text-gray-500">Carga recibida conforme en vehículo</p>
                </div>
            </div>
        </div>
    );
}
