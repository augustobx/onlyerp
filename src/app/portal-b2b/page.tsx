"use client";

import { useState, useEffect, useTransition } from "react";
import { validarAccesoClienteB2B, obtenerCatalogoB2B, crearPedidoB2B, obtenerEstadoCuentaB2B } from "@/app/actions/portal-b2b";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Building2, ShoppingCart, Search, Package, Plus, Minus, CheckCircle2,
    Clock, DollarSign, FileText, ArrowRight, LogOut, Sparkles, Tag, ShieldCheck,
    Send, AlertCircle, Phone, MapPin, Receipt, Trash2
} from "lucide-react";

export default function PortalB2BPage() {
    const [isPending, startTransition] = useTransition();

    // Sesión B2B del cliente
    const [cuitInput, setCuitInput] = useState("");
    const [cliente, setCliente] = useState<any>(null);

    // Navegación
    const [tabActiva, setTabActiva] = useState<"CATALOGO" | "CARRITO" | "CUENTA">("CATALOGO");

    // Catálogo y Carrito
    const [catalogo, setCatalogo] = useState<any[]>([]);
    const [query, setQuery] = useState("");
    const [carrito, setCarrito] = useState<Record<number, number>>({});
    const [notasPedido, setNotasPedido] = useState("");
    const [fechaEntrega, setFechaEntrega] = useState("");

    // Cuenta Corriente
    const [estadoCuenta, setEstadoCuenta] = useState<any>(null);

    // Cargar sesión guardada localmente
    useEffect(() => {
        const saved = localStorage.getItem("sanu_b2b_cliente");
        if (saved) {
            const cli = JSON.parse(saved);
            setCliente(cli);
            cargarCatalogo(cli.id);
            cargarCuenta(cli.id);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cuitInput.trim()) return toast.error("Ingresá tu CUIT o DNI");

        startTransition(async () => {
            const res = await validarAccesoClienteB2B(cuitInput);
            if (res.success && res.data) {
                setCliente(res.data);
                localStorage.setItem("sanu_b2b_cliente", JSON.stringify(res.data));
                toast.success(`¡Bienvenido/a, ${res.data.nombre}!`);
                cargarCatalogo(res.data.id);
                cargarCuenta(res.data.id);
            } else {
                toast.error(res.error || "No se pudo acceder");
            }
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("sanu_b2b_cliente");
        setCliente(null);
        setCarrito({});
        setCatalogo([]);
        setEstadoCuenta(null);
    };

    const cargarCatalogo = (cliId: number) => {
        startTransition(async () => {
            const res = await obtenerCatalogoB2B(cliId, query);
            if (res.success && res.data) {
                setCatalogo(res.data);
            }
        });
    };

    const cargarCuenta = (cliId: number) => {
        startTransition(async () => {
            const res = await obtenerEstadoCuentaB2B(cliId);
            if (res.success && res.data) {
                setEstadoCuenta(res.data);
            }
        });
    };

    const ajustarCantidad = (prodId: number, delta: number) => {
        const actual = carrito[prodId] || 0;
        const nueva = Math.max(0, actual + delta);
        if (nueva === 0) {
            const copy = { ...carrito };
            delete copy[prodId];
            setCarrito(copy);
        } else {
            setCarrito({ ...carrito, [prodId]: nueva });
        }
    };

    // Cálculo de items en el carrito con escalas de volumen
    const itemsCarrito = Object.entries(carrito).map(([idStr, cant]) => {
        const prod = catalogo.find(p => p.id === Number(idStr));
        if (!prod) return null;

        let precio = prod.precio_unitario;
        let descuentoEscala = 0;

        // Evaluar escala
        if (prod.escalas && prod.escalas.length > 0) {
            for (const esc of prod.escalas) {
                if (cant >= esc.cantidad_minima) {
                    if (esc.precio_unitario) {
                        precio = esc.precio_unitario;
                        descuentoEscala = Math.round(((prod.precio_unitario - esc.precio_unitario) / prod.precio_unitario) * 100);
                    } else if (esc.descuento_porcentaje) {
                        descuentoEscala = esc.descuento_porcentaje;
                        precio = prod.precio_unitario * (1 - esc.descuento_porcentaje / 100);
                    }
                }
            }
        }

        return {
            producto: prod,
            cantidad: cant,
            precioUnitario: precio,
            descuentoEscala,
            subtotal: precio * cant
        };
    }).filter(Boolean) as Array<{ producto: any; cantidad: number; precioUnitario: number; descuentoEscala: number; subtotal: number }>;

    const totalCarrito = itemsCarrito.reduce((acc, i) => acc + i.subtotal, 0);
    const cantidadTotalArticulos = Object.values(carrito).reduce((a, b) => a + b, 0);

    const handleEnviarPedido = () => {
        if (itemsCarrito.length === 0) return toast.error("El carrito está vacío.");

        startTransition(async () => {
            const payload = itemsCarrito.map(i => ({
                productoId: i.producto.id,
                cantidad: i.cantidad
            }));

            const res: any = await crearPedidoB2B(cliente.id, payload, notasPedido, fechaEntrega);
            if (res.success && res.data) {
                toast.success(`¡Pedido #${res.data.numero} enviado con éxito al depósito!`, { duration: 5000 });
                setCarrito({});
                setNotasPedido("");
                setTabActiva("CATALOGO");
                cargarCuenta(cliente.id);
            } else {
                toast.error(res.error || "Ocurrió un error al enviar el pedido.");
            }
        });
    };

    // ==========================================
    // VISTA 1: LOGIN B2B (Si no está autenticado)
    // ==========================================
    if (!cliente) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-2">
                            <Building2 className="h-10 w-10" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Portal Clientes Mayoristas</h1>
                        <p className="text-slate-400 text-sm">Autogestión de pedidos y cuenta corriente 24/7</p>
                    </div>

                    <Card className="border-slate-800 bg-slate-950/80 shadow-2xl text-white">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold text-slate-200">Acceso Rápido con CUIT</CardTitle>
                            <CardDescription className="text-slate-400 text-xs">
                                Ingresá el CUIT o DNI con el que estás registrado como cliente de Sanu Distribuidora.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                        CUIT / DNI Registrado
                                    </label>
                                    <Input
                                        placeholder="Ej: 30-71112233-4"
                                        value={cuitInput}
                                        onChange={(e) => setCuitInput(e.target.value)}
                                        className="h-12 bg-slate-900 border-slate-700 text-white font-mono text-base"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 font-black text-sm shadow-lg shadow-indigo-600/30 rounded-xl"
                                >
                                    {isPending ? "Verificando cuenta..." : "Ingresar al Catálogo Mayorista"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="text-center text-xs text-slate-500">
                        ¿Aún no tenés cuenta mayorista? Contactá a ventas al <span className="text-indigo-400 font-bold">03329-425566</span>.
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // VISTA 2: PORTAL MAYORISTA ACTIVO
    // ==========================================
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            
            {/* BARRA SUPERIOR B2B */}
            <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-30">
                <div className="max-w-[1200px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-black text-base text-white leading-tight">{cliente.nombre}</h2>
                                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px] font-bold">
                                    {cliente.listaNombre}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">CUIT: {cliente.cuit}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setTabActiva("CARRITO")}
                            className="relative h-10 px-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                        >
                            <ShoppingCart className="h-4 w-4 text-emerald-400" />
                            <span>${totalCarrito.toFixed(2)}</span>
                            {cantidadTotalArticulos > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white font-black text-[10px] h-5 w-5 rounded-full flex items-center justify-center shadow-md">
                                    {cantidadTotalArticulos}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title="Cerrar Sesión"
                            className="h-10 w-10 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* PESTAÑAS DE NAVEGACIÓN B2B */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-[1200px] mx-auto flex gap-4 px-4">
                    <button
                        onClick={() => setTabActiva("CATALOGO")}
                        className={`py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-colors ${
                            tabActiva === "CATALOGO" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                    >
                        <Package className="h-4 w-4" /> Catálogo & Precios
                    </button>
                    <button
                        onClick={() => setTabActiva("CARRITO")}
                        className={`py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-colors ${
                            tabActiva === "CARRITO" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                    >
                        <ShoppingCart className="h-4 w-4" /> Mi Pedido ({cantidadTotalArticulos})
                    </button>
                    <button
                        onClick={() => setTabActiva("CUENTA")}
                        className={`py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-colors ${
                            tabActiva === "CUENTA" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                    >
                        <FileText className="h-4 w-4" /> Cuenta Corriente & Facturas
                    </button>
                </div>
            </div>

            {/* CONTENIDO SEGÚN PESTAÑA */}
            <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 md:p-6">

                {/* TAB 1: CATÁLOGO DE PRODUCTOS */}
                {tabActiva === "CATALOGO" && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full sm:max-w-md">
                                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                                <Input
                                    placeholder="Buscar producto por nombre o código..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="pl-9 h-11 bg-white rounded-xl text-sm font-medium"
                                />
                            </div>
                            <Button
                                onClick={() => cargarCatalogo(cliente.id)}
                                variant="outline"
                                size="sm"
                                className="h-11 rounded-xl text-xs font-bold"
                            >
                                <Search className="h-3.5 w-3.5 mr-1" /> Buscar
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {catalogo.map(prod => {
                                const cantEnCarrito = carrito[prod.id] || 0;
                                return (
                                    <Card key={prod.id} className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between overflow-hidden">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                        {prod.marca}
                                                    </span>
                                                    <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{prod.nombre}</h3>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">Cód: {prod.codigo}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-base font-black text-slate-900">${prod.precio_unitario.toFixed(2)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Unitario</p>
                                                </div>
                                            </div>

                                            {/* ESCALAS DE VOLUMEN DISPONIBLES */}
                                            {prod.escalas && prod.escalas.length > 0 && (
                                                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2 text-[11px] text-amber-900 space-y-1">
                                                    <p className="font-extrabold flex items-center gap-1 text-[10px] uppercase text-amber-800">
                                                        <Sparkles className="h-3 w-3 text-amber-600" /> Descuentos por Bulto / Cantidad:
                                                    </p>
                                                    {prod.escalas.map((esc: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between font-semibold">
                                                            <span>Llevando +{esc.cantidad_minima} unidades:</span>
                                                            <span className="font-bold text-emerald-700">
                                                                {esc.precio_unitario ? `$${esc.precio_unitario.toFixed(2)} c/u` : `${esc.descuento_porcentaje}% OFF`}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* BOTONERA DE CARRITO */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                <span className={`text-[10px] font-bold ${prod.stock_disponible > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {prod.stock_disponible > 0 ? `Stock Disponible (${prod.stock_disponible})` : 'A Pedido'}
                                                </span>

                                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => ajustarCantidad(prod.id, -1)}
                                                        className="h-7 w-7 rounded-lg text-slate-600"
                                                    >
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <span className="font-black text-xs min-w-[20px] text-center">{cantEnCarrito}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => ajustarCantidad(prod.id, 1)}
                                                        className="h-7 w-7 rounded-lg text-indigo-600"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB 2: MI PEDIDO (CARRITO) */}
                {tabActiva === "CARRITO" && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
                            <CardHeader className="border-b border-slate-100 pb-4">
                                <CardTitle className="text-lg font-black text-slate-900 flex items-center justify-between">
                                    <span>Resumen de tu Pedido Web</span>
                                    <Badge className="bg-emerald-50 text-emerald-700 font-bold">{cantidadTotalArticulos} artículos</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 divide-y divide-slate-100">
                                {itemsCarrito.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 space-y-2">
                                        <ShoppingCart className="h-10 w-10 mx-auto opacity-40" />
                                        <p className="font-bold">El carrito está vacío.</p>
                                        <Button onClick={() => setTabActiva("CATALOGO")} className="bg-indigo-600 text-xs font-bold">
                                            Ir al Catálogo de Productos
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {itemsCarrito.map((item, idx) => (
                                            <div key={idx} className="py-3 flex justify-between items-center gap-3">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-xs text-slate-900">{item.producto.nombre}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-slate-500 font-mono">${item.precioUnitario.toFixed(2)} x {item.cantidad} u</span>
                                                        {item.descuentoEscala > 0 && (
                                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                                                                Escala {item.descuentoEscala}% OFF
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                                                        <button onClick={() => ajustarCantidad(item.producto.id, -1)} className="p-1 hover:bg-white rounded"><Minus className="h-3 w-3" /></button>
                                                        <span className="font-bold text-xs px-1.5">{item.cantidad}</span>
                                                        <button onClick={() => ajustarCantidad(item.producto.id, 1)} className="p-1 hover:bg-white rounded text-indigo-600"><Plus className="h-3 w-3" /></button>
                                                    </div>
                                                    <span className="font-black text-sm text-slate-900 min-w-[70px] text-right">
                                                        ${item.subtotal.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="pt-4 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                                                    Fecha de Entrega Deseada (Opcional)
                                                </label>
                                                <Input
                                                    type="date"
                                                    value={fechaEntrega}
                                                    onChange={(e) => setFechaEntrega(e.target.value)}
                                                    className="h-10 text-xs font-bold"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                                                    Notas o Instrucciones de Descarga
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Ej: Entregar por portón lateral antes de las 13hs..."
                                                    value={notasPedido}
                                                    onChange={(e) => setNotasPedido(e.target.value)}
                                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                                                />
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Total a Facturar</p>
                                                    <p className="text-2xl font-black text-emerald-600">${totalCarrito.toFixed(2)}</p>
                                                </div>
                                                <Button
                                                    onClick={handleEnviarPedido}
                                                    disabled={isPending}
                                                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20"
                                                >
                                                    {isPending ? "Enviando al depósito..." : "Confirmar y Enviar Pedido"}
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 3: MI CUENTA CORRIENTE & FACTURAS */}
                {tabActiva === "CUENTA" && estadoCuenta && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
                                <CardContent className="p-5 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Saldo Pendiente Actual</p>
                                        <p className="text-2xl font-black text-rose-600 mt-1">${estadoCuenta.saldoTotal.toFixed(2)}</p>
                                    </div>
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                                        <DollarSign className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
                                <CardContent className="p-5 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Límite de Crédito Otorgado</p>
                                        <p className="text-2xl font-black text-slate-900 mt-1">${estadoCuenta.limiteCredito.toFixed(2)}</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
                            <CardHeader className="border-b border-slate-100 pb-3">
                                <CardTitle className="text-sm font-black text-slate-800">Facturas Pendientes de Pago</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {estadoCuenta.facturasPendientes.length === 0 ? (
                                    <div className="p-8 text-center text-emerald-600 font-bold text-xs flex flex-col items-center gap-1">
                                        <CheckCircle2 className="h-8 w-8" />
                                        ¡Tu cuenta se encuentra al día! No tenés facturas pendientes.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {estadoCuenta.facturasPendientes.map((fac: any) => (
                                            <div key={fac.id} className="p-4 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-xs text-slate-900">{fac.tipo} #{fac.numero}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(fac.fecha).toLocaleDateString('es-AR')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-sm text-rose-600">${fac.saldo_pendiente.toFixed(2)}</p>
                                                    <p className="text-[10px] text-slate-400">Total: ${fac.total.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

            </main>
        </div>
    );
}
