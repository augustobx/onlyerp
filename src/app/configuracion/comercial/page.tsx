"use client";

import { useState, useEffect, useTransition } from "react";
import { obtenerConfiguracionComercial, actualizarReglasGlobales, actualizarReglaUsuario } from "@/app/actions/configuracion-comercial";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Percent, AlertOctagon, TrendingDown, Users, Calculator, Landmark, ShieldCheck } from "lucide-react";

export default function ConfiguracionComercialPage() {
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<any>(null);

    const [globales, setGlobales] = useState({
        comision: 5,
        penalizacion: 2,
        limite: 10,
        redondear_a_cinco: false,
        aplicar_iva_en_precios: false
    });

    const cargarDatos = () => {
        obtenerConfiguracionComercial().then(res => {
            if (res.success) {
                setData(res);
                if (res.config) {
                    setGlobales({
                        comision: res.config.comision_base_global,
                        penalizacion: res.config.penalizacion_global,
                        limite: res.config.limite_desc_global,
                        redondear_a_cinco: res.config.redondear_a_cinco,
                        aplicar_iva_en_precios: res.config.aplicar_iva_en_precios || false
                    });
                }
            }
        });
    };

    useEffect(() => { cargarDatos(); }, []);

    const guardarGlobales = () => {
        startTransition(async () => {
            const res = await actualizarReglasGlobales(globales);
            if (res.success) toast.success("¡Reglas comerciales y tratamiento de IVA actualizados!");
            else toast.error(res.error);
        });
    };

    const guardarUsuario = async (u: any) => {
        const res = await actualizarReglaUsuario(u.id, u.comision_personalizada, u.limite_desc_vendedor);
        if (res.success) toast.success(`Reglas guardadas para ${u.nombre}`);
        else toast.error("Error al guardar");
    };

    if (!data) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Cargando panel comercial...</div>;

    return (
        <div className="max-w-[1000px] mx-auto p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuración Comercial, IVA y Comisiones</h2>
                <p className="text-sm text-slate-500 mt-0.5">Definí cómo calcula el ERP los precios de venta, comisiones de vendedores y límites de descuento.</p>
            </div>

            {/* CARD 1: TRATAMIENTO DE IVA EN PRECIOS */}
            <Card className="border-indigo-200 bg-white shadow-sm overflow-hidden">
                <CardHeader className="bg-indigo-50/70 border-b border-indigo-100 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-950 font-black">
                            <Landmark className="h-5 w-5 text-indigo-600" /> Tratamiento de IVA en Precios de Venta
                        </CardTitle>
                        <Badge className={`font-bold text-xs ${globales.aplicar_iva_en_precios ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                            {globales.aplicar_iva_en_precios ? '🟢 Precios con IVA Incluido' : '⚪ Precios Netos / Sin IVA'}
                        </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-600">
                        Elegí si los precios de lista deben sumar la alícuota de IVA del producto (21% / 10.5%) o trabajar directo sobre el precio base.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Opción 1: Sin IVA */}
                        <div
                            onClick={() => setGlobales({ ...globales, aplicar_iva_en_precios: false })}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                !globales.aplicar_iva_en_precios
                                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                                    : 'border-slate-200 hover:border-slate-300 bg-white opacity-70'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-sm text-slate-900">Modo 1: Precio Base Directo (IVA 0% / Desactivado)</h4>
                                    <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${!globales.aplicar_iva_en_precios ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                        {!globales.aplicar_iva_en_precios && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    El margen de ganancia de cada lista se aplica <strong>directamente sobre el costo neto</strong> sin sumarle ninguna alícuota de IVA.
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md mt-3 inline-block w-fit">
                                Ideal para: Mayoristas netos o venta directa
                            </span>
                        </div>

                        {/* Opción 2: Con IVA */}
                        <div
                            onClick={() => setGlobales({ ...globales, aplicar_iva_en_precios: true })}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                globales.aplicar_iva_en_precios
                                    ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                                    : 'border-slate-200 hover:border-slate-300 bg-white opacity-70'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-sm text-slate-900">Modo 2: Precio con IVA Incluido (Alícuota del Producto)</h4>
                                    <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${globales.aplicar_iva_en_precios ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                                        {globales.aplicar_iva_en_precios && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    El sistema suma al costo neto la <strong>alícuota de IVA</strong> asignada a cada producto (21%, 10.5%, etc.) antes de calcular márgenes y listas.
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md mt-3 inline-block w-fit">
                                Ideal para: Responsables Inscriptos y Retail
                            </span>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* CARD 2: REGLAS GLOBALES Y COMISIONES */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-900"><Percent className="h-5 w-5 text-indigo-600" /> Parámetros Comerciales y Redondeo</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comisión Base Vendedores (%)</label>
                        <Input type="number" value={globales.comision} onChange={e => setGlobales({ ...globales, comision: Number(e.target.value) })} className="mt-2 font-black text-lg bg-slate-50" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1"><AlertOctagon className="h-3 w-3" /> Límite Dto Tolerado (%)</label>
                        <Input type="number" value={globales.limite} onChange={e => setGlobales({ ...globales, limite: Number(e.target.value) })} className="mt-2 font-black text-lg bg-slate-50" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Penalización de Comisión (%)</label>
                        <Input type="number" value={globales.penalizacion} onChange={e => setGlobales({ ...globales, penalizacion: Number(e.target.value) })} className="mt-2 font-black text-lg bg-slate-50" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1"><Calculator className="h-3 w-3" /> Redondeo a $0 o $5</label>
                        <div className="flex items-center gap-2 mt-2">
                            <Switch checked={globales.redondear_a_cinco} onCheckedChange={val => setGlobales({ ...globales, redondear_a_cinco: val })} />
                            <span className="text-sm font-bold text-slate-700">{globales.redondear_a_cinco ? "Encendido (Redondea a $5)" : "Apagado (Precio Exacto)"}</span>
                        </div>
                    </div>
                    <div className="md:col-span-3 flex justify-end pt-2">
                        <Button onClick={guardarGlobales} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 h-11 rounded-xl shadow-sm">
                            <Save className="mr-2 h-4 w-4" /> Guardar Configuración Global
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* CARD 3: EXCEPCIONES POR VENDEDOR */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800"><Users className="h-5 w-5 text-indigo-600" /> Excepciones por Vendedor</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                            <tr><th className="p-4">Vendedor</th><th className="p-4">Comisión Específica (%)</th><th className="p-4">Límite Dto Específico (%)</th><th className="p-4 text-center">Acción</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.vendedores.map((u: any, i: number) => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{u.nombre}</td>
                                    <td className="p-4"><Input type="number" placeholder="Usa la global..." className="h-9 w-32" value={u.comision_personalizada || ""} onChange={(e) => { const n = [...data.vendedores]; n[i].comision_personalizada = e.target.value ? Number(e.target.value) : null; setData({ ...data, vendedores: n }); }} /></td>
                                    <td className="p-4"><Input type="number" placeholder="Usa la global..." className="h-9 w-32 border-red-200" value={u.limite_desc_vendedor || ""} onChange={(e) => { const n = [...data.vendedores]; n[i].limite_desc_vendedor = e.target.value ? Number(e.target.value) : null; setData({ ...data, vendedores: n }); }} /></td>
                                    <td className="p-4 text-center"><Button size="sm" onClick={() => guardarUsuario(u)} className="bg-slate-900 text-white font-bold h-9">Guardar</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}