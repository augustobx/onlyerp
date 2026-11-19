"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
    Building2, Users, Edit, Trash2, Plus, Loader2, X, Phone, Mail, MapPin, TrendingUp, AlertTriangle, ArrowRight, Package, Tag, Percent
} from "lucide-react";

import { getProveedoresCompleto, guardarProveedor, guardarMarca, eliminarMarca, actualizarPreciosMasivos, guardarProveedorListaPrecio } from "@/app/actions/proveedores";
import { crearCategoria, actualizarCategoria, eliminarCategoria, getListasPrecioGlobales } from "@/app/actions/productos";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertaCambioCriticoModal, CambioDetalleItem } from "@/components/alerta-cambio-critico-modal";

export default function ProveedoresPage() {
    const [isPending, startTransition] = useTransition();
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [listasGlobales, setListasGlobales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabActiva, setTabActiva] = useState<"DIRECTORIO" | "AUMENTOS">("DIRECTORIO");

    // Modal de Proveedor
    const [showModal, setShowModal] = useState(false);
    const [provEditando, setProvEditando] = useState<any | null>(null);

    // Modal de Listas de Precios por Proveedor
    const [showListasModal, setShowListasModal] = useState(false);
    const [provListasEditando, setProvListasEditando] = useState<any | null>(null);
    const [formListasProv, setFormListasProv] = useState<Record<number, { margen: string; descuento: string }>>({});

    // Estado para gestión de Marcas
    const [showMarcaModal, setShowMarcaModal] = useState(false);
    const [marcaEditando, setMarcaEditando] = useState<any | null>(null);
    const [marcaProvId, setMarcaProvId] = useState<number>(0);

    // Estado para gestión de Categorías
    const [showCategoriaModal, setShowCategoriaModal] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState<any | null>(null);
    const [categoriaMarcaId, setCategoriaMarcaId] = useState<number>(0);

    // Estados para Actualización Masiva
    const [provSeleccionadoMasivo, setProvSeleccionadoMasivo] = useState<string>("");
    const [marcaSeleccionadaMasiva, setMarcaSeleccionadaMasiva] = useState<string>("");
    const [categoriaSeleccionadaMasiva, setCategoriaSeleccionadaMasiva] = useState<string>("");
    const [porcentajeMasivo, setPorcentajeMasivo] = useState<string>("");
    const [accionMasiva, setAccionMasiva] = useState<"AUMENTO" | "REBAJA">("AUMENTO");

    // Estado para Alerta de Cambio Crítico
    const [alertaCritica, setAlertaCritica] = useState<{
        open: boolean;
        tipo: "PRECIOS" | "MARCA" | "ELIMINAR";
        titulo: string;
        subtitulo: string;
        entidadAfectada: string;
        detalles: CambioDetalleItem[];
        advertencias: string[];
        textoConfirmar?: string;
        onConfirm: () => Promise<void> | void;
    }>({
        open: false,
        tipo: "PRECIOS",
        titulo: "",
        subtitulo: "",
        entidadAfectada: "",
        detalles: [],
        advertencias: [],
        onConfirm: () => {}
    });

    const cargarDatos = () => {
        startTransition(async () => {
            const [data, listas] = await Promise.all([
                getProveedoresCompleto(),
                getListasPrecioGlobales()
            ]);
            setProveedores(data);
            setListasGlobales(listas);
            setLoading(false);
        });
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleAbrirListas = (prov: any) => {
        setProvListasEditando(prov);
        const map: Record<number, { margen: string; descuento: string }> = {};
        listasGlobales.forEach(lg => {
            const pivot = prov.listas_precios?.find((lp: any) => lp.listaPrecioId === lg.id);
            map[lg.id] = {
                margen: pivot?.margen_personalizado !== null && pivot?.margen_personalizado !== undefined ? String(pivot.margen_personalizado) : "",
                descuento: pivot?.descuento_personalizado !== null && pivot?.descuento_personalizado !== undefined ? String(pivot.descuento_personalizado) : ""
            };
        });
        setFormListasProv(map);
        setShowListasModal(true);
    };

    const handleGuardarListasProveedor = async () => {
        if (!provListasEditando) return;
        startTransition(async () => {
            let errorCount = 0;
            for (const lg of listasGlobales) {
                const item = formListasProv[lg.id];
                const margenVal = item?.margen && item.margen.trim() !== "" ? Number(item.margen) : null;
                const descVal = item?.descuento && item.descuento.trim() !== "" ? Number(item.descuento) : null;
                const res = await guardarProveedorListaPrecio(provListasEditando.id, lg.id, margenVal, descVal);
                if (!res.success) errorCount++;
            }
            if (errorCount === 0) {
                toast.success("¡Reglas de listas actualizadas para este proveedor!");
                setShowListasModal(false);
                cargarDatos();
            } else {
                toast.error("Ocurrió un error al guardar algunas reglas.");
            }
        });
    };

    const handleAbrirModal = (prov: any = null) => {
        setProvEditando(prov);
        setShowModal(true);
    };

    const ejecutarGuardarProveedor = (formData: FormData) => {
        startTransition(async () => {
            const res = await guardarProveedor(formData);
            if (res.success) {
                toast.success("Proveedor guardado correctamente.");
                setShowModal(false);
                setAlertaCritica(prev => ({ ...prev, open: false }));
                cargarDatos();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleGuardarProveedor = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (provEditando) formData.append("id", String(provEditando.id));

        const nombre = (formData.get("nombre") as string) || "Proveedor";
        const nuevoPorcentaje = Number(formData.get("aumento_porcentaje") || 0);
        const prevPorcentaje = Number(provEditando?.aumento_porcentaje || 0);

        if (provEditando && prevPorcentaje !== nuevoPorcentaje) {
            const diff = nuevoPorcentaje - prevPorcentaje;
            setAlertaCritica({
                open: true,
                tipo: "PRECIOS",
                titulo: "¿Confirmar cambio en el porcentaje de este proveedor?",
                entidadAfectada: `Proveedor: "${nombre}"`,
                subtitulo: `Vas a modificar el porcentaje de aumento del proveedor "${nombre}". Se aplicará en cascada a todos los artículos asociados.`,
                detalles: [
                    {
                        etiqueta: "Aumento General del Proveedor",
                        anterior: `${prevPorcentaje}%`,
                        nuevo: `${nuevoPorcentaje}%`,
                        nota: `Variación de ${diff > 0 ? "+" : ""}${diff.toFixed(1)}% en cascada`,
                        destacado: true
                    }
                ],
                advertencias: [
                    "Se recalculará el precio de venta en cascada para todos los productos de este proveedor.",
                    "Afecta ventas presenciales en mostrador, pedidos preventistas y portal B2B."
                ],
                onConfirm: () => ejecutarGuardarProveedor(formData)
            });
            return;
        }

        ejecutarGuardarProveedor(formData);
    };

    // Marca CRUD handlers
    const ejecutarGuardarMarca = (formData: FormData) => {
        startTransition(async () => {
            const res = await guardarMarca(formData);
            if (res.success) {
                toast.success("Marca guardada.");
                setShowMarcaModal(false);
                setAlertaCritica(prev => ({ ...prev, open: false }));
                cargarDatos();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleGuardarMarca = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("proveedorId", String(marcaProvId));
        if (marcaEditando) formData.append("id", String(marcaEditando.id));

        const nombre = (formData.get("nombre") as string) || "Marca";
        const nuevoPorcentaje = Number(formData.get("aumento_porcentaje") || 0);
        const prevPorcentaje = Number(marcaEditando?.aumento_porcentaje || 0);
        const provPadre = proveedores.find(p => p.id === marcaProvId);

        // Si cambió el porcentaje de la marca, solicitar confirmación explícita
        if (marcaEditando && prevPorcentaje !== nuevoPorcentaje) {
            const diff = nuevoPorcentaje - prevPorcentaje;
            setAlertaCritica({
                open: true,
                tipo: "MARCA",
                titulo: "¿Confirmar cambio en el % de esta marca?",
                entidadAfectada: `Marca: "${nombre}" ${provPadre ? `(Proveedor: ${provPadre.nombre})` : ""}`,
                subtitulo: `Vas a cambiar el porcentaje de aumento de la marca "${nombre}". Este valor impactará de forma automática en el precio de venta de todos los productos vinculados a esta marca.`,
                detalles: [
                    {
                        etiqueta: "Porcentaje de Aumento de Marca",
                        anterior: `${prevPorcentaje}%`,
                        nuevo: `${nuevoPorcentaje}%`,
                        nota: `Variación de ${diff > 0 ? "+" : ""}${diff.toFixed(1)}% sobre los productos de la marca`,
                        destacado: true
                    }
                ],
                advertencias: [
                    "Todos los productos de esta marca recalcularán su precio de venta inmediatamente.",
                    "El cambio impacta en el mostrador de ventas, pedidos preventistas y catálogo B2B.",
                    "Se acumula con el aumento propio del proveedor y categoría si corresponden."
                ],
                onConfirm: () => ejecutarGuardarMarca(formData)
            });
            return;
        }

        ejecutarGuardarMarca(formData);
    };

    const handleEliminarMarca = (id: number, nombreMarca?: string) => {
        setAlertaCritica({
            open: true,
            tipo: "ELIMINAR",
            titulo: "¿Eliminar marca?",
            entidadAfectada: nombreMarca ? `Marca: "${nombreMarca}"` : "Marca seleccionada",
            subtitulo: "Estás a punto de borrar esta marca del catálogo.",
            detalles: [{ etiqueta: "Marca a Eliminar", nuevo: nombreMarca || `#${id}`, destacado: true }],
            advertencias: [
                "Los productos que pertenezcan a esta marca no podrán ser eliminados si tienen movimientos.",
                "Esta acción es irreversible."
            ],
            onConfirm: () => {
                startTransition(async () => {
                    const res = await eliminarMarca(id);
                    if (res.success) {
                        toast.success("Marca eliminada.");
                        setAlertaCritica(prev => ({ ...prev, open: false }));
                        cargarDatos();
                    } else {
                        toast.error(res.error);
                    }
                });
            }
        });
    };

    // Categoria CRUD handlers inside Proveedor UI
    const ejecutarGuardarCategoria = (nombre: string, aumento_porcentaje: number) => {
        startTransition(async () => {
            let res;
            if (categoriaEditando) {
                res = await actualizarCategoria(categoriaEditando.id, nombre, categoriaMarcaId, aumento_porcentaje);
            } else {
                res = await crearCategoria(nombre, categoriaMarcaId, aumento_porcentaje);
            }

            if (res.success) {
                toast.success("Categoría guardada.");
                setShowCategoriaModal(false);
                setAlertaCritica(prev => ({ ...prev, open: false }));
                cargarDatos();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleGuardarCategoria = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const nombre = formData.get("nombre") as string;
        const aumento_porcentaje = Number(formData.get("aumento_porcentaje") || 0);
        const prevPorcentaje = Number(categoriaEditando?.aumento_porcentaje || 0);

        if (categoriaEditando && prevPorcentaje !== aumento_porcentaje) {
            const diff = aumento_porcentaje - prevPorcentaje;
            setAlertaCritica({
                open: true,
                tipo: "PRECIOS",
                titulo: "¿Confirmar cambio en el % de esta categoría?",
                entidadAfectada: `Categoría: "${nombre}"`,
                subtitulo: `Vas a modificar el porcentaje de aumento de la categoría "${nombre}".`,
                detalles: [
                    {
                        etiqueta: "Aumento Propio de Categoría",
                        anterior: `${prevPorcentaje}%`,
                        nuevo: `${aumento_porcentaje}%`,
                        nota: `Variación de ${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
                        destacado: true
                    }
                ],
                advertencias: [
                    "Se recalculará el precio de venta de todos los productos pertenecientes a esta categoría."
                ],
                onConfirm: () => ejecutarGuardarCategoria(nombre, aumento_porcentaje)
            });
            return;
        }

        ejecutarGuardarCategoria(nombre, aumento_porcentaje);
    };

    const handleEliminarCategoria = (id: number, nombreCat?: string) => {
        setAlertaCritica({
            open: true,
            tipo: "ELIMINAR",
            titulo: "¿Eliminar categoría?",
            entidadAfectada: nombreCat ? `Categoría: "${nombreCat}"` : "Categoría seleccionada",
            subtitulo: "Estás a punto de borrar esta categoría del catálogo.",
            detalles: [{ etiqueta: "Categoría a Eliminar", nuevo: nombreCat || `#${id}`, destacado: true }],
            advertencias: [
                "Los productos vinculados a esta categoría deberán ser reasignados.",
                "Esta acción es irreversible."
            ],
            onConfirm: () => {
                startTransition(async () => {
                    const res = await eliminarCategoria(id);
                    if (res.success) {
                        toast.success("Categoría eliminada.");
                        setAlertaCritica(prev => ({ ...prev, open: false }));
                        cargarDatos();
                    } else {
                        toast.error(res.error);
                    }
                });
            }
        });
    };

    // Cascading mass update data
    const provMasivo = proveedores.find(p => String(p.id) === provSeleccionadoMasivo);
    const marcasMasivo = provMasivo?.marcas || [];
    const marcaMasiva = marcasMasivo.find((m: any) => String(m.id) === marcaSeleccionadaMasiva);
    const categoriasMasivo = marcaMasiva?.categorias || [];

    const handleAplicarMasivo = () => {
        if (!provSeleccionadoMasivo) return toast.error("Debe seleccionar un proveedor.");
        if (!porcentajeMasivo || Number(porcentajeMasivo) <= 0) return toast.error("Ingrese un porcentaje válido.");

        const provNombre = provMasivo?.nombre || "Proveedor seleccionado";
        const txtAccion = accionMasiva === "AUMENTO" ? "AUMENTAR" : "REBAJAR";
        const marcaNombre = marcaMasiva?.nombre;
        const catNombre = categoriasMasivo.find((c: any) => String(c.id) === categoriaSeleccionadaMasiva)?.nombre;

        const detalles: CambioDetalleItem[] = [
            {
                etiqueta: "Proveedor Afectado",
                nuevo: provNombre,
                destacado: true
            }
        ];

        if (marcaNombre) {
            detalles.push({
                etiqueta: "Filtro por Marca",
                nuevo: marcaNombre
            });
        }

        if (catNombre) {
            detalles.push({
                etiqueta: "Filtro por Categoría",
                nuevo: catNombre
            });
        }

        detalles.push({
            etiqueta: "Operación sobre Costo Base",
            nuevo: `${accionMasiva === "AUMENTO" ? "+" : "-"}${porcentajeMasivo}% (${txtAccion})`,
            destacado: true
        });

        setAlertaCritica({
            open: true,
            tipo: "PRECIOS",
            titulo: `¿Confirmar ${txtAccion.toLowerCase()} masivo de precios?`,
            entidadAfectada: `Proveedor: ${provNombre} ${marcaNombre ? `· Marca: ${marcaNombre}` : ""}`,
            subtitulo: `Vas a ${txtAccion.toLowerCase()} un ${porcentajeMasivo}% el costo base de los productos seleccionados de ${provNombre}. Esto recalculará de inmediato los precios de venta de mostrador y pedidos.`,
            detalles,
            advertencias: [
                "Los precios de costo se actualizarán de forma inmediata en la base de datos.",
                "Todas las listas de precios calculadas sobre el costo base se actualizarán al instante.",
                "Los cambios quedarán auditados en el historial de precios y kardex."
            ],
            textoConfirmar: `Confirmar ${txtAccion} de ${porcentajeMasivo}%`,
            onConfirm: () => {
                startTransition(async () => {
                    const res = await actualizarPreciosMasivos(
                        Number(provSeleccionadoMasivo),
                        Number(porcentajeMasivo),
                        accionMasiva,
                        marcaSeleccionadaMasiva ? Number(marcaSeleccionadaMasiva) : undefined,
                        categoriaSeleccionadaMasiva ? Number(categoriaSeleccionadaMasiva) : undefined
                    );
                    if (res.success) {
                        toast.success(`¡Actualización completada!`, { description: `Se modificaron ${res.count} productos.` });
                        setPorcentajeMasivo("");
                        setProvSeleccionadoMasivo("");
                        setMarcaSeleccionadaMasiva("");
                        setCategoriaSeleccionadaMasiva("");
                        setAlertaCritica(prev => ({ ...prev, open: false }));
                    } else {
                        toast.error(res.error);
                    }
                });
            }
        });
    };

    if (loading) return <div className="flex justify-center mt-32"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <div className="flex flex-col gap-6 max-w-[1200px] mx-auto min-h-[calc(100vh-6rem)] pb-12">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                        <Building2 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Proveedores y Marcas</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Agenda comercial y control masivo de costos.</p>
                    </div>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-800 pb-px">
                <Button variant="ghost" onClick={() => setTabActiva("DIRECTORIO")} className={`rounded-none border-b-2 px-6 ${tabActiva === "DIRECTORIO" ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                    <Users className="h-4 w-4 mr-2" /> Directorio
                </Button>
                <Button variant="ghost" onClick={() => setTabActiva("AUMENTOS")} className={`rounded-none border-b-2 px-6 ${tabActiva === "AUMENTOS" ? 'border-red-600 text-red-600 font-bold bg-red-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                    <TrendingUp className="h-4 w-4 mr-2" /> Actualización Masiva
                </Button>
            </div>

            {/* =========================================================
          PANTALLA 1: DIRECTORIO DE PROVEEDORES
          ========================================================= */}
            {tabActiva === "DIRECTORIO" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-end">
                        <Button onClick={() => handleAbrirModal(null)} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
                            <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {proveedores.map(p => (
                            <Card key={p.id} className="shadow-sm border-slate-200 bg-white hover:border-indigo-200 transition-colors">
                                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base text-slate-900">{p.nombre}</CardTitle>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">CUIT: {p.cuit || "No registrado"}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleAbrirModal(p)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 -mt-2 -mr-2"><Edit className="h-4 w-4" /></Button>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3">
                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center text-xs text-slate-600"><Phone className="h-3.5 w-3.5 mr-2 text-slate-400" /> {p.telefono || "-"}</div>
                                        <div className="flex items-center text-xs text-slate-600"><Mail className="h-3.5 w-3.5 mr-2 text-slate-400" /> {p.email || "-"}</div>
                                        <div className="flex items-center text-xs text-slate-600 truncate"><MapPin className="h-3.5 w-3.5 mr-2 text-slate-400 shrink-0" /> {p.direccion || "-"}</div>
                                    </div>

                                    {/* Aumento del Proveedor */}
                                    {p.aumento_porcentaje > 0 && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Percent className="h-3.5 w-3.5 text-orange-500" />
                                            <Badge variant="outline" className="text-[10px] font-bold border-orange-200 text-orange-600 bg-orange-50">Aumento: +{p.aumento_porcentaje}%</Badge>
                                        </div>
                                    )}

                                    {/* Marcas del Proveedor */}
                                    {p.marcas && p.marcas.length > 0 && (
                                        <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1"><Tag className="h-3 w-3" /> Marcas</p>
                                            {p.marcas.map((m: any) => (
                                                <div key={m.id} className="bg-slate-50 rounded-md px-2 py-1 flex flex-col">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-xs font-semibold text-slate-700">{m.nombre}</span>
                                                            {m.aumento_porcentaje > 0 && <span className="text-[9px] text-purple-600 ml-1 font-bold">+{m.aumento_porcentaje}%</span>}
                                                            <span className="text-[9px] text-slate-400 ml-1">({m._count?.productos || 0} prod.)</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-indigo-600" onClick={() => { setMarcaEditando(m); setMarcaProvId(p.id); setShowMarcaModal(true); }}><Edit className="h-3 w-3" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-red-600" onClick={() => handleEliminarMarca(m.id)}><Trash2 className="h-3 w-3" /></Button>
                                                        </div>
                                                    </div>

                                                    {/* Mostrar Categorías */}
                                                    {m.categorias && m.categorias.length > 0 && (
                                                        <div className="pl-3 mt-1.5 border-l-2 border-slate-200 mb-1 space-y-0.5">
                                                            {m.categorias.map((c: any) => (
                                                                <div key={c.id} className="flex items-center justify-between group">
                                                                    <div>
                                                                        <span className="text-[10px] font-medium text-slate-500">{c.nombre}</span>
                                                                        {c.aumento_porcentaje > 0 && <span className="text-[9px] text-indigo-600 ml-1 font-bold">+{c.aumento_porcentaje}%</span>}
                                                                        <span className="text-[9px] text-slate-400 ml-1">({c._count?.productos || 0} pr)</span>
                                                                    </div>
                                                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="icon" className="h-4 w-4 text-slate-400 hover:text-indigo-600" onClick={() => { setCategoriaEditando(c); setCategoriaMarcaId(m.id); setShowCategoriaModal(true); }}><Edit className="h-3 w-3" /></Button>
                                                                        <Button variant="ghost" size="icon" className="h-4 w-4 text-slate-400 hover:text-red-600" onClick={() => handleEliminarCategoria(c.id)}><Trash2 className="h-3 w-3" /></Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-start mt-0.5">
                                                        <Button variant="ghost" size="sm" className="text-[9px] h-4 p-0 text-indigo-500 hover:text-indigo-700 hover:bg-transparent" onClick={() => { setCategoriaEditando(null); setCategoriaMarcaId(m.id); setShowCategoriaModal(true); }}>
                                                            <Plus className="h-2 w-2 mr-0.5" /> Agregar Categoría
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> {p._count.productos} productos</span>
                                        <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600 hover:bg-indigo-50" onClick={() => { setMarcaEditando(null); setMarcaProvId(p.id); setShowMarcaModal(true); }}>
                                            <Plus className="h-3 w-3 mr-1" /> Marca
                                        </Button>
                                    </div>

                                    <div className="pt-2">
                                        <Button variant="outline" size="sm" className="w-full text-xs font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 border-indigo-200 h-8" onClick={() => handleAbrirListas(p)}>
                                            <Tag className="h-3.5 w-3.5 mr-1.5 text-indigo-600" /> Tarifarios y Descuentos ({p.listas_precios?.length || 0})
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {proveedores.length === 0 && (
                            <div className="col-span-full p-10 text-center text-slate-500 bg-white border border-dashed rounded-xl">No hay proveedores registrados.</div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================================
          PANTALLA 2: ACTUALIZACIÓN MASIVA (INFLACIÓN)
          ========================================================= */}
            {tabActiva === "AUMENTOS" && (
                <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card className="border-red-200 shadow-xl overflow-hidden">
                        <div className="bg-red-600 p-6 text-white flex gap-4 items-center">
                            <div className="bg-white/20 p-3 rounded-full shrink-0"><AlertTriangle className="h-8 w-8 text-white" /></div>
                            <div>
                                <h3 className="text-xl font-black">Actualización de Costos de Compra</h3>
                                <p className="text-red-100 text-sm mt-0.5 leading-snug">
                                    Esta herramienta modifica el <strong>COSTO DE COMPRA BASE (sin IVA)</strong> de los productos filtrados en la base de datos. 
                                    Los porcentajes de cascada propios (Proveedor/Marca/Categoría) <strong>no se alteran</strong>, se aplicarán luego por encima del nuevo costo.
                                </p>
                            </div>
                        </div>

                        <CardContent className="p-8 space-y-8 bg-white dark:bg-zinc-900">
                            
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                                <h4 className="font-bold text-slate-800 border-b pb-2">Paso 1: Filtro en Cascada (Elige a quién afectar)</h4>
                                
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-bold text-slate-700">1º Nivel: Seleccione Proveedor (Obligatorio)</Label>
                                    <Select value={provSeleccionadoMasivo} onValueChange={(v) => { setProvSeleccionadoMasivo(v || ""); setMarcaSeleccionadaMasiva(""); setCategoriaSeleccionadaMasiva(""); }}>
                                        <SelectTrigger className="h-11 bg-white border-slate-200 font-medium">
                                            <SelectValue placeholder="Elegir proveedor...">
                                                {provSeleccionadoMasivo ? proveedores.find(p => String(p.id) === provSeleccionadoMasivo)?.nombre : "Elegir proveedor..."}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {proveedores.map(p => (
                                                <SelectItem key={p.id} value={String(p.id)}>{p.nombre} ({p._count.productos} productos)</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Cascada: Marca */}
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-bold text-slate-700">2º Nivel: Restringir a una Marca (Opcional)</Label>
                                    <Select 
                                        value={marcaSeleccionadaMasiva} 
                                        onValueChange={(val) => { setMarcaSeleccionadaMasiva(val || ""); setCategoriaSeleccionadaMasiva(""); }}
                                        disabled={!provSeleccionadoMasivo || marcasMasivo.length === 0}
                                    >
                                        <SelectTrigger className="h-11 bg-white border-slate-200 font-medium disabled:opacity-50">
                                            <SelectValue placeholder={!provSeleccionadoMasivo ? "Primero elija un proveedor" : marcasMasivo.length === 0 ? "Este proveedor no tiene marcas" : "Todas las marcas"}>
                                                {marcaSeleccionadaMasiva ? marcaMasiva?.nombre : "Todas las marcas"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {marcasMasivo.map((m: any) => (<SelectItem key={m.id} value={String(m.id)}>{m.nombre} ({m._count?.productos || 0} prod.)</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Cascada: Categoría */}
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-bold text-slate-700">3º Nivel: Restringir a una Categoría (Opcional)</Label>
                                    <Select 
                                        value={categoriaSeleccionadaMasiva} 
                                        onValueChange={(v) => setCategoriaSeleccionadaMasiva(v || "")}
                                        disabled={!marcaSeleccionadaMasiva || categoriasMasivo.length === 0}
                                    >
                                        <SelectTrigger className="h-11 bg-white border-slate-200 font-medium disabled:opacity-50">
                                            <SelectValue placeholder={!marcaSeleccionadaMasiva ? "Primero elija una marca" : categoriasMasivo.length === 0 ? "Esta marca no tiene categorías" : "Todas las categorías"}>
                                                {categoriaSeleccionadaMasiva ? categoriasMasivo.find((c: any) => String(c.id) === categoriaSeleccionadaMasiva)?.nombre : "Todas las categorías"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categoriasMasivo.map((c: any) => (<SelectItem key={c.id} value={String(c.id)}>{c.nombre} ({c._count?.productos || 0} prod.)</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 mt-6">
                                <h4 className="font-bold text-slate-800 border-b pb-2">Paso 2: Magnitud de la Inflación</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Acción</Label>
                                        <Select value={accionMasiva} onValueChange={(val: any) => setAccionMasiva(val)}>
                                            <SelectTrigger className="h-12 bg-white border-slate-200 text-base font-bold text-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AUMENTO" className="text-red-600 font-bold">AUMENTAR (+)</SelectItem>
                                                <SelectItem value="REBAJA" className="text-emerald-600 font-bold">REBAJAR (-)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Porcentaje (%)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number" step="0.1" value={porcentajeMasivo} onChange={(e) => setPorcentajeMasivo(e.target.value)}
                                                className="h-12 pl-4 pr-10 bg-white border-slate-200 font-black text-xl text-slate-900"
                                                placeholder="Ej: 15"
                                            />
                                            <span className="absolute right-4 top-3 text-slate-400 font-bold text-lg">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <Button
                                    onClick={handleAplicarMasivo}
                                    disabled={isPending || !provSeleccionadoMasivo || !porcentajeMasivo}
                                    className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black text-lg uppercase tracking-wider shadow-md"
                                >
                                    {isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Ejecutar Actualización a Productos Seleccionados"}
                                    {!isPending && <ArrowRight className="h-5 w-5 ml-2" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* =========================================================================
          MODAL DE PROVEEDOR (Crear / Editar)
      ========================================================================= */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl border-0 rounded-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 rounded-t-2xl">
                            <h3 className="font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-indigo-600" /> {provEditando ? "Editar Proveedor" : "Nuevo Proveedor"}</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="h-8 w-8 rounded-full text-slate-400"><X className="h-4 w-4" /></Button>
                        </div>
                        <form onSubmit={handleGuardarProveedor} className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Razón Social / Marca <span className="text-red-500">*</span></Label>
                                <Input name="nombre" defaultValue={provEditando?.nombre} required autoFocus className="h-10 bg-slate-50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label className="text-xs font-semibold">CUIT</Label><Input name="cuit" defaultValue={provEditando?.cuit} className="h-10 bg-slate-50" /></div>
                                <div className="space-y-1.5"><Label className="text-xs font-semibold">Teléfono</Label><Input name="telefono" defaultValue={provEditando?.telefono} className="h-10 bg-slate-50" /></div>
                            </div>
                            <div className="space-y-1.5"><Label className="text-xs font-semibold">Email</Label><Input name="email" type="email" defaultValue={provEditando?.email} className="h-10 bg-slate-50" /></div>
                            <div className="space-y-1.5"><Label className="text-xs font-semibold">Dirección</Label><Input name="direccion" defaultValue={provEditando?.direccion} className="h-10 bg-slate-50" /></div>
                            <div className="space-y-1.5 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                <Label className="text-xs font-semibold text-orange-700 flex items-center gap-1"><Percent className="h-3 w-3" /> Aumento Propio del Proveedor (%)</Label>
                                <Input name="aumento_porcentaje" type="number" step="0.1" defaultValue={provEditando?.aumento_porcentaje || 0} className="h-10 bg-white border-orange-200" />
                                <p className="text-[10px] text-orange-600">Se aplica en cascada a todos los productos de este proveedor.</p>
                            </div>
                            <div className="pt-4 border-t flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isPending} className="bg-slate-900 text-white">{isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Guardar"}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* ========= MODAL MARCA (Crear / Editar) ========= */}
            {showMarcaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm shadow-2xl border-0 rounded-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 rounded-t-2xl">
                            <h3 className="font-bold flex items-center gap-2"><Tag className="h-4 w-4 text-purple-600" /> {marcaEditando ? "Editar Marca" : "Nueva Marca"}</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowMarcaModal(false)} className="h-8 w-8 rounded-full text-slate-400"><X className="h-4 w-4" /></Button>
                        </div>
                        <form onSubmit={handleGuardarMarca} className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nombre de la Marca <span className="text-red-500">*</span></Label>
                                <Input name="nombre" defaultValue={marcaEditando?.nombre} required autoFocus className="h-10 bg-slate-50" />
                            </div>
                            <div className="space-y-1.5 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                <Label className="text-xs font-semibold text-purple-700 flex items-center gap-1"><Percent className="h-3 w-3" /> Aumento Propio (%)</Label>
                                <Input name="aumento_porcentaje" type="number" step="0.1" defaultValue={marcaEditando?.aumento_porcentaje || 0} className="h-10 bg-white border-purple-200" />
                            </div>
                            <div className="pt-4 border-t flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowMarcaModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">{isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Guardar"}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* ========= MODAL CATEGORIA (Crear / Editar) ========= */}
            {showCategoriaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm shadow-2xl border-0 rounded-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 rounded-t-2xl">
                            <h3 className="font-bold flex items-center gap-2"><Tag className="h-4 w-4 text-indigo-600" /> {categoriaEditando ? "Editar Categoría" : "Nueva Categoría"}</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowCategoriaModal(false)} className="h-8 w-8 rounded-full text-slate-400"><X className="h-4 w-4" /></Button>
                        </div>
                        <form onSubmit={handleGuardarCategoria} className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nombre de la Categoría <span className="text-red-500">*</span></Label>
                                <Input name="nombre" defaultValue={categoriaEditando?.nombre} required autoFocus className="h-10 bg-slate-50" />
                            </div>
                            <div className="space-y-1.5 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                <Label className="text-xs font-semibold text-indigo-700 flex items-center gap-1"><Percent className="h-3 w-3" /> Aumento Propio (%)</Label>
                                <Input name="aumento_porcentaje" type="number" step="0.1" defaultValue={categoriaEditando?.aumento_porcentaje || 0} className="h-10 bg-white border-indigo-200" />
                            </div>
                            <div className="pt-4 border-t flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowCategoriaModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">{isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Guardar"}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* ========= MODAL LISTAS DE PRECIOS POR PROVEEDOR ========= */}
            {showListasModal && provListasEditando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl border-0 rounded-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center shrink-0 rounded-t-2xl">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-indigo-600" /> Reglas de Tarifarios y Descuentos
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Proveedor: <span className="font-bold text-indigo-700">{provListasEditando.nombre}</span></p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowListasModal(false)} className="h-8 w-8 rounded-full text-slate-400"><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-4 flex-1">
                            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                Definí márgenes de ganancia o descuentos específicos para este proveedor en cada lista de precios. Si se deja en blanco, se utilizará el margen por defecto de la lista.
                            </p>

                            <div className="space-y-3">
                                {listasGlobales.map(lista => (
                                    <div key={lista.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm text-slate-800">{lista.nombre}</span>
                                            <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-50">
                                                Margen base: {lista.margen_defecto}%
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-indigo-600">Margen Específico (%)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    placeholder={`Defecto: ${lista.margen_defecto}%`}
                                                    value={formListasProv[lista.id]?.margen || ""}
                                                    onChange={(e) => setFormListasProv({
                                                        ...formListasProv,
                                                        [lista.id]: {
                                                            ...formListasProv[lista.id],
                                                            margen: e.target.value
                                                        }
                                                    })}
                                                    className="h-9 text-sm font-semibold bg-slate-50 border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase text-emerald-600">Descuento Específico (%)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="Ej: 5"
                                                    value={formListasProv[lista.id]?.descuento || ""}
                                                    onChange={(e) => setFormListasProv({
                                                        ...formListasProv,
                                                        [lista.id]: {
                                                            ...formListasProv[lista.id],
                                                            descuento: e.target.value
                                                        }
                                                    })}
                                                    className="h-9 text-sm font-semibold bg-slate-50 border-slate-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0 rounded-b-2xl">
                            <Button variant="outline" onClick={() => setShowListasModal(false)}>Cancelar</Button>
                            <Button onClick={handleGuardarListasProveedor} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Guardar Reglas
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* ALERTA DE CAMBIO CRÍTICO */}
            <AlertaCambioCriticoModal
                open={alertaCritica.open}
                onClose={() => setAlertaCritica(prev => ({ ...prev, open: false }))}
                onConfirmar={alertaCritica.onConfirm}
                tipo={alertaCritica.tipo}
                titulo={alertaCritica.titulo}
                entidadAfectada={alertaCritica.entidadAfectada}
                subtitulo={alertaCritica.subtitulo}
                detalles={alertaCritica.detalles}
                advertencias={alertaCritica.advertencias}
                textoConfirmar={alertaCritica.textoConfirmar}
                loading={isPending}
            />

        </div>
    );
}