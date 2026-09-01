"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
    Users, ShieldCheck, UserPlus, KeyRound, Loader2, X, CheckSquare, Square, Trash2, Edit, Ban, CheckCircle,
    Phone, Truck, ShoppingBag, RefreshCw, Smartphone
} from "lucide-react";
import { getUsuarios, guardarUsuario, eliminarUsuario, toggleActivoUsuario } from "@/app/actions/usuarios";
import { getSucursales } from "@/app/actions/configuracion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Lista de todos los módulos que se pueden bloquear para personal de oficina / cajeros
const MODULOS_SISTEMA = [
    { id: "VENTAS", nombre: "Terminal de Ventas", desc: "Facturar y cobrar en el mostrador." },
    { id: "CAJA", nombre: "Caja Diaria", desc: "Abrir/cerrar turnos y registrar egresos." },
    { id: "CLIENTES", nombre: "Clientes y Deudas", desc: "Ver cuentas corrientes y cobrar abonos." },
    { id: "INVENTARIO", nombre: "Inventario y Precios", desc: "Cargar stock, cambiar precios y costos." },
    { id: "HISTORIAL", nombre: "Historial de Ventas", desc: "Ver facturas pasadas y hacer devoluciones." },
    { id: "PRESUPUESTOS", nombre: "Presupuestos", desc: "Crear, editar y convertir cotizaciones." },
    { id: "REPORTES", nombre: "Reportes (Dashboard)", desc: "Ver ganancias, métricas y estadísticas." },
    { id: "CONFIGURACION", nombre: "Configuración", desc: "Cambiar datos de la empresa e impresiones." }
];

const MODULOS_CAMPO = [
    { id: "COBRAR_CC", nombre: "Cobranzas en Calle", desc: "Permitir cobrar cuentas corrientes y recibir dinero desde la App PWA." },
    { id: "VER_TODO_STOCK", nombre: "Consultar Catálogo Completo", desc: "Permitir ver el stock de todos los depósitos en la PWA." }
];

export default function GestionUsuariosPage() {
    const [isPending, startTransition] = useTransition();
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sucursales, setSucursales] = useState<any[]>([]);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
    const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([]);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");
    const [rolSeleccionado, setRolSeleccionado] = useState<string>("CAJERO");

    const cargarUsuarios = () => {
        startTransition(async () => {
            const data = await getUsuarios();
            const sucs = await getSucursales();
            setUsuarios(data);
            setSucursales(sucs);
            setLoading(false);
        });
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const handleAbrirModal = (user: any = null) => {
        setUsuarioEditando(user);
        if (user) {
            setPermisosSeleccionados(JSON.parse(user.permisos || "[]"));
            setSucursalSeleccionada(user.sucursalId ? String(user.sucursalId) : "null");
            setRolSeleccionado(user.rol || "CAJERO");
        } else {
            setPermisosSeleccionados(["VENTAS", "CLIENTES"]);
            setSucursalSeleccionada("null");
            setRolSeleccionado("VENDEDOR");
        }
        setShowModal(true);
    };

    const togglePermiso = (moduloId: string) => {
        if (permisosSeleccionados.includes(moduloId)) {
            setPermisosSeleccionados(permisosSeleccionados.filter(p => p !== moduloId));
        } else {
            setPermisosSeleccionados([...permisosSeleccionados, moduloId]);
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (usuarioEditando) formData.append("id", String(usuarioEditando.id));
        if (sucursalSeleccionada !== "null") formData.append("sucursalId", sucursalSeleccionada);
        formData.append("rol", rolSeleccionado);

        const permisosFinales = permisosSeleccionados;

        startTransition(async () => {
            const res = await guardarUsuario(formData, JSON.stringify(permisosFinales));
            if (res.success) {
                toast.success("Usuario guardado correctamente.");
                setShowModal(false);
                cargarUsuarios();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Atención: Eliminar físicamente un usuario puede causar errores si tiene operaciones a su nombre. Se recomienda 'Suspender'. ¿Seguro que deseás eliminarlo por completo?")) return;
        startTransition(async () => {
            const res = await eliminarUsuario(id);
            if (res.success) {
                toast.success("Usuario eliminado.");
                cargarUsuarios();
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleToggleEstado = (id: number, estadoActual: boolean) => {
        startTransition(async () => {
            const res = await toggleActivoUsuario(id, estadoActual);
            if (res.success) {
                toast.success(estadoActual ? "Usuario suspendido." : "Usuario reactivado.");
                cargarUsuarios();
            } else {
                toast.error(res.error);
            }
        });
    };

    const getRolBadge = (rol: string) => {
        switch (rol) {
            case "ADMIN":
                return <Badge className="bg-indigo-600 text-white font-bold text-[10px]">⭐ ADMIN</Badge>;
            case "VENDEDOR":
                return <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">📱 PREVENTISTA</Badge>;
            case "REPARTIDOR":
                return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">🚚 REPARTIDOR</Badge>;
            case "MIXTO":
                return <Badge className="bg-purple-600 text-white font-bold text-[10px]">🔄 PREVENTA & REPARTO</Badge>;
            default:
                return <Badge className="bg-slate-600 text-white font-bold text-[10px]">🏪 CAJERO</Badge>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                        <ShieldCheck className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Usuarios & Perfiles de Campo</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Administrá preventistas, choferes repartidores y operadores de caja.</p>
                    </div>
                </div>
                <Button onClick={() => handleAbrirModal(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm h-10 px-5 rounded-xl">
                    <UserPlus className="h-4 w-4 mr-2" /> Nuevo Usuario
                </Button>
            </div>

            {/* GRILLA DE USUARIOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {usuarios.map(u => {
                    const permisosArray = JSON.parse(u.permisos || "[]");
                    const esAdmin = u.rol === "ADMIN";
                    const esVendedor = u.rol === "VENDEDOR";
                    const esRepartidor = u.rol === "REPARTIDOR";
                    const esMixto = u.rol === "MIXTO";
                    const estaInactivo = !u.activo;

                    return (
                        <Card key={u.id} className={`shadow-sm border-2 overflow-hidden transition-all ${
                            estaInactivo ? 'opacity-70 grayscale-[40%] bg-slate-50' :
                            esAdmin ? 'border-indigo-200 bg-indigo-50/10' :
                            esVendedor ? 'border-amber-200 bg-amber-50/10' :
                            esRepartidor ? 'border-emerald-200 bg-emerald-50/10' :
                            esMixto ? 'border-purple-200 bg-purple-50/10' :
                            'border-slate-200 bg-white'
                        }`}>
                            <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-slate-400" /> {u.nombre}
                                        {estaInactivo && (
                                            <Badge variant="outline" className="text-[9px] text-red-600 border-red-200 bg-red-50 px-1 py-0 h-4 ml-1 font-black">INACTIVO</Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="font-mono text-xs mt-0.5 flex items-center gap-2">
                                        <span>@{u.username}</span>
                                        {u.telefono && (
                                            <span className="text-emerald-600 font-sans font-bold flex items-center gap-1">
                                                <Phone className="h-3 w-3" /> {u.telefono}
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                                <div>{getRolBadge(u.rol)}</div>
                            </CardHeader>

                            <CardContent className="p-5">
                                <div className="space-y-3 mb-6">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perfil & Módulos Habilitados</p>
                                    {estaInactivo ? (
                                        <div className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded-md border border-red-100 text-center flex items-center justify-center gap-2">
                                            <Ban className="h-4 w-4" /> CUENTA SUSPENDIDA
                                        </div>
                                    ) : esAdmin ? (
                                        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 p-2 rounded-md border border-emerald-100 text-center">
                                            ⭐ Acceso Total (Dueño / Admin)
                                        </div>
                                    ) : esVendedor ? (
                                        <div className="text-xs font-medium text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 flex items-center gap-2">
                                            <ShoppingBag className="h-4 w-4 text-amber-600 shrink-0" />
                                            <span>Preventista de Calle: toma pedidos, combos y cobranzas en PWA.</span>
                                        </div>
                                    ) : esRepartidor ? (
                                        <div className="text-xs font-medium text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60 flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                                            <span>Chofer Repartidor: entrega hojas de ruta y registra cobranzas en calle.</span>
                                        </div>
                                    ) : esMixto ? (
                                        <div className="text-xs font-medium text-purple-800 bg-purple-50 p-2.5 rounded-xl border border-purple-200/60 flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4 text-purple-600 shrink-0" />
                                            <span>Mixto (Preventa + Reparto): levanta pedidos y reparte en calle.</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {permisosArray.length === 0 ? <span className="text-xs text-red-500">Ninguno (Bloqueado)</span> : null}
                                            {permisosArray.map((p: string) => (
                                                <span key={p} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                    {p.replace('_', ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100">
                                    <Button variant="outline" size="sm" onClick={() => handleAbrirModal(u)} className="flex-1 text-slate-600 font-medium h-9 rounded-xl">
                                        <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                                    </Button>
                                    {!esAdmin && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleEstado(u.id, u.activo)}
                                                className={`px-3 h-9 font-bold rounded-xl ${u.activo ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                            >
                                                {u.activo ? <Ban className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                {u.activo ? "Suspender" : "Reactivar"}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-red-400 hover:bg-red-50 hover:text-red-600 shrink-0 h-9 w-9 rounded-xl">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* MODAL DE CREACIÓN / EDICIÓN DE USUARIO */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl shadow-2xl border-0 rounded-3xl flex flex-col max-h-[90vh] overflow-hidden">

                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                                {usuarioEditando ? "Editar Usuario" : "Crear Nuevo Usuario"}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></Button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
                            <div className="p-6 flex flex-col md:flex-row gap-8">

                                {/* COLUMNA IZQUIERDA: DATOS DEL USUARIO */}
                                <div className="w-full md:w-1/2 space-y-4">
                                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Datos de Acceso y Contacto</h4>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Nombre del Empleado <span className="text-red-500">*</span></Label>
                                        <Input name="nombre" defaultValue={usuarioEditando?.nombre} required className="h-10 bg-slate-50 rounded-xl" placeholder="Ej: Marcos García" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Usuario (Login) <span className="text-red-500">*</span></Label>
                                        <Input name="username" defaultValue={usuarioEditando?.username} required className="h-10 bg-slate-50 rounded-xl font-mono text-xs" placeholder="Ej: marcos" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5 text-emerald-600" /> Teléfono / WhatsApp de Contacto
                                        </Label>
                                        <Input name="telefono" defaultValue={usuarioEditando?.telefono} className="h-10 bg-slate-50 rounded-xl" placeholder="Ej: 1123456789 o 3329123456" />
                                        <p className="text-[10px] text-slate-500">Permite al chofer llamar o escribir por WhatsApp al preventista si surge alguna duda en la entrega.</p>
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                        <Label className="text-xs font-semibold flex items-center gap-1">
                                            <KeyRound className="h-3.5 w-3.5 text-slate-400" /> Contraseña {usuarioEditando && <span className="text-[10px] text-slate-400 font-normal ml-1">(Vacío para mantener)</span>}
                                        </Label>
                                        <Input name="password" type="password" required={!usuarioEditando} className="h-10 bg-slate-50 rounded-xl" placeholder="••••••••" />
                                    </div>

                                    {/* SELECTOR DE ROL */}
                                    {usuarioEditando?.rol !== 'ADMIN' && usuarios.length > 0 && (
                                        <div className="space-y-1.5 pt-2">
                                            <Label className="text-xs font-semibold flex items-center gap-1">Rol Operativo del Usuario</Label>
                                            <Select value={rolSeleccionado} onValueChange={(val) => setRolSeleccionado(val || "CAJERO")}>
                                                <SelectTrigger className="h-10 bg-slate-50 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="VENDEDOR">📱 Preventista / Vendedor (PWA)</SelectItem>
                                                    <SelectItem value="REPARTIDOR">🚚 Repartidor / Chofer (PWA)</SelectItem>
                                                    <SelectItem value="MIXTO">🔄 Mixto (Preventa + Reparto)</SelectItem>
                                                    <SelectItem value="CAJERO">🏪 Cajero / Facturación Mostrador (ERP)</SelectItem>
                                                    <SelectItem value="ADMIN">⭐ Administrador General (Acceso Total)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-slate-500 leading-tight">
                                                {rolSeleccionado === 'VENDEDOR'
                                                    ? 'Acceso a PWA móvil para levantar pedidos en calle, combos y cobranzas.'
                                                    : rolSeleccionado === 'REPARTIDOR'
                                                        ? 'Acceso a PWA móvil para consultar sus hojas de ruta y confirmar entregas.'
                                                        : rolSeleccionado === 'MIXTO'
                                                            ? 'Acceso a PWA móvil con ambas funciones: levantar pedidos y hacer entregas en calle.'
                                                            : rolSeleccionado === 'ADMIN'
                                                                ? 'Acceso total e irrestricto a todo el sistema ERP.'
                                                                : 'Acceso a terminal de mostrador y ERP con los permisos asignados.'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-1.5 pt-2">
                                        <Label className="text-xs font-semibold flex items-center gap-1">Sucursal Predeterminada</Label>
                                        <Select value={sucursalSeleccionada} onValueChange={(val) => setSucursalSeleccionada(val as string)}>
                                            <SelectTrigger className="h-10 bg-slate-50 rounded-xl">
                                                <SelectValue placeholder="Sin Sucursal Fija" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null" className="font-semibold text-slate-400">Sin sucursal (Ninguna)</SelectItem>
                                                {sucursales.map(suc => (
                                                    <SelectItem key={suc.id} value={String(suc.id)}>{suc.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA: PERMISOS */}
                                <div className="w-full md:w-1/2">
                                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-4">Permisos y Accesos</h4>

                                    {usuarioEditando?.rol === "ADMIN" || usuarios.length === 0 || rolSeleccionado === "ADMIN" ? (
                                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                                            <ShieldCheck className="h-12 w-12 text-slate-300 mb-2" />
                                            <p className="font-bold text-slate-700">Modo Administrador</p>
                                            <p className="text-xs text-slate-500 mt-1">Los administradores tienen acceso irrestricto a todos los módulos.</p>
                                        </div>
                                    ) : ['VENDEDOR', 'REPARTIDOR', 'MIXTO'].includes(rolSeleccionado) ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                                                <p className="font-bold flex items-center gap-1.5">
                                                    <Smartphone className="h-4 w-4 text-amber-600" /> Perfil de Campo (PWA Móvil)
                                                </p>
                                                <p className="text-[11px] leading-relaxed">
                                                    Este usuario ingresará desde su teléfono a <b>/vendedor</b>. No tendrá acceso a la configuración ni módulos contables de oficina.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                {MODULOS_CAMPO.map(mod => {
                                                    const tienePermiso = permisosSeleccionados.includes(mod.id);
                                                    return (
                                                        <div
                                                            key={mod.id}
                                                            onClick={() => togglePermiso(mod.id)}
                                                            className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${tienePermiso ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                                                        >
                                                            <div className="mt-0.5">
                                                                {tienePermiso ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-xs text-slate-800">{mod.nombre}</p>
                                                                <p className="text-[10px] text-slate-500 mt-0.5">{mod.desc}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {MODULOS_SISTEMA.map(mod => {
                                                const tienePermiso = permisosSeleccionados.includes(mod.id);
                                                return (
                                                    <div
                                                        key={mod.id}
                                                        onClick={() => togglePermiso(mod.id)}
                                                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${tienePermiso ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                                                    >
                                                        <div className="mt-0.5">
                                                            {tienePermiso ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800">{mod.nombre}</p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">{mod.desc}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isPending} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-xl">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {usuarioEditando ? "Guardar Cambios" : "Crear Usuario"}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

        </div>
    );
}