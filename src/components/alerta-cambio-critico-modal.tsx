"use client";

import React from "react";
import {
    AlertTriangle,
    TrendingUp,
    Percent,
    Tag,
    Sliders,
    Users,
    DollarSign,
    ArrowRight,
    Loader2,
    ShieldAlert,
    X,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type TipoCambioCritico = "PRECIOS" | "COMISIONES" | "MARCA" | "CONFIGURACION" | "ELIMINAR";

export interface CambioDetalleItem {
    etiqueta: string;
    anterior?: string | number | null;
    nuevo: string | number;
    nota?: string;
    destacado?: boolean;
}

export interface AlertaCambioCriticoModalProps {
    open: boolean;
    onClose: () => void;
    onConfirmar: () => void | Promise<void>;
    tipo?: TipoCambioCritico;
    titulo: string;
    subtitulo?: string;
    entidadAfectada?: string; // ej: "Lista de Precios: Mayorista" o "Marca: Arcor"
    detalles: CambioDetalleItem[];
    advertencias?: string[];
    textoConfirmar?: string;
    textoCancelar?: string;
    loading?: boolean;
}

export function AlertaCambioCriticoModal({
    open,
    onClose,
    onConfirmar,
    tipo = "PRECIOS",
    titulo,
    subtitulo,
    entidadAfectada,
    detalles = [],
    advertencias = [],
    textoConfirmar = "Confirmar y Aplicar Cambio",
    textoCancelar = "Volver / Cancelar",
    loading = false
}: AlertaCambioCriticoModalProps) {
    if (!open) return null;

    // Configuración visual según el tipo de cambio
    const configTipo = {
        PRECIOS: {
            badge: "Ajuste de Precios",
            badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
            icon: TrendingUp,
            iconColor: "text-amber-600 dark:text-amber-400",
            headerBg: "from-amber-500/10 via-amber-500/5 to-transparent",
            btnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25"
        },
        MARCA: {
            badge: "Modificación de Marca / Proveedor",
            badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
            icon: Tag,
            iconColor: "text-purple-600 dark:text-purple-400",
            headerBg: "from-purple-500/10 via-purple-500/5 to-transparent",
            btnClass: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25"
        },
        COMISIONES: {
            badge: "Reglas de Comisiones",
            badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
            icon: Percent,
            iconColor: "text-indigo-600 dark:text-indigo-400",
            headerBg: "from-indigo-500/10 via-indigo-500/5 to-transparent",
            btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
        },
        CONFIGURACION: {
            badge: "Configuración Comercial",
            badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
            icon: Sliders,
            iconColor: "text-blue-600 dark:text-blue-400",
            headerBg: "from-blue-500/10 via-blue-500/5 to-transparent",
            btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
        },
        ELIMINAR: {
            badge: "Acción Irreversible",
            badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
            icon: AlertTriangle,
            iconColor: "text-rose-600 dark:text-rose-400",
            headerBg: "from-rose-500/10 via-rose-500/5 to-transparent",
            btnClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25"
        }
    }[tipo];

    const IconoPrincipal = configTipo.icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                
                {/* CABECERA CON RADIAL GRADIENT */}
                <div className={`p-6 bg-gradient-to-b ${configTipo.headerBg} border-b border-slate-100 dark:border-zinc-800 relative`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="absolute top-5 right-5 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        title="Cerrar sin guardar"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2 mb-3">
                        <span className={`p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-xs border border-slate-200/60 dark:border-zinc-700 ${configTipo.iconColor}`}>
                            <IconoPrincipal className="h-5 w-5" />
                        </span>
                        <Badge variant="outline" className={`font-black text-[11px] px-2.5 py-0.5 rounded-lg border ${configTipo.badgeClass}`}>
                            {configTipo.badge}
                        </Badge>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                        {titulo}
                    </h3>

                    {entidadAfectada && (
                        <p className="mt-1 text-sm font-bold text-slate-700 dark:text-zinc-300">
                            {entidadAfectada}
                        </p>
                    )}

                    {subtitulo && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                            {subtitulo}
                        </p>
                    )}
                </div>

                {/* CUERPO CON DETALLES DE LO QUE VA A CAMBIAR */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* Tarjeta de Especificación de Cambios */}
                    {detalles.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                                Especificación exacta del cambio:
                            </label>
                            <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 divide-y divide-slate-200/60 dark:divide-zinc-700/60 overflow-hidden">
                                {detalles.map((item, idx) => (
                                    <div key={idx} className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${item.destacado ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 block">
                                                {item.etiqueta}
                                            </span>
                                            {item.nota && (
                                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                                                    {item.nota}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono">
                                            {item.anterior !== undefined && item.anterior !== null && (
                                                <>
                                                    <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 line-through">
                                                        {item.anterior}
                                                    </span>
                                                    <ArrowRight className="h-3 w-3 text-slate-400" />
                                                </>
                                            )}
                                            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-white shadow-2xs">
                                                {item.nuevo}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Caja de Advertencias de Impacto */}
                    {advertencias.length > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Impacto en el sistema:</span>
                            </div>
                            <ul className="text-xs space-y-1 text-slate-700 dark:text-zinc-300 pl-6 list-disc">
                                {advertencias.map((adv, idx) => (
                                    <li key={idx} className="leading-snug">
                                        {adv}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* BOTONES DE CONFIRMACIÓN / CANCELACIÓN */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="h-11 rounded-xl font-bold text-xs border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                        {textoCancelar}
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirmar}
                        disabled={loading}
                        className={`h-11 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 ${configTipo.btnClass}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Aplicando cambios...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{textoConfirmar}</span>
                            </>
                        )}
                    </Button>
                </div>

            </div>
        </div>
    );
}
