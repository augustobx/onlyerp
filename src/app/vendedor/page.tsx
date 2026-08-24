"use client";

import { useState, useEffect, useTransition } from "react";
import { buscarClientes, buscarProductos, obtenerListasPrecio, obtenerMarcas, obtenerCategorias, obtenerConfiguracionGlobal } from "@/app/actions/ventas";
import { getDepositos } from "@/app/actions/configuracion";
import {
    registrarPedidoPWA, obtenerPedidosVendedor, accionarPedidoVendedor,
    obtenerPedidosParaReparto, marcarPedidoEntregado, marcarPedidoNoEntregado,
    marcarPedidoListoEntrega
} from "@/app/actions/pedidos";
import { getCombosActivos } from "@/app/actions/combos";
import { registrarClientePWA } from "@/app/actions/clientes";
import { getClientSession, logout } from "@/app/actions/auth";
import { getClientesDeudores, getFichaCuentaCorriente, registrarPagoCC } from "@/app/actions/cuentas-corrientes";
import { guardarOffline, obtenerTodosOffline, eliminarOffline, STORE_PEDIDOS, STORE_CLIENTES } from "@/lib/offline-db";
import { redondearPrecio, calcularPrecioConCascada, resolverMargenYDescuento, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
    Trash2, Search, ShoppingCart, User, FileText, Ban, PackageSearch,
    Plus, Minus, X, ChevronRight, Bookmark, Tag, Percent, History, Edit,
    CheckCircle2, RefreshCw, UserPlus, CloudOff, Wifi, Eye, Loader2, LogOut,
    Sparkles, Truck, Phone, MapPin, ImageIcon, AlertCircle, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PwaVendedor() {
    // ==========================================
    // ESTADOS MAESTROS Y NAVEGACIÓN
    // ==========================================
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const [listas, setListas] = useState<any[]>([]);
    const [marcas, setMarcas] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [configuracionGlobal, setConfiguracionGlobal] = useState({ redondear_a_cinco: false });
    const [pedidosHistorial, setPedidosHistorial] = useState<any[]>([]);
    const [filtroHistorial, setFiltroHistorial] = useState("");

    // Combos y Repartos
    const [combos, setCombos] = useState<any[]>([]);
    const [pedidosReparto, setPedidosReparto] = useState<any[]>([]);
    const [filtroReparto, setFiltroReparto] = useState<string>("TODOS");
    const [filtroFechaReparto, setFiltroFechaReparto] = useState<"TODOS" | "HOY" | "MANANA" | "SEMANA">("HOY");
    const [fechaEntregaProg, setFechaEntregaProg] = useState<string>(new Date().toISOString().split('T')[0]);
    const [modalNoEntrega, setModalNoEntrega] = useState<any | null>(null);
    const [motivoNoEntrega, setMotivoNoEntrega] = useState<string>("");

    // Modal para ver foto de producto ampliada
    const [fotoZoom, setFotoZoom] = useState<{ url: string; nombre: string } | null>(null);

    const [tabActiva, setTabActiva] = useState<'NUEVO' | 'COMBOS' | 'REPARTOS' | 'HISTORIAL' | 'COBRANZAS'>('NUEVO');
    const [vistaRemito, setVistaRemito] = useState(false);
    const [catalogoAbierto, setCatalogoAbierto] = useState(false);
    const [modalCliente, setModalCliente] = useState(false);
    
    // ==========================================
    // ESTADOS PARA COBRANZAS
    // ==========================================
    const [puedeCobrar, setPuedeCobrar] = useState(false);
    const [clienteCobranza, setClienteCobranza] = useState<any>(null);
    const [facturasPendientes, setFacturasPendientes] = useState<any[]>([]);
    const [facturaSeleccionada, setFacturaSeleccionada] = useState<any>(null);
    const [montoCobro, setMontoCobro] = useState<string>("");
    const [metodoCobro, setMetodoCobro] = useState<string>("CONTADO");
    const [notasCobro, setNotasCobro] = useState<string>("");
    const [procesandoCobro, setProcesandoCobro] = useState(false);
    const [deudoresList, setDeudoresList] = useState<any[]>([]);

    // ==========================================
    // ESTADOS DEL PEDIDO ACTUAL
    // ==========================================
    const [cliente, setCliente] = useState<any>(null);
    const [pedidoVer, setPedidoVer] = useState<any>(null);
    const [selectedListaId, setSelectedListaId] = useState<number>(1);
    const [notas, setNotas] = useState("");
    const [carrito, setCarrito] = useState<any[]>([]);

    // Buscadores
    const [queryCliente, setQueryCliente] = useState("");
    const [clientesRes, setClientesRes] = useState<any[]>([]);
    const [queryCatalogo, setQueryCatalogo] = useState("");
    const [filtroMarca, setFiltroMarca] = useState<string>("TODAS");
    const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
    const [productosCatalogo, setProductosCatalogo] = useState<any[]>([]);

    const [depositos, setDepositos] = useState<any[]>([]);
    const [depositoId, setDepositoId] = useState<number>(1);

    // ==========================================
    // EFECTOS (CONEXIÓN Y CARGA)
    // ==========================================
    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => { setIsOnline(true); intentarSincronizar(); };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        obtenerListasPrecio().then(setListas);
        obtenerMarcas().then(setMarcas);
        obtenerCategorias().then(setCategorias);
        obtenerConfiguracionGlobal().then(setConfiguracionGlobal);
        cargarHistorial();
        cargarCombos();
        cargarRepartos();
        intentarSincronizar();

        getDepositos().then(deps => {
            if (deps && deps.length > 0) {
                setDepositos(deps);
                setDepositoId(deps[0].id);
            }
        });
        
        getClientSession().then((s) => {
            if (s && s.permisos && s.permisos.includes("COBRAR_CC")) setPuedeCobrar(true);
            if (s?.sucursalId) {
                getDepositos(Number(s.sucursalId)).then(deps => {
                    if (deps && deps.length > 0) {
                        setDepositos(deps);
                        setDepositoId(deps[0].id);
                    }
                });
            }
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const cargarHistorial = () => obtenerPedidosVendedor().then(setPedidosHistorial);
    const cargarCombos = () => getCombosActivos().then(setCombos);
    const cargarRepartos = () => obtenerPedidosParaReparto().then(setPedidosReparto);

    // Cargar deudores al abrir cobranzas
    useEffect(() => {
        if (tabActiva === 'COBRANZAS' && isOnline) {
            startTransition(async () => {
                const res = await getClientesDeudores({ estado: 'TODOS' });
                if (res.success && res.data) {
                    setDeudoresList(res.data);
                }
            });
        }
        if (tabActiva === 'REPARTOS') {
            cargarRepartos();
        }
        if (tabActiva === 'COMBOS') {
            cargarCombos();
        }
    }, [tabActiva, isOnline]);

    // Lógica de sincronización automática
    const intentarSincronizar = async () => {
        if (!navigator.onLine || syncing) return;
        setSyncing(true);

        try {
            // 1. Sincronizar Clientes Nuevos
            const clientesPending = await obtenerTodosOffline(STORE_CLIENTES);
            for (const c of clientesPending) {
                const res = await registrarClientePWA(c);
                if (res.success) await eliminarOffline(STORE_CLIENTES, c.id);
            }

            // 2. Sincronizar Pedidos
            const pedidosPending = await obtenerTodosOffline(STORE_PEDIDOS);
            if (pedidosPending.length > 0) toast.info(`Sincronizando ${pedidosPending.length} pedidos pendientes...`);

            for (const p of pedidosPending) {
                const res = await registrarPedidoPWA(p);
                if (res.success) await eliminarOffline(STORE_PEDIDOS, p.id);
            }

            if (pedidosPending.length > 0) {
                toast.success("Sincronización finalizada");
                cargarHistorial();
            }
        } catch (e) {
            console.error("Fallo en sincronización:", e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (queryCliente.length >= 2) {
            buscarClientes(queryCliente).then(setClientesRes);
        } else if (queryCliente.length === 0) {
            setClientesRes([]);
        }
    }, [queryCliente]);

    useEffect(() => {
        buscarProductos(queryCatalogo).then(res => {
            let filtrados = res;
            if (filtroMarca !== "TODAS") filtrados = filtrados.filter(p => p.marca?.nombre === filtroMarca);
            if (filtroCategoria !== "TODAS") filtrados = filtrados.filter(p => p.categoria?.nombre === filtroCategoria);
            setProductosCatalogo(filtrados);
        });
    }, [queryCatalogo, filtroMarca, filtroCategoria, catalogoAbierto]);

    // Función de actualización manual
    const handleRefresh = () => {
        startTransition(() => {
            router.refresh();
            cargarHistorial();
            cargarCombos();
            cargarRepartos();
            intentarSincronizar();
        });
    };

    // ==========================================
    // LÓGICA DE PRECIOS Y CARRITO (0% IVA)
    // ==========================================
    const calcularPrecioBase = (producto: any, listaId: number) => {
        const margenDef = listas.find(l => l.id === listaId)?.margen_defecto || 0;
        const { margenFinal, descuentoFinal } = resolverMargenYDescuento(producto, listaId, margenDef);

        const aumProv = producto.proveedor?.aumento_porcentaje || 0;
        const aumMarca = producto.marca?.aumento_porcentaje || 0;
        const aumCat = producto.categoria?.aumento_porcentaje || 0;

        return calcularPrecioConCascada(
            producto.precio_costo,
            descuentoFinal,
            0, // IVA 0% SISTEMA COMPLETO
            aumProv,
            aumMarca,
            aumCat,
            margenFinal,
            configuracionGlobal.redondear_a_cinco
        );
    };

    const handleCambiarListaPrecio = (nuevaListaId: number) => {
        setSelectedListaId(nuevaListaId);
        if (carrito.length > 0) {
            const nuevos = carrito.map(item => {
                if (item.combo_nombre) return item;
                const prod = item.productoRaw || productosCatalogo.find(p => p.id === item.productoId);
                if (prod) {
                    const nuevoPrecioBase = calcularPrecioBase(prod, nuevaListaId);
                    const dto = item.descuento_individual || 0;
                    const sinRedondeo = nuevoPrecioBase * (1 - dto / 100);
                    const nuevoFinal = Number(redondearPrecio(sinRedondeo, configuracionGlobal.redondear_a_cinco).toFixed(2));
                    return {
                        ...item,
                        precio_unitario: nuevoPrecioBase,
                        precio_final: nuevoFinal,
                        subtotal: Number((nuevoFinal * item.cantidad).toFixed(2))
                    };
                }
                return item;
            });
            setCarrito(nuevos);
            const lNombre = listas.find(l => l.id === nuevaListaId)?.nombre || `Lista #${nuevaListaId}`;
            toast.info(`Precios recalculados con ${lNombre}`);
        }
    };

    const handleClienteSelect = (c: any) => {
        setCliente(c);
        const listaId = c.lista_default_id || (listas[0]?.id || 1);
        handleCambiarListaPrecio(listaId);
        setClientesRes([]);
        setQueryCliente("");
    };

    const obtenerItemCarrito = (productoId: number) => carrito.find(i => i.productoId === productoId);

    const ajustarCantidadProducto = (prod: any, delta: number) => {
        const index = carrito.findIndex(i => i.productoId === prod.id);
        const itemExistente = carrito[index];
        const nuevaCantidad = (itemExistente ? itemExistente.cantidad : 0) + delta;

        if (nuevaCantidad > prod.stock_actual) return toast.warning(`Límite de stock: ${prod.stock_actual}`);
        if (nuevaCantidad < 0) return;

        let nuevos = [...carrito];
        const precioBase = calcularPrecioBase(prod, selectedListaId);

        if (index >= 0) {
            if (nuevaCantidad === 0) nuevos = nuevos.filter(i => i.productoId !== prod.id);
            else {
                nuevos[index].cantidad = nuevaCantidad;
                recalcularTotalesItem(nuevos[index]);
            }
        } else if (nuevaCantidad > 0) {
            nuevos.push({
                productoId: prod.id,
                nombre: prod.nombre_producto,
                cantidad: 1,
                precio_unitario: precioBase,
                descuento_individual: 0,
                precio_final: precioBase,
                subtotal: precioBase,
                stock_maximo: prod.stock_actual,
                productoRaw: prod
            });
        }
        setCarrito(nuevos);
    };

    const cambiarDescuento = (productoId: number, nuevoDto: number) => {
        const nuevos = [...carrito];
        const index = nuevos.findIndex(i => i.productoId === productoId);
        if (index >= 0) {
            nuevos[index].descuento_individual = nuevoDto;
            recalcularTotalesItem(nuevos[index]);
            setCarrito(nuevos);
        }
    };

    const recalcularTotalesItem = (item: any) => {
        const descuentoMonto = item.precio_unitario * (item.descuento_individual / 100);
        let final = item.precio_unitario - descuentoMonto;
        final = Number(redondearPrecio(final, configuracionGlobal.redondear_a_cinco).toFixed(2));
        item.precio_final = final;
        item.subtotal = Number((final * item.cantidad).toFixed(2));
    };

    // Agregar Combo completo al carrito
    const handleAgregarCombo = (combo: any) => {
        if (!cliente) {
            toast.warning("Seleccioná un cliente primero para cargar el pedido.");
            setTabActiva('NUEVO');
            return;
        }

        let nuevos = [...carrito];
        for (const it of combo.items) {
            const prod = it.producto;
            const index = nuevos.findIndex(i => i.productoId === prod.id);
            const cantAgregar = it.cantidad;

            // Precio base individual con descuento del combo
            const precioBase = calcularPrecioBase(prod, selectedListaId);
            const dtoCombo = combo.descuento_porc || 0;
            const precioConDto = dtoCombo > 0 ? precioBase * (1 - dtoCombo / 100) : precioBase;
            const precioFinal = Number(redondearPrecio(precioConDto, configuracionGlobal.redondear_a_cinco).toFixed(2));

            if (index >= 0) {
                nuevos[index].cantidad += cantAgregar;
                nuevos[index].subtotal = Number((nuevos[index].precio_final * nuevos[index].cantidad).toFixed(2));
                if (!nuevos[index].combo_nombre) nuevos[index].combo_nombre = combo.nombre;
            } else {
                nuevos.push({
                    productoId: prod.id,
                    nombre: prod.nombre_producto,
                    combo_nombre: combo.nombre,
                    cantidad: cantAgregar,
                    precio_unitario: precioBase,
                    descuento_individual: dtoCombo,
                    precio_final: precioFinal,
                    subtotal: Number((precioFinal * cantAgregar).toFixed(2)),
                    stock_maximo: 999
                });
            }
        }

        setCarrito(nuevos);
        toast.success(`¡Combo "${combo.nombre}" agregado al pedido!`);
        setTabActiva('NUEVO');
    };

    const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
    const total = subtotal;

    // ==========================================
    // CONFIRMAR PEDIDO (EN LÍNEA U OFFLINE)
    // ==========================================
    const confirmarPedido = async () => {
        if (!cliente) return toast.error("Seleccione un cliente.");
        if (carrito.length === 0) return toast.error("El carrito está vacío.");

        const payload = {
            clienteId: cliente.id,
            listaPrecioId: selectedListaId,
            depositoId,
            subtotal,
            descuento_global: 0,
            total,
            notas: notas.trim(),
            fecha_entrega: fechaEntregaProg,
            metodoPago: "CUENTA_CORRIENTE",
            montoAbonado: 0,
            carrito
        };

        if (!isOnline) {
            await guardarOffline(STORE_PEDIDOS, payload);
            toast.warning("Sin conexión. Pedido guardado en el dispositivo.");
            limpiarEstadoPedido();
            return;
        }

        const toastId = toast.loading("Enviando pedido...");
        const res = await registrarPedidoPWA(payload);

        if (res.success) {
            toast.success("¡Pedido registrado con éxito!", { id: toastId });
            limpiarEstadoPedido();
        } else {
            toast.error(res.error || "Error al procesar el pedido.", { id: toastId });
        }
    };

    const limpiarEstadoPedido = () => {
        setCarrito([]);
        setCliente(null);
        setNotas("");
        setFechaEntregaProg(new Date().toISOString().split('T')[0]);
        setVistaRemito(false);
        cargarHistorial();
        setTabActiva('HISTORIAL');
    };

    const handleNuevoCliente = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data = {
            nombre: f.get("nombre") as string,
            cuit: f.get("cuit") as string,
            direccion: f.get("direccion") as string,
            telefono: f.get("telefono") as string,
        };

        if (!isOnline) {
            await guardarOffline(STORE_CLIENTES, data);
            toast.warning("Sin conexión. Cliente guardado para sincronización.");
            setModalCliente(false);
            return;
        }

        const res = await registrarClientePWA(data);
        if (res.success && res.cliente) {
            toast.success("Cliente creado correctamente");
            setCliente(res.cliente);
            setSelectedListaId(res.cliente.lista_default_id || (listas[0]?.id || 1));
            setModalCliente(false);
        } else {
            toast.error(res.error);
        }
    };

    const manejarAccionHistorial = async (pedido: any, accion: 'CANCELAR' | 'EDITAR') => {
        if (!isOnline) return toast.error("Debés estar conectado para cancelar o editar pedidos pasados.");
        if (!confirm(`¿Seguro que querés ${accion} este pedido?`)) return;

        const toastId = toast.loading(`Procesando...`);
        const res = await accionarPedidoVendedor(pedido.id, accion);

        if (res.success) {
            toast.success(`Acción realizada`, { id: toastId });
            cargarHistorial();
            if (accion === 'EDITAR') {
                setCliente(pedido.cliente);
                setSelectedListaId(pedido.listaPrecioId);
                setNotas(pedido.notas || "");
                const nuevoCarrito = pedido.detalles.map((d: any) => ({
                    productoId: d.productoId,
                    nombre: d.producto.nombre_producto || 'Producto Eliminado',
                    cantidad: d.cantidad,
                    precio_unitario: d.precio_unitario,
                    descuento_individual: d.descuento_individual,
                    precio_final: d.precio_final,
                    subtotal: d.subtotal,
                    stock_maximo: d.cantidad
                }));
                setCarrito(nuevoCarrito);
                setTabActiva('NUEVO');
            }
        } else {
            toast.error(res.error, { id: toastId });
        }
    };

    // Marcar Listo para Entrega (toma el vendedor actual y su fecha de entrega programada)
    const handleMarcarListoEntrega = async (pedido: any) => {
        if (!isOnline) return toast.error("Debés estar conectado para actualizar el estado del pedido.");
        const fechaTexto = pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleDateString() : 'hoy';
        if (!confirm(`¿Marcar Pedido #${pedido.numero} como LISTO PARA ENTREGA? Quedará programado para el ${fechaTexto} a tu nombre.`)) return;

        const toastId = toast.loading("Marcando listo para entrega...");
        const res = await marcarPedidoListoEntrega(pedido.id);

        if (res.success) {
            toast.success(`¡Pedido #${pedido.numero} listo para reparto!`, { id: toastId });
            cargarHistorial();
            cargarRepartos();
            setPedidoVer(null);
        } else {
            toast.error(res.error || "Error al actualizar pedido.", { id: toastId });
        }
    };

    // Acciones de Reparto / Entregas
    const handleMarcarEntregado = (pedidoId: number) => {
        if (!confirm("¿Confirmar entrega del pedido?")) return;
        startTransition(async () => {
            const res = await marcarPedidoEntregado(pedidoId);
            if (res.success) {
                toast.success("¡Pedido marcado como ENTREGADO!");
                cargarRepartos();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleConfirmarNoEntrega = () => {
        if (!motivoNoEntrega.trim()) {
            return toast.error("Por favor escribí el motivo de no entrega.");
        }
        startTransition(async () => {
            const res = await marcarPedidoNoEntregado(modalNoEntrega.id, motivoNoEntrega);
            if (res.success) {
                toast.warning("Incidencia guardada. Pedido marcado como NO ENTREGADO.");
                setModalNoEntrega(null);
                setMotivoNoEntrega("");
                cargarRepartos();
            } else {
                toast.error(res.error);
            }
        });
    };

    // ==========================================
    // ACCIONES DE COBRANZA
    // ==========================================
    const handleSeleccionarClienteCobranza = async (c: any) => {
        setClienteCobranza(c);
        setClientesRes([]);
        setQueryCliente("");
        if (!isOnline) {
             toast.error("Necesitás conexión a internet para ver las facturas pendientes.");
             return;
        }
        const toastId = toast.loading("Cargando cuenta corriente...");
        const res = await getFichaCuentaCorriente(c.id);
        toast.dismiss(toastId);
        if (res.success && res.data) {
             setFacturasPendientes(res.data.ventasPendientes);
        } else {
             toast.error(res.error || "Error al cargar facturas.");
        }
    };

    const handleProcesarCobro = async () => {
        if (!facturaSeleccionada || !montoCobro || Number(montoCobro) <= 0) return;
        if (!isOnline) {
             toast.error("Necesitás conexión a internet para procesar pagos.");
             return;
        }
        
        if (Number(montoCobro) > facturaSeleccionada.saldo_pendiente + 0.01) {
             toast.error("El monto ingresado supera la deuda de la factura.");
             return;
        }

        setProcesandoCobro(true);
        const toastId = toast.loading("Procesando cobro...");
        const res = await registrarPagoCC({
            clienteId: clienteCobranza.id,
            ventaId: facturaSeleccionada.id,
            monto: Number(montoCobro),
            metodo_pago: metodoCobro,
            notas: notasCobro
        });

        if (res.success) {
            toast.success("Pago registrado con éxito", { id: toastId });
            setFacturaSeleccionada(null);
            setMontoCobro("");
            setNotasCobro("");
            const resFicha = await getFichaCuentaCorriente(clienteCobranza.id);
            if (resFicha.success && resFicha.data) {
                 setFacturasPendientes(resFicha.data.ventasPendientes);
            }
        } else {
            toast.error(res.error || "Error al procesar el cobro", { id: toastId });
        }
        setProcesandoCobro(false);
    };

    // ==========================================
    // RENDERIZADO DE LA INTERFAZ
    // ==========================================
    return (
        <div className="min-h-screen bg-zinc-50 pb-24 text-zinc-900 overflow-x-hidden font-sans">

            {/* INDICADOR DE RED */}
            <div className={`text-[10px] font-black text-center py-1 transition-colors ${isOnline ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                {isOnline ? (
                    <span className="flex items-center justify-center gap-1"><Wifi className="w-3 h-3" /> CONECTADO</span>
                ) : (
                    <span className="flex items-center justify-center gap-1 animate-pulse"><CloudOff className="w-3 h-3" /> MODO OFFLINE (LOS DATOS SE GUARDAN EN EL EQUIPO)</span>
                )}
            </div>

            {!vistaRemito && !catalogoAbierto && (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-6 pt-2">
                        <h1 className="text-2xl font-black text-indigo-950 flex items-center tracking-tight">
                            {tabActiva === 'NUEVO' && <><ShoppingCart className="mr-2 h-6 w-6 text-indigo-600" /> Toma de Pedido</>}
                            {tabActiva === 'COMBOS' && <><Sparkles className="mr-2 h-6 w-6 text-amber-500" /> Combos & Promos</>}
                            {tabActiva === 'REPARTOS' && <><Truck className="mr-2 h-6 w-6 text-indigo-600" /> Mis Entregas</>}
                            {tabActiva === 'HISTORIAL' && <><History className="mr-2 h-6 w-6 text-indigo-600" /> Mis Pedidos</>}
                            {tabActiva === 'COBRANZAS' && <><Bookmark className="mr-2 h-6 w-6 text-indigo-600" /> Cobranzas</>}
                        </h1>
                        <div className="flex gap-2 items-center">
                            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 w-9 p-0 rounded-xl bg-white border-zinc-200">
                                <RefreshCw className="h-4 w-4 text-zinc-600" />
                            </Button>
                            <form action={logout}>
                                <Button type="submit" variant="outline" size="sm" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 font-bold rounded-xl shadow-sm px-2">
                                    <LogOut className="w-4 h-4 mr-1" /> Salir
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* VISTA 1: NUEVO PEDIDO */}
                    {tabActiva === 'NUEVO' && (
                        <div className="animate-in fade-in duration-300">
                            {/* SECCIÓN CLIENTE */}
                            {!cliente ? (
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 mb-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center"><User className="w-3 h-3 mr-1" /> Asignar Cliente</label>
                                        <Button variant="ghost" size="sm" onClick={() => setModalCliente(true)} className="text-indigo-600 font-bold text-xs h-7 hover:bg-indigo-50"><UserPlus className="w-3 h-3 mr-1" /> Nuevo Cliente</Button>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-300" />
                                        <Input placeholder="Buscar por Nombre o CUIT..." className="pl-10 h-14 bg-zinc-50 border-zinc-100 rounded-2xl text-base" value={queryCliente} onChange={(e) => setQueryCliente(e.target.value)} />
                                    </div>
                                    {clientesRes.length > 0 && (
                                        <div className="mt-3 border rounded-2xl divide-y bg-white shadow-xl max-h-64 overflow-y-auto border-zinc-100">
                                            {clientesRes.map(c => (
                                                <div key={c.id} className="p-4 flex justify-between items-center active:bg-indigo-50" onClick={() => handleClienteSelect(c)}>
                                                    <div>
                                                        <span className="font-bold text-zinc-800 block text-sm">{c.nombre_razon_social}</span>
                                                        <span className="text-[10px] text-zinc-400 font-mono">CUIT: {c.dni_cuit || "S/D"} • {c.direccion || "Sin dirección"}</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    <div className="bg-indigo-600 p-5 rounded-3xl shadow-lg text-white relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="max-w-[70%]">
                                                <p className="font-black text-xl leading-none mb-1 truncate">{cliente.nombre_razon_social}</p>
                                                <p className="text-xs font-medium text-white/80">CUIT: {cliente.dni_cuit || 'Consumidor Final'}</p>
                                                {cliente.direccion && <p className="text-[11px] text-white/70 truncate mt-0.5"><MapPin className="h-3 w-3 inline mr-0.5" /> {cliente.direccion}</p>}
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setCliente(null)} className="text-white hover:bg-white/20 h-8 rounded-xl px-3 text-xs font-bold border border-white/30">Cambiar</Button>
                                        </div>
                                    </div>

                                    {/* SELECTOR DE LISTA DE PRECIOS */}
                                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-indigo-600" /> Lista de Precios Aplicada
                                            </label>
                                            <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                                                {listas.find(l => l.id === selectedListaId)?.nombre || `Lista #${selectedListaId}`}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={selectedListaId}
                                                onChange={(e) => handleCambiarListaPrecio(Number(e.target.value))}
                                                className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 font-bold text-sm text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-10"
                                            >
                                                {listas.map((l: any) => (
                                                    <option key={l.id} value={l.id}>
                                                        🏷️ {l.nombre} (Margen: {l.margen_defecto}%)
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronRight className="w-4 h-4 text-zinc-400 absolute right-3.5 top-4 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CATÁLOGO BUTTON */}
                            {cliente && (
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <Button onClick={() => setCatalogoAbierto(true)} className="h-20 text-base font-black bg-white border-2 border-indigo-100 text-indigo-600 rounded-3xl shadow-sm hover:bg-indigo-50 flex flex-col items-center justify-center p-2">
                                        <PackageSearch className="w-6 h-6 mb-1 text-indigo-600" />
                                        <span>CATÁLOGO</span>
                                    </Button>
                                    <Button onClick={() => setTabActiva('COMBOS')} className="h-20 text-base font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl shadow-md flex flex-col items-center justify-center p-2">
                                        <Sparkles className="w-6 h-6 mb-1 text-white" />
                                        <span>COMBOS & PROMOS</span>
                                    </Button>
                                </div>
                            )}

                            {/* CARRITO RESUMEN */}
                            {carrito.length > 0 && (
                                <div className="space-y-4 mb-24">
                                    <div className="flex justify-between px-2 items-end">
                                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Artículos Seleccionados ({carrito.length})</p>
                                        <p className="text-xs font-bold text-red-500 cursor-pointer" onClick={() => setCarrito([])}>Vaciar Carrito</p>
                                    </div>
                                    {carrito.map((item, i) => (
                                        <Card key={i} className="border-0 shadow-sm rounded-3xl overflow-hidden">
                                            <CardContent className="p-5 bg-white">
                                                <div className="flex justify-between items-start mb-4">
                                                    <p className="font-bold text-sm text-zinc-900 leading-tight pr-4">{item.nombre}</p>
                                                    <p className="font-black text-lg text-emerald-600 leading-none">${item.subtotal.toFixed(2)}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-1 border border-zinc-100">
                                                        <Button variant="ghost" size="icon" className="text-zinc-400" onClick={() => ajustarCantidadProducto({ id: item.productoId, stock_actual: item.stock_maximo }, -1)}><Minus className="h-4 w-4" /></Button>
                                                        <span className="font-black text-zinc-800">{item.cantidad}</span>
                                                        <Button variant="ghost" size="icon" className="text-zinc-400" onClick={() => ajustarCantidadProducto({ id: item.productoId, stock_actual: item.stock_maximo }, 1)}><Plus className="h-4 w-4" /></Button>
                                                    </div>
                                                    <div className="relative">
                                                        <Percent className="absolute left-3 top-3 h-4 w-4 text-indigo-400" />
                                                        <Input type="number" placeholder="Dto %" className="pl-9 h-12 bg-indigo-50/50 border-indigo-100 rounded-2xl font-black text-indigo-700 text-center" value={item.descuento_individual || ""} onChange={(e) => cambiarDescuento(item.productoId, Number(e.target.value))} />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas internas para administración o despacho..." className="w-full p-4 border border-zinc-200 rounded-3xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] shadow-sm mt-4" />
                                </div>
                            )}

                            {/* BOTÓN FINALIZAR (REMITO) */}
                            {carrito.length > 0 && (
                                <div className="fixed bottom-[75px] left-0 right-0 p-4 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent z-30">
                                    <Button onClick={() => setVistaRemito(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 rounded-2xl h-16 font-black text-lg flex justify-between px-6">
                                        <span>REVISAR PEDIDO</span>
                                        <span className="bg-indigo-800/50 px-3 py-1 rounded-xl">${total.toFixed(2)}</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA 2: COMBOS Y PROMOS */}
                    {tabActiva === 'COMBOS' && (
                        <div className="animate-in fade-in duration-300 pb-24 space-y-4">
                            <p className="text-xs text-slate-500 font-medium px-1">
                                Promociones y paquetes cerrados listos para agregar al pedido con 1 toque.
                            </p>

                            {combos.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
                                    <Sparkles className="h-10 w-10 mx-auto mb-2 text-amber-400 opacity-50" />
                                    <p className="font-bold">No hay combos activos en este momento.</p>
                                </div>
                            ) : (
                                combos.map((c) => (
                                    <Card key={c.id} className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-lg text-slate-900 leading-tight">{c.nombre}</h3>
                                                        {c.descuento_porc > 0 && (
                                                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] px-1.5">
                                                                {c.descuento_porc}% OFF
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {c.descripcion && <p className="text-xs text-slate-500 mt-1">{c.descripcion}</p>}
                                                </div>
                                                <span className="text-2xl font-black text-emerald-600 shrink-0">
                                                    {formatCurrency(c.precio_combo, "ARS")}
                                                </span>
                                            </div>

                                            {/* LISTA DE ITEMS */}
                                            <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 border border-slate-100">
                                                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Incluye:</p>
                                                {c.items?.map((it: any) => (
                                                    <div key={it.id} className="flex justify-between items-center text-xs text-slate-700">
                                                        <span className="font-medium truncate pr-2">• {it.producto?.nombre_producto}</span>
                                                        <Badge variant="outline" className="font-bold bg-white text-slate-600 text-[10px] shrink-0">
                                                            x{it.cantidad}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                onClick={() => handleAgregarCombo(c)}
                                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-md text-sm"
                                            >
                                                <Plus className="h-4 w-4 mr-1.5" /> Agregar Combo al Carrito
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* VISTA 3: REPARTOS / DESPACHOS */}
                    {tabActiva === 'REPARTOS' && (
                        <div className="animate-in fade-in duration-300 pb-24 space-y-4">
                            {/* FILTROS DE FECHA */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                                {[
                                    { id: "HOY", label: "☀️ Hoy" },
                                    { id: "MANANA", label: "🌅 Mañana" },
                                    { id: "SEMANA", label: "📅 Esta Semana" },
                                    { id: "TODOS", label: "🗓️ Todas las Fechas" }
                                ].map(df => (
                                    <Button
                                        key={df.id}
                                        size="sm"
                                        variant={filtroFechaReparto === df.id ? "default" : "outline"}
                                        onClick={() => setFiltroFechaReparto(df.id as any)}
                                        className={`h-8 text-xs font-bold rounded-xl px-3 ${filtroFechaReparto === df.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}
                                    >
                                        {df.label}
                                    </Button>
                                ))}
                            </div>

                            {/* FILTROS DE ESTADO */}
                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                {[
                                    { id: "TODOS", label: "Todos los Estados" },
                                    { id: "ARMADO", label: "🚚 Por Entregar" },
                                    { id: "ENTREGADO", label: "✅ Entregados" },
                                    { id: "NO_ENTREGADO", label: "❌ No Entregados" }
                                ].map(f => (
                                    <Button
                                        key={f.id}
                                        size="sm"
                                        variant={filtroReparto === f.id ? "default" : "outline"}
                                        onClick={() => setFiltroReparto(f.id)}
                                        className={`h-8 text-xs font-bold rounded-xl px-3 ${filtroReparto === f.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border-slate-200'}`}
                                    >
                                        {f.label}
                                    </Button>
                                ))}
                            </div>

                            {pedidosReparto
                                .filter(p => filtroReparto === "TODOS" || p.estado === filtroReparto)
                                .filter(p => {
                                    if (filtroFechaReparto === "TODOS") return true;
                                    const fStr = p.fecha_entrega || p.fecha;
                                    if (!fStr) return true;
                                    const hoy = new Date();
                                    hoy.setHours(0, 0, 0, 0);

                                    const manana = new Date(hoy);
                                    manana.setDate(manana.getDate() + 1);

                                    const finSemana = new Date(hoy);
                                    finSemana.setDate(finSemana.getDate() + 7);

                                    const fComp = new Date(fStr);
                                    fComp.setHours(0, 0, 0, 0);

                                    if (filtroFechaReparto === "HOY") return fComp.getTime() === hoy.getTime();
                                    if (filtroFechaReparto === "MANANA") return fComp.getTime() === manana.getTime();
                                    if (filtroFechaReparto === "SEMANA") return fComp >= hoy && fComp <= finSemana;
                                    return true;
                                })
                                .map((p) => {
                                    const esArmado = p.estado === "ARMADO" || p.estado === "LISTO_ENTREGA";
                                    const esEntregado = p.estado === "ENTREGADO";
                                    const esNoEntregado = p.estado === "NO_ENTREGADO";

                                    return (
                                        <Card key={p.id} className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                                                    <div>
                                                        <span className="font-black text-base text-slate-900 block leading-tight">
                                                            {p.cliente?.nombre_razon_social}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-zinc-400 font-bold uppercase">
                                                                Pedido #{p.numero}
                                                            </span>
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                                                                📅 {p.fecha_entrega ? `Entrega: ${new Date(p.fecha_entrega).toLocaleDateString()}` : `Emisión: ${new Date(p.fecha).toLocaleDateString()}`}
                                                            </span>
                                                            {p.ventaId ? (
                                                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                                                                    🧾 Facturado
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-md border border-amber-200">
                                                                    ⏳ Sin Facturar
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge className={`text-[10px] font-black ${
                                                        esArmado ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                        esEntregado ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                        'bg-rose-100 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {p.estado}
                                                    </Badge>
                                                </div>

                                                {/* DIRECCIÓN Y TELÉFONO CON ACCIONES DIRECTAS */}
                                                <div className="space-y-2 text-xs">
                                                    {p.cliente?.direccion && (
                                                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl">
                                                            <span className="text-slate-700 font-medium truncate pr-2 flex items-center gap-1.5">
                                                                <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                                                                {p.cliente.direccion}
                                                            </span>
                                                            <a
                                                                href={`https://maps.google.com/?q=${encodeURIComponent(p.cliente.direccion)}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs font-bold text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded-lg shrink-0 shadow-sm"
                                                            >
                                                                Ver Mapa
                                                            </a>
                                                        </div>
                                                    )}

                                                    {p.cliente?.telefono && (
                                                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl">
                                                            <span className="text-slate-700 font-medium flex items-center gap-1.5">
                                                                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                                                                {p.cliente.telefono}
                                                            </span>
                                                            <a
                                                                href={`tel:${p.cliente.telefono}`}
                                                                className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg shrink-0 shadow-sm"
                                                            >
                                                                Llamar
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* NOTAS DEL PEDIDO SI EXISTEN */}
                                                {p.notas && (
                                                    <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-900 font-medium">
                                                        <span className="font-bold">📝 Notas:</span> {p.notas}
                                                    </div>
                                                )}

                                                {/* RESUMEN ARTÍCULOS Y TOTAL */}
                                                <div className="flex justify-between items-center pt-2">
                                                    <span className="text-xs text-slate-500">
                                                        {p.detalles?.length || 0} artículos
                                                    </span>
                                                    <span className="font-black text-lg text-slate-900">
                                                        ${p.total.toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* MOTIVO SI NO ENTREGADO */}
                                                {esNoEntregado && p.motivo_no_entrega && (
                                                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 font-medium">
                                                        <strong>Incidencia:</strong> {p.motivo_no_entrega}
                                                    </div>
                                                )}

                                                {/* BOTONERA ACCIONES REPARTIDOR */}
                                                {esArmado && (
                                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                                        <Button
                                                            onClick={() => handleMarcarEntregado(p.id)}
                                                            className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm text-xs"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Entregado
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setModalNoEntrega(p);
                                                                setMotivoNoEntrega("");
                                                            }}
                                                            className="h-12 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-2xl text-xs"
                                                        >
                                                            <Ban className="h-4 w-4 mr-1" /> No Entregado
                                                        </Button>
                                                    </div>
                                                )}

                                                {esNoEntregado && (
                                                    <Button
                                                        onClick={() => handleMarcarEntregado(p.id)}
                                                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Reintentar y Entregar
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                            {pedidosReparto.length === 0 && (
                                <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed">
                                    <Truck className="h-10 w-10 mx-auto mb-2 text-indigo-400 opacity-50" />
                                    <p className="font-bold">No hay pedidos asignados para reparto hoy.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA 4: HISTORIAL */}
                    {tabActiva === 'HISTORIAL' && (
                        <div className="animate-in fade-in duration-300 pb-24">
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-4 h-5 w-5 text-zinc-400" />
                                <Input placeholder="Buscar cliente en historial..." className="pl-12 h-14 bg-white border-zinc-200 rounded-2xl text-base shadow-sm" value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)} />
                            </div>

                            <div className="space-y-4">
                                {pedidosHistorial.filter(p => p.cliente?.nombre_razon_social.toLowerCase().includes(filtroHistorial.toLowerCase())).map(pedido => (
                                    <Card key={pedido.id} className="border-0 shadow-sm rounded-3xl overflow-hidden">
                                        <CardContent className="p-5 bg-white">
                                            <div className="flex justify-between items-start border-b border-zinc-100 pb-3 mb-3">
                                                <div>
                                                    <p className="font-black text-sm text-zinc-900 leading-tight mb-1">{pedido.cliente?.nombre_razon_social}</p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Pedido #{pedido.numero} • {new Date(pedido.fecha).toLocaleDateString()}</p>
                                                        {pedido.ventaId ? (
                                                            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                                                                🧾 Facturado
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-md border border-amber-200">
                                                                ⏳ Sin Facturar
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                                    pedido.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                                                    pedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-600' :
                                                    pedido.estado === 'ARMADO' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {pedido.estado}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-xs text-zinc-500 font-medium">{pedido.detalles?.length || 0} artículos</p>
                                                <p className="font-black text-lg text-indigo-950">${pedido.total.toFixed(2)}</p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setPedidoVer(pedido)} className="flex-1 h-10 rounded-xl border-indigo-200 text-indigo-600 font-bold bg-indigo-50"><Eye className="w-4 h-4 mr-2" /> Ver Detalles</Button>
                                                {(pedido.estado === 'PENDIENTE' || pedido.estado === 'APROBADO') && (
                                                    <Button size="sm" onClick={() => handleMarcarListoEntrega(pedido)} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3">
                                                        <Truck className="w-4 h-4 mr-1.5" /> Listo Entrega
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VISTA 5: COBRANZAS */}
                    {tabActiva === 'COBRANZAS' && (
                        <div className="animate-in fade-in duration-300 pb-24">
                            {!clienteCobranza ? (
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 mb-4">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center"><User className="w-3 h-3 mr-1" /> Búsqueda de Cliente</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-300" />
                                        <Input placeholder="Nombre o CUIT..." className="pl-10 h-14 bg-zinc-50 border-zinc-100 rounded-2xl text-base" value={queryCliente} onChange={(e) => setQueryCliente(e.target.value)} />
                                    </div>
                                    
                                    {queryCliente === "" && deudoresList.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Clientes con Deuda</p>
                                            <div className="border rounded-2xl divide-y bg-white shadow-sm border-zinc-100">
                                                {deudoresList.map(c => (
                                                    <div key={c.id} className="p-4 flex justify-between items-center active:bg-indigo-50" onClick={() => handleSeleccionarClienteCobranza({ id: c.id, nombre_razon_social: c.nombre })}>
                                                        <div>
                                                            <span className="font-bold text-zinc-800 block">{c.nombre}</span>
                                                            <span className="text-xs font-bold text-red-500 mt-0.5 block">Deuda: ${c.total_deuda.toFixed(2)}</span>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {queryCliente !== "" && clientesRes.length > 0 && (
                                        <div className="mt-3 border rounded-2xl divide-y bg-white shadow-xl max-h-64 overflow-y-auto border-zinc-100">
                                            {clientesRes.map(c => (
                                                <div key={c.id} className="p-4 flex justify-between items-center active:bg-indigo-50" onClick={() => handleSeleccionarClienteCobranza(c)}>
                                                    <span className="font-bold text-zinc-800">{c.nombre_razon_social}</span>
                                                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div className="bg-indigo-600 p-5 rounded-3xl shadow-lg mb-4 text-white relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="max-w-[70%]">
                                                <p className="font-black text-xl leading-none mb-1 truncate">{clienteCobranza.nombre_razon_social}</p>
                                                <p className="text-sm font-medium text-white/80">Deuda Total: <span className="font-black">${facturasPendientes.reduce((a, b) => a + b.saldo_pendiente, 0).toFixed(2)}</span></p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setClienteCobranza(null)} className="text-white hover:bg-white/20 h-8 rounded-xl px-3 text-xs font-bold border border-white/30">Cambiar</Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h3 className="font-black text-zinc-800 text-lg mb-2">Facturas Pendientes</h3>
                                        {facturasPendientes.length === 0 ? (
                                            <div className="text-center py-8 text-zinc-400 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                                                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
                                                <p className="font-bold">El cliente no tiene deuda.</p>
                                            </div>
                                        ) : (
                                            facturasPendientes.map((fac) => (
                                                <Card key={fac.id} className="border-0 shadow-sm rounded-3xl overflow-hidden">
                                                    <CardContent className="p-5 bg-white flex justify-between items-center">
                                                        <div>
                                                            <p className="font-bold text-sm text-zinc-800 leading-tight">Fac #{fac.numero_comprobante}</p>
                                                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">{new Date(fac.fecha_emision).toLocaleDateString()}</p>
                                                            <p className="font-black text-lg text-red-500 mt-1">${fac.saldo_pendiente.toFixed(2)}</p>
                                                        </div>
                                                        <Button onClick={() => {
                                                            setFacturaSeleccionada(fac);
                                                            setMontoCobro(fac.saldo_pendiente.toString());
                                                            setMetodoCobro("CONTADO");
                                                        }} className="bg-emerald-500 hover:bg-emerald-600 font-bold shadow-md rounded-xl h-10 px-6">
                                                            Cobrar
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* NAVBAR INFERIOR CON TODAS LAS VISTAS */}
            {!vistaRemito && !catalogoAbierto && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe z-40 flex">
                    <button onClick={() => setTabActiva('NUEVO')} className={`flex-1 flex flex-col items-center py-2.5 ${tabActiva === 'NUEVO' ? 'text-indigo-600 font-black' : 'text-zinc-400'}`}>
                        <Plus className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] uppercase tracking-wider">Nuevo</span>
                    </button>
                    <button onClick={() => setTabActiva('COMBOS')} className={`flex-1 flex flex-col items-center py-2.5 ${tabActiva === 'COMBOS' ? 'text-amber-600 font-black' : 'text-zinc-400'}`}>
                        <Sparkles className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] uppercase tracking-wider">Combos</span>
                    </button>
                    <button onClick={() => setTabActiva('REPARTOS')} className={`flex-1 flex flex-col items-center py-2.5 ${tabActiva === 'REPARTOS' ? 'text-indigo-600 font-black' : 'text-zinc-400'}`}>
                        <Truck className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] uppercase tracking-wider">Repartos</span>
                    </button>
                    <button onClick={() => setTabActiva('HISTORIAL')} className={`flex-1 flex flex-col items-center py-2.5 ${tabActiva === 'HISTORIAL' ? 'text-indigo-600 font-black' : 'text-zinc-400'}`}>
                        <History className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] uppercase tracking-wider">Pedidos</span>
                    </button>
                    {puedeCobrar && (
                        <button onClick={() => setTabActiva('COBRANZAS')} className={`flex-1 flex flex-col items-center py-2.5 ${tabActiva === 'COBRANZAS' ? 'text-indigo-600 font-black' : 'text-zinc-400'}`}>
                            <Bookmark className="w-5 h-5 mb-0.5" />
                            <span className="text-[9px] uppercase tracking-wider">Cobranzas</span>
                        </button>
                    )}
                </div>
            )}

            {/* DRAWER CATÁLOGO COMPLETO */}
            {catalogoAbierto && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
                    <div className="bg-white p-5 border-b border-zinc-100 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-black text-2xl text-zinc-900">Catálogo de Productos</h2>
                            <Button variant="ghost" size="icon" onClick={() => setCatalogoAbierto(false)} className="bg-zinc-100 rounded-2xl h-10 w-10"><X className="h-5 w-5" /></Button>
                        </div>
                        <div className="relative mb-3">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-zinc-300" />
                            <Input placeholder="Buscar por nombre o código..." className="pl-12 h-12 bg-zinc-50 border-transparent rounded-2xl text-base font-medium" value={queryCatalogo} onChange={(e) => setQueryCatalogo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <Tag className="absolute left-3 top-3 h-3.5 w-3.5 text-indigo-600 pointer-events-none" />
                                <select
                                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-indigo-50 border border-indigo-200 text-[12px] font-extrabold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                    value={selectedListaId}
                                    onChange={(e) => handleCambiarListaPrecio(Number(e.target.value))}
                                >
                                    {listas.map((l: any) => (
                                        <option key={l.id} value={l.id}>
                                            🏷️ {l.nombre} (Margen: {l.margen_defecto}%)
                                        </option>
                                    ))}
                                </select>
                                <ChevronRight className="w-4 h-4 text-indigo-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative"><Bookmark className="absolute left-3 top-3 h-3 w-3 text-indigo-400" /><select className="w-full h-9 pl-8 rounded-xl bg-zinc-50 text-[11px] font-bold outline-none" value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}><option value="TODAS">TODAS LAS MARCAS</option>{marcas.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}</select></div>
                                <div className="relative"><Tag className="absolute left-3 top-3 h-3 w-3 text-indigo-400" /><select className="w-full h-9 pl-8 rounded-xl bg-zinc-50 text-[11px] font-bold outline-none" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}><option value="TODAS">CATEGORÍAS</option>{categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 space-y-3">
                        {productosCatalogo.map(p => {
                            const itemEnCarrito = obtenerItemCarrito(p.id);
                            const precioBase = calcularPrecioBase(p, selectedListaId);
                            const precioMostrar = itemEnCarrito ? itemEnCarrito.precio_final : precioBase;
                            const tieneStock = p.stock_actual > 0;

                            return (
                                <Card key={p.id} className={`border-0 rounded-3xl shadow-sm ${!tieneStock && 'opacity-60'}`}>
                                    <CardContent className="p-4 flex flex-col space-y-3">
                                        <div className="flex gap-3 items-start">
                                            {/* THUMBNAIL FOTO */}
                                            {p.imagen_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setFotoZoom({ url: p.imagen_url, nombre: p.nombre_producto })}
                                                    className="h-16 w-16 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm relative group"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={p.imagen_url} alt={p.nombre_producto} className="h-full w-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                                        <Eye className="h-4 w-4 text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                                                    <ImageIcon className="h-6 w-6" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-zinc-900 leading-tight mb-1 truncate">{p.nombre_producto}</p>
                                                <p className="text-[10px] text-zinc-400 font-mono">{p.codigo_articulo}</p>
                                                <div className="flex gap-1.5 mt-1">
                                                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">{p.marca?.nombre || 'S/M'}</span>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${tieneStock ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>STOCK: {p.stock_actual}</span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className={`font-black text-lg ${itemEnCarrito?.descuento_individual > 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>${precioMostrar.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-5 gap-2 items-center pt-1 border-t border-slate-100">
                                            <div className="col-span-3 flex items-center justify-between bg-zinc-100 rounded-2xl p-1 h-11">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400" disabled={!tieneStock} onClick={() => ajustarCantidadProducto(p, -1)}><Minus className="h-4 w-4" /></Button>
                                                <span className="font-black text-zinc-900 text-base">{itemEnCarrito?.cantidad || 0}</span>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400" disabled={!tieneStock} onClick={() => ajustarCantidadProducto(p, 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <div className="col-span-2 relative">
                                                <Percent className="absolute left-2 top-3.5 h-3 w-3 text-indigo-300" />
                                                <Input type="number" placeholder="Dto %" className="pl-6 h-11 bg-white border-zinc-100 rounded-2xl font-bold text-indigo-600 text-xs text-center" value={itemEnCarrito?.descuento_individual || ""} onChange={(e) => cambiarDescuento(p.id, Number(e.target.value))} disabled={!itemEnCarrito} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t bg-white pb-safe">
                        <Button onClick={() => setCatalogoAbierto(false)} className="w-full h-14 bg-zinc-900 text-white font-black rounded-2xl text-base shadow-xl">
                            CERRAR CATÁLOGO ({carrito.reduce((acc, i) => acc + i.cantidad, 0)} items)
                        </Button>
                    </div>
                </div>
            )}

            {/* MODAL FOTO ZOOM */}
            {fotoZoom && (
                <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <p className="font-bold text-sm text-slate-800 truncate pr-4">{fotoZoom.nombre}</p>
                            <Button variant="ghost" size="icon" onClick={() => setFotoZoom(null)} className="h-8 w-8 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-slate-100 min-h-[220px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={fotoZoom.url} alt={fotoZoom.nombre} className="max-h-[60vh] w-auto object-contain rounded-xl shadow-sm" />
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NO ENTREGA */}
            {modalNoEntrega && (
                <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <Card className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="bg-rose-600 p-5 text-white flex justify-between items-center">
                            <h3 className="font-black text-lg flex items-center gap-1.5">
                                <Ban className="h-5 w-5" /> No Entrega
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setModalNoEntrega(null)} className="text-white hover:bg-white/20 rounded-full h-8 w-8">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-5 space-y-4 bg-white">
                            <p className="text-xs text-slate-600">
                                Pedido <strong>#{modalNoEntrega.numero}</strong> para <strong>{modalNoEntrega.cliente?.nombre_razon_social}</strong>
                            </p>

                            {/* CHIPS RÁPIDOS DE MOTIVO */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Motivos Rápidos:</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {["Cliente ausente", "Local cerrado", "Dirección incorrecta", "Rechazó mercadería", "Reprogramado"].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMotivoNoEntrega(m)}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-colors ${
                                                motivoNoEntrega === m ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Detalle / Observación</label>
                                <textarea
                                    rows={2}
                                    value={motivoNoEntrega}
                                    onChange={(e) => setMotivoNoEntrega(e.target.value)}
                                    placeholder="Escribí más detalles..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" onClick={() => setModalNoEntrega(null)} className="w-1/3 rounded-xl">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleConfirmarNoEntrega}
                                    disabled={isPending || !motivoNoEntrega.trim()}
                                    className="w-2/3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                                >
                                    Confirmar No Entrega
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* DRAWER REMITO (FORZADO CTA CTE) */}
            {vistaRemito && (
                <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col p-4 pt-safe animate-in zoom-in-95 duration-300">
                    <div className="flex-1 bg-white rounded-3xl p-6 overflow-y-auto relative shadow-2xl">
                        <Button variant="ghost" size="icon" onClick={() => setVistaRemito(false)} className="absolute top-4 right-4 bg-zinc-100 rounded-full h-10 w-10 text-zinc-500"><X className="h-5 w-5" /></Button>

                        <div className="text-center border-b border-dashed border-zinc-300 pb-5 mb-5 mt-2">
                            <h2 className="font-black text-2xl text-zinc-900 tracking-tight">PEDIDO DE VENTA</h2>
                            <p className="text-xs font-bold text-zinc-400 uppercase mt-2">{cliente?.nombre_razon_social}</p>
                            <p className="text-[10px] text-zinc-400">CUIT: {cliente?.dni_cuit || 'S/D'}</p>
                            <div className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-indigo-700 font-extrabold text-xs">
                                <Tag className="w-3.5 h-3.5" />
                                {listas.find(l => l.id === selectedListaId)?.nombre || `Lista #${selectedListaId}`}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {carrito.map((item, i) => (
                                <div key={i} className="flex justify-between items-start">
                                    <div className="max-w-[70%]">
                                        <p className="font-bold text-xs text-zinc-800 leading-tight">
                                            {item.cantidad}x {item.nombre}
                                        </p>
                                        {item.combo_nombre && (
                                            <span className="inline-block mt-0.5 text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                                📦 Combo: {item.combo_nombre}
                                            </span>
                                        )}
                                        {item.descuento_individual > 0 && <p className="text-[9px] font-black text-emerald-600">Dto: {item.descuento_individual}%</p>}
                                    </div>
                                    <p className="font-black text-sm text-zinc-900">${item.subtotal.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        {/* FECHA DE ENTREGA PROGRAMADA */}
                        <div className="space-y-2 mb-4 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
                            <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-600" /> Fecha de Entrega Estimada
                            </label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="date"
                                    value={fechaEntregaProg}
                                    onChange={(e) => setFechaEntregaProg(e.target.value)}
                                    className="h-11 bg-white border-indigo-200 rounded-xl font-bold text-sm text-indigo-950"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFechaEntregaProg(new Date().toISOString().split('T')[0])}
                                    className="h-11 text-xs font-bold bg-white text-indigo-600 border-indigo-200 rounded-xl shrink-0"
                                >
                                    Hoy
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const m = new Date();
                                        m.setDate(m.getDate() + 1);
                                        setFechaEntregaProg(m.toISOString().split('T')[0]);
                                    }}
                                    className="h-11 text-xs font-bold bg-white text-indigo-600 border-indigo-200 rounded-xl shrink-0"
                                >
                                    Mañana
                                </Button>
                            </div>
                        </div>

                        {/* CUADRO DE NOTAS / DETALLES EN REVISIÓN */}
                        <div className="space-y-1.5 mb-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                                📝 Notas e Instrucciones para Despacho / Administración
                            </label>
                            <textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Ej: Entregar por la mañana, timbre 2B, recibir comprobante..."
                                rows={3}
                                className="w-full p-3 border border-zinc-200 rounded-2xl bg-zinc-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="border-t border-dashed border-zinc-300 pt-4 mb-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-black text-zinc-400">TOTAL A COBRAR</span>
                                <span className="font-black text-2xl text-indigo-600">${total.toFixed(2)}</span>
                            </div>

                            {/* INDICADOR DE PAGO FORZADO */}
                            <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 text-center">
                                <Badge className="bg-indigo-600 text-white mb-1 px-3 py-0.5 text-xs">PAGO: CUENTA CORRIENTE</Badge>
                                <p className="text-[10px] text-indigo-700 font-bold leading-tight">
                                    El pedido se cargará automáticamente al saldo del cliente en el ERP principal.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 shrink-0">
                        <Button onClick={confirmarPedido} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 rounded-2xl font-black text-lg text-white">
                            <CheckCircle2 className="mr-2 h-6 w-6" /> CONFIRMAR Y ENVIAR
                        </Button>
                    </div>
                </div>
            )}

            {/* DRAWER VER PEDIDO */}
            {pedidoVer && (
                <div className="fixed inset-0 z-[60] bg-zinc-900 flex flex-col p-4 pt-safe animate-in zoom-in-95 duration-300">
                    <div className="flex-1 bg-white rounded-3xl p-6 overflow-y-auto relative shadow-2xl">
                        <Button variant="ghost" size="icon" onClick={() => setPedidoVer(null)} className="absolute top-4 right-4 bg-zinc-100 rounded-full h-10 w-10 text-zinc-500"><X className="h-5 w-5" /></Button>

                        <div className="text-center border-b border-dashed border-zinc-300 pb-5 mb-5 mt-2">
                            <h2 className="font-black text-2xl text-zinc-900 tracking-tight">PEDIDO #{pedidoVer.numero}</h2>
                            <p className="text-xs font-bold text-zinc-400 uppercase mt-2">{pedidoVer.cliente?.nombre_razon_social}</p>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                <div className={`text-[10px] font-black px-2 py-1 rounded-lg inline-block ${
                                    pedidoVer.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                                    pedidoVer.estado === 'CANCELADO' ? 'bg-red-100 text-red-600' :
                                    pedidoVer.estado === 'ARMADO' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-emerald-100 text-emerald-700'
                                }`}>
                                    {pedidoVer.estado}
                                </div>
                                {pedidoVer.ventaId ? (
                                    <div className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg">
                                        🧾 Facturado (Venta #{pedidoVer.ventaId})
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg">
                                        ⏳ Sin Facturar
                                    </div>
                                )}
                                {pedidoVer.fecha_entrega && (
                                    <div className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                                        📅 Entrega: {new Date(pedidoVer.fecha_entrega).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {pedidoVer.detalles?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-start">
                                    <div className="max-w-[70%]">
                                        <p className="font-bold text-xs text-zinc-800 leading-tight">{item.cantidad}x {item.producto?.nombre_producto || 'Producto'}</p>
                                        {item.combo_nombre && (
                                            <span className="inline-block mt-0.5 text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                                📦 Combo: {item.combo_nombre}
                                            </span>
                                        )}
                                        {item.descuento_individual > 0 && <p className="text-[9px] font-black text-emerald-600">Dto: {item.descuento_individual}%</p>}
                                    </div>
                                    <p className="font-black text-sm text-zinc-900">${item.subtotal.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed border-zinc-300 pt-5 mb-6">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-black text-zinc-400">TOTAL</span>
                                <span className="font-black text-2xl text-indigo-600">${pedidoVer.total.toFixed(2)}</span>
                            </div>
                        </div>

                        {pedidoVer.notas && (
                            <div className="mt-4 bg-amber-50 p-3 rounded-xl border border-amber-100 italic text-xs text-amber-900">
                                <b>Notas:</b> &quot;{pedidoVer.notas}&quot;
                            </div>
                        )}
                    </div>

                    <div className="pt-4 shrink-0 space-y-2">
                        {(pedidoVer.estado === 'PENDIENTE' || pedidoVer.estado === 'APROBADO') && (
                            <>
                                <Button onClick={() => handleMarcarListoEntrega(pedidoVer)} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 rounded-2xl font-black text-white">
                                    <Truck className="w-5 h-5 mr-2" /> LISTO PARA ENTREGA
                                </Button>
                                <div className="flex gap-2">
                                    <Button onClick={() => { manejarAccionHistorial(pedidoVer, 'EDITAR'); setPedidoVer(null); }} className="flex-1 h-12 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-2xl font-bold"><Edit className="w-4 h-4 mr-1.5" /> Editar</Button>
                                    <Button onClick={() => { manejarAccionHistorial(pedidoVer, 'CANCELAR'); setPedidoVer(null); }} className="flex-1 h-12 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold"><Ban className="w-4 h-4 mr-1.5" /> Anular</Button>
                                </div>
                            </>
                        )}
                        <Button onClick={() => setPedidoVer(null)} className="w-full h-14 bg-zinc-800 hover:bg-zinc-900 shadow-xl shadow-zinc-800/20 rounded-2xl font-black text-white">
                            CERRAR
                        </Button>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO CLIENTE */}
            {modalCliente && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <Card className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <h3 className="font-black text-xl">Alta de Cliente</h3>
                            <Button variant="ghost" size="icon" onClick={() => setModalCliente(false)} className="text-white hover:bg-white/20 rounded-full"><X /></Button>
                        </div>
                        <form onSubmit={handleNuevoCliente} className="p-6 space-y-4 bg-white">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Nombre Completo</label>
                                <Input name="nombre" placeholder="Razón Social / Nombre" required className="h-12 rounded-xl bg-zinc-50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">CUIT / DNI (Opcional)</label>
                                <Input name="cuit" placeholder="Sin guiones" className="h-12 rounded-xl bg-zinc-50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Dirección (Opcional)</label>
                                <Input name="direccion" placeholder="Calle y número" className="h-12 rounded-xl bg-zinc-50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Teléfono</label>
                                <Input name="telefono" placeholder="WhatsApp / Local" className="h-12 rounded-xl bg-zinc-50" />
                            </div>
                            <Button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl mt-4 shadow-lg">
                                CREAR CLIENTE
                            </Button>
                        </form>
                    </Card>
                </div>
            )}

            {/* MODAL COBRANZA */}
            {facturaSeleccionada && (
                <div className="fixed inset-0 z-[60] bg-zinc-900 flex flex-col p-4 pt-safe animate-in zoom-in-95 duration-300">
                    <div className="flex-1 bg-white rounded-3xl p-6 overflow-y-auto relative shadow-2xl">
                        <Button variant="ghost" size="icon" onClick={() => setFacturaSeleccionada(null)} className="absolute top-4 right-4 bg-zinc-100 rounded-full h-10 w-10 text-zinc-500"><X className="h-5 w-5" /></Button>

                        <div className="text-center border-b border-dashed border-zinc-300 pb-5 mb-5 mt-2">
                            <h2 className="font-black text-2xl text-zinc-900 tracking-tight">REGISTRAR PAGO</h2>
                            <p className="text-xs font-bold text-zinc-400 uppercase mt-2">Fac #{facturaSeleccionada.numero_comprobante}</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Saldo Pendiente</label>
                                <p className="font-black text-xl text-red-500">${facturaSeleccionada.saldo_pendiente.toFixed(2)}</p>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Monto a Cobrar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-4 font-black text-xl text-zinc-400">$</span>
                                    <Input type="number" step="0.01" value={montoCobro} onChange={(e) => setMontoCobro(e.target.value)} className="pl-8 h-14 rounded-2xl text-xl font-black bg-zinc-50" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Método de Pago</label>
                                <select value={metodoCobro} onChange={(e) => setMetodoCobro(e.target.value)} className="w-full h-14 px-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-bold outline-none">
                                    <option value="CONTADO">Efectivo (Contado)</option>
                                    <option value="TARJETA">Tarjeta</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase">Notas Adicionales</label>
                                <Input value={notasCobro} onChange={(e) => setNotasCobro(e.target.value)} placeholder="Ej: Pago parcial..." className="h-12 rounded-2xl bg-zinc-50" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 shrink-0">
                        <Button disabled={procesandoCobro} onClick={handleProcesarCobro} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 rounded-2xl font-black text-lg text-white">
                            {procesandoCobro ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                            {procesandoCobro ? "PROCESANDO..." : "CONFIRMAR PAGO"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}