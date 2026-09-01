"use client";

import { useState } from "react";
import {
    HelpCircle, X, BookOpen, CheckCircle2, Lightbulb,
    ShoppingCart, Route, Users, Landmark, Package,
    ClipboardList, Building2, BarChart4, Settings,
    LayoutDashboard, Sparkles, Truck, Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ModuloGuia {
    id: string;
    titulo: string;
    categoria: string;
    icono: any;
    color: string;
    resumen: string;
    pasos: string[];
    tips: string[];
}

export const GUIAS_MODULOS: Record<string, ModuloGuia> = {
    "dashboard": {
        id: "dashboard",
        titulo: "Centro de Mando Mayorista",
        categoria: "Gerencia & Control",
        icono: LayoutDashboard,
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        resumen: "Pantalla principal ejecutiva con los 5 KPIs maestros de la distribuidora en tiempo real.",
        pasos: [
            "Revisá el total de facturación de hoy y el estado del turno de caja.",
            "Monitoreá el semáforo de cheques por vencer a 7 días para programar depósitos.",
            "Supervisá las rutas de reparto activas (camiones en calle) y el avance de entregas.",
            "Chequeá el punto de pedido para saber qué productos están en quiebre de stock."
        ],
        tips: [
            "Hacé clic en cualquier tarjeta de KPI para ingresar directo al módulo correspondiente.",
            "Las hojas de ruta muestran el botón 'Rendir a Caja' para cerrar los viajes de los choferes."
        ]
    },
    "ventas": {
        id: "ventas",
        titulo: "Terminal de Punto de Venta (POS)",
        categoria: "Mostrador & Caja",
        icono: ShoppingCart,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        resumen: "Módulo de facturación rápida para atención presencial en mostrador o carga directa de pedidos.",
        pasos: [
            "Seleccioná el cliente (o dejá Consumidor Final) y la lista de precios que le corresponde.",
            "Buscá los artículos por código o nombre y agregalos al carrito.",
            "Elegí el modo operativo: 'Venta Directa' (factura y descuenta stock) o 'Pedido de Venta' (deriva a depósito).",
            "Cargá la forma de pago (Efectivo, Transferencia, Tarjeta, Cuenta Corriente o Saldo a Favor) y confirmá."
        ],
        tips: [
            "Usá la botonera rápida de billetes ($5k, $10k, $20k, Exacto) para cobrar en efectivo sin tipear.",
            "Al confirmar la venta podés enviar el comprobante con 1 clic por WhatsApp al cliente."
        ]
    },
    "pedidos": {
        id: "pedidos",
        titulo: "Control de Pedidos & Despacho",
        categoria: "Logística & Reparto",
        icono: ClipboardList,
        color: "text-blue-600 bg-blue-50 border-blue-200",
        resumen: "Bandeja central donde ingresan los pedidos cargados por preventistas en la PWA o clientes en el Portal B2B.",
        pasos: [
            "1. TOMADO: Revisá el pedido entrante en estado PENDIENTE.",
            "2. ARMADO: Presioná '📦 Armar Pedido' para reservar el stock y enviarlo a preparación física.",
            "3. REPARTO / ENTREGA: Despachalo en una Hoja de Ruta o marcalo como '✅ Confirmar Entrega'.",
            "4. FACTURACIÓN: Presioná 'Facturar Pedido' para generar el ticket/factura en caja o AFIP."
        ],
        tips: [
            "Podés editar artículos y cantidades siempre que el pedido no haya sido facturado.",
            "La barra de ciclo de vida te muestra en todo momento el siguiente paso recomendado."
        ]
    },
    "hojas-de-ruta": {
        id: "hojas-de-ruta",
        titulo: "Hojas de Ruta & Logística",
        categoria: "Logística & Reparto",
        icono: Route,
        color: "text-amber-600 bg-amber-50 border-amber-200",
        resumen: "Planificación de recorridos, asignación de choferes, carga consolidada del camión y rendición de dinero.",
        pasos: [
            "Creá una nueva Hoja de Ruta seleccionando chofer, vehículo y fecha de reparto.",
            "Seleccioná los pedidos armados que irán en el viaje.",
            "Imprimí el 'Consolidado de Carga' para que el depósito cargue el camión y la 'Hoja de Ruta' para el chofer.",
            "Al regreso del chofer, ingresá a 'Rendición' para ingresar el dinero cobrado y registrar posibles rechazos."
        ],
        tips: [
            "Los rechazos de mercadería vuelven a ingresar automáticamente al stock del depósito central.",
            "El chofer puede actualizar el estado de cada parada en vivo desde su teléfono móvil."
        ]
    },
    "cuentas-corrientes": {
        id: "cuentas-corrientes",
        titulo: "Cuentas Corrientes & Deuda",
        categoria: "Finanzas & Valores",
        icono: Users,
        color: "text-purple-600 bg-purple-50 border-purple-200",
        resumen: "Control de saldos en la calle, límites de crédito, imputación de recibos de cobro y recordatorios de pago.",
        pasos: [
            "Buscá al cliente mayorista para ver su ficha financiera y saldo consolidado.",
            "Revisá el listado de facturas impagas y días de antigüedad de la deuda.",
            "Registrá cobranzas parciales o totales seleccionando las facturas a cancelar.",
            "Enviá un recordatorio formal de cobro por WhatsApp con el botón de un solo toque."
        ],
        tips: [
            "Si el cliente tiene facturas vencidas por más de 30 días, el sistema emitirá alertas de bloqueo de crédito en mostrador y PWA.",
            "Podés recibir cheques e imputarlos directo contra la cuenta corriente."
        ]
    },
    "cheques": {
        id: "cheques",
        titulo: "Cartera de Valores & Cheques",
        categoria: "Finanzas & Valores",
        icono: Landmark,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        resumen: "Custodia física y digital de cheques tradicionales y eCheqs de terceros.",
        pasos: [
            "Visualizá la cartera agrupada en: EN_CARTERA, DEPOSITADO, COBRADO, ENDOSADO o RECHAZADO.",
            "Filtrá los cheques que vencen en los próximos 7 días para enviarlos al banco.",
            "Endosá cheques a proveedores para pagar compras de mercadería sin usar efectivo.",
            "Marcá los cheques depositados como acreditados al impactar en tu extracto bancario."
        ],
        tips: [
            "Al endosar un cheque a un proveedor, el sistema descuenta la deuda con el proveedor automáticamente.",
            "Mantené al día el número de cheque y CUIT librador para auditorías contables."
        ]
    },
    "inventario": {
        id: "inventario",
        titulo: "Inventario, Stock & Kardex",
        categoria: "Stock & Abastecimiento",
        icono: Package,
        color: "text-blue-600 bg-blue-50 border-blue-200",
        resumen: "Maestro de artículos, control de stock por depósito, márgenes por lista de precios y libro Kardex.",
        pasos: [
            "Filtrá artículos por categoría, marca o proveedor.",
            "Editá costos y márgenes de ganancia con cálculo en cascada automático.",
            "Accedé al 'Kardex de Stock' desde el menú de cada producto para auditar entradas, salidas y saldo progresivo.",
            "Ajustá inventarios físicos por rotura o recuento periódico con trazabilidad de operador."
        ],
        tips: [
            "Podés exportar o imprimir la ficha de Kardex para auditorías físicas en estantería.",
            "El sistema admite unidades fraccionadas (litros, kilos, metros) o unidades cerradas."
        ]
    },
    "presupuestos": {
        id: "presupuestos",
        titulo: "Presupuestos y Cotizaciones",
        categoria: "Mostrador & Caja",
        icono: Receipt,
        color: "text-amber-600 bg-amber-50 border-amber-200",
        resumen: "Emisión de cotizaciones formales para clientes con congelamiento de precios por días de validez.",
        pasos: [
            "Creá un nuevo presupuesto seleccionando cliente y lista de precios.",
            "Agregá los productos requeridos y definí la vigencia en días (ej: 7 o 15 días).",
            "Imprimí el presupuesto o envialo en PDF / texto directamente al WhatsApp del cliente.",
            "Al ser aceptado, convertilo a Venta Mostrador o Pedido de Depósito con un solo clic."
        ],
        tips: [
            "Los presupuestos no descuentan stock hasta ser convertidos a venta o pedido.",
            "Si cambian los costos del proveedor, los presupuestos mantienen el precio pactado durante su vigencia."
        ]
    },
    "portal-b2b": {
        id: "portal-b2b",
        titulo: "Portal B2B Autogestión Clientes",
        categoria: "Comercial & Web",
        icono: Building2,
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        resumen: "Plataforma web de autogestión 24/7 donde tus clientes mayoristas compran con su tarifa y ven su saldo.",
        pasos: [
            "El cliente ingresa a '/portal-b2b' e inicia sesión únicamente con su CUIT.",
            "Explora el catálogo con sus precios mayoristas asignados y descuentos por volumen (+12 u).",
            "Carga su carrito y envía el pedido web.",
            "El pedido entra inmediatamente a la bandeja de '/pedidos' del ERP para su preparación."
        ],
        tips: [
            "El cliente también puede consultar sus facturas pendientes y saldo de cuenta corriente en vivo.",
            "No requiere contraseñas complejas: valida contra el padrón de clientes activos."
        ]
    },
    "compras": {
        id: "compras",
        titulo: "Sugerido de Compras & Proveedores",
        categoria: "Stock & Abastecimiento",
        icono: Sparkles,
        color: "text-purple-600 bg-purple-50 border-purple-200",
        resumen: "Cálculo inteligente de reposición basado en rotación de ventas y punto de pedido mínimo.",
        pasos: [
            "Revisá la lista de artículos bajo el stock de seguridad sugerido.",
            "Filtrá por proveedor para armar una orden de compra consolidada.",
            "Generá la orden de compra y registrá la recepción de mercadería al llegar el camión.",
            "El ingreso actualiza los costos de compra y recalcula automáticamente los precios de venta."
        ],
        tips: [
            "Mantené configurado el stock mínimo en cada producto para que el asistente de compras sea 100% certero."
        ]
    },
    "configuracion": {
        id: "configuracion",
        titulo: "Reglas Comerciales, AFIP e IVA",
        categoria: "Gerencia & Control",
        icono: Settings,
        color: "text-slate-600 bg-slate-50 border-slate-200",
        resumen: "Parámetros globales del ERP: comisiones, redondeos a $5 y tratamiento de IVA en listas de precios.",
        pasos: [
            "Definí el modo de IVA: 'Precio Base Directo (IVA 0%)' o 'Precio con IVA Incluido (21% / 10.5%)'.",
            "Configurá la comisión base para vendedores y el límite máximo de descuento permitido.",
            "Activá o desactivá el redondeo automático a múltiplos de $5.",
            "Configurá los certificados fiscales de AFIP para emisión de facturas electrónicas A, B y C."
        ],
        tips: [
            "Cualquier cambio en el tratamiento de IVA se propaga instantáneamente a POS, PWA y catálogo B2B."
        ]
    }
};

export function ModuleHelpButton({ moduloId }: { moduloId?: string }) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string>(moduloId || "dashboard");

    const guiaActual = GUIAS_MODULOS[selectedId] || GUIAS_MODULOS["dashboard"];
    const IconComponent = guiaActual.icono;

    const handleOpen = (id?: string) => {
        if (id && GUIAS_MODULOS[id]) setSelectedId(id);
        else if (moduloId && GUIAS_MODULOS[moduloId]) setSelectedId(moduloId);
        setOpen(true);
    };

    return (
        <>
            <Button
                type="button"
                onClick={() => handleOpen()}
                variant="outline"
                size="sm"
                title="Guía rápida y ayuda de este módulo"
                className="h-9 px-3 rounded-xl border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">Guía & Ayuda</span>
                <span className="sm:hidden font-black">?</span>
            </Button>

            {open && (
                <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        
                        {/* HEADER DEL MODAL */}
                        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl border ${guiaActual.color}`}>
                                    <IconComponent className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">{guiaActual.titulo}</h3>
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase">{guiaActual.categoria}</Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{guiaActual.resumen}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setOpen(false)}
                                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* SELECTOR RÁPIDO DE OTROS MÓDULOS */}
                        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-zinc-800/20 border-b border-slate-100 dark:border-zinc-800 flex gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
                            {Object.values(GUIAS_MODULOS).map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setSelectedId(m.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                        selectedId === m.id
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    {m.titulo.split(' ')[0]}
                                </button>
                            ))}
                        </div>

                        {/* CUERPO CON PASO A PASO Y TIPS */}
                        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
                            
                            {/* PASO A PASO */}
                            <div className="space-y-3">
                                <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <BookOpen className="h-4 w-4 text-indigo-600" /> Flujo Operativo Paso a Paso
                                </h4>
                                <div className="space-y-2">
                                    {guiaActual.pasos.map((paso, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                                            <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                {idx + 1}
                                            </span>
                                            <p className="font-medium text-xs text-slate-800 dark:text-slate-200 leading-relaxed pt-0.5">{paso}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* TIPS CLAVE */}
                            <div className="space-y-3">
                                <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                                    <Lightbulb className="h-4 w-4 text-amber-500" /> Tips & Buenas Prácticas
                                </h4>
                                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2 text-xs">
                                    {guiaActual.tips.map((tip, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                                            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="font-medium leading-relaxed">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* FOOTER */}
                        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 flex justify-end shrink-0">
                            <Button
                                onClick={() => setOpen(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-9 px-5 rounded-xl"
                            >
                                Entendido
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
