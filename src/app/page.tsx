"use client";

import { useState, useEffect, useTransition } from "react";
import { getDashboardMetrics } from "@/app/actions/dashboard";
import {
  LayoutDashboard, TrendingUp, AlertTriangle, BadgeDollarSign,
  Wallet, Settings, Receipt, Package, ArrowRight, Loader2, Check, Truck,
  Calendar, Landmark, Route, Sparkles, Clock, Users, ArrowUpRight, ArrowDownRight,
  ShieldAlert, CheckCircle2, ChevronRight, Building2
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [isPending, startTransition] = useTransition();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargarMetricas = () => {
    setLoading(true);
    startTransition(async () => {
      const res = await getDashboardMetrics();
      if (res.success) setMetrics(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    cargarMetricas();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-bold animate-pulse">Cargando centro de mando ejecutivo...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-slate-500 font-medium">Error de conexión con la base de datos.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto min-h-[calc(100vh-6rem)] font-sans pb-12">

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-5 rounded-3xl gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-3.5 rounded-2xl text-white shadow-md shadow-indigo-600/20">
            <LayoutDashboard className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centro de Mando Mayorista</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Visión operativa y financiera en tiempo real para Sanu Distribuidora.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/logistica/hojas-de-ruta">
            <Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
              <Route className="h-4 w-4 mr-1.5" /> Hojas de Ruta
            </Button>
          </Link>
          <Link href="/ventas">
            <Button variant="outline" className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl">
              <Receipt className="h-4 w-4 mr-1.5 text-indigo-600" /> Facturación Mostrador
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. FILA DE KPIS EJECUTIVOS (5 TARJETAS MAESTRAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Facturación de Hoy */}
        <Card className="shadow-sm border-emerald-100 bg-emerald-50/40 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Ventas de Hoy</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">${metrics.ventasHoy.toLocaleString('es-AR')}</h3>
              </div>
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-emerald-700/80 mt-3">{metrics.cantidadVentasHoy} comprobante(s) emitido(s)</p>
          </CardContent>
        </Card>

        {/* Efectivo en Caja */}
        <Card className="shadow-sm border-slate-200 bg-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Link href="/caja" className="block h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Efectivo en Caja</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {metrics.cajaAbierta ? `$${metrics.efectivoEnCaja.toLocaleString('es-AR')}` : 'CERRADA'}
                  </h3>
                </div>
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-bold text-indigo-600 mt-3 flex items-center gap-1">
                {metrics.cajaAbierta ? "Turno operando en vivo" : "Abrir turno de caja"} <ChevronRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Cheques Próximos a Vencer (Semáforo) */}
        <Card className="shadow-sm border-amber-100 bg-amber-50/40 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Link href="/finanzas/cartera-valores" className="block h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Cheques a 7 Días</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">${metrics.chequesVencenProntoMonto.toLocaleString('es-AR')}</h3>
                </div>
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
                  <Landmark className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-bold text-amber-800 mt-3 flex items-center gap-1">
                {metrics.chequesVencenProntoCount} cheque(s) a cobrar <ChevronRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Capital en la Calle (Cuentas Corrientes) */}
        <Card className="shadow-sm border-indigo-100 bg-indigo-50/40 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Link href="/cuentas-corrientes" className="block h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Créditos en Calle</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">${metrics.deudaTotal.toLocaleString('es-AR')}</h3>
                </div>
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <BadgeDollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-bold text-indigo-700 mt-3 flex items-center gap-1">
                Gestionar saldos CC <ChevronRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Quiebres de Stock / Reposición */}
        <Card className="shadow-sm border-rose-100 bg-rose-50/40 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Link href="/compras/sugerido" className="block h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Punto de Pedido</p>
                  <h3 className="text-2xl font-black text-rose-700 mt-1">{metrics.totalBajoStock} u</h3>
                </div>
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-bold text-rose-800 mt-3 flex items-center gap-1">
                Ver Sugerido de Compras <ChevronRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Link>
        </Card>

      </div>

      {/* 2. BLOQUE OPERATIVO: LOGÍSTICA & RUTAS EN CALLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RUTAS Y CAMIONES ACTIVOS (2 Columnas) */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5 flex flex-row justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">Rutas de Reparto & Despacho Activas</CardTitle>
                <CardDescription className="text-xs text-slate-500">Camiones despachados hoy y en recorrido</CardDescription>
              </div>
            </div>
            <Link href="/logistica/hojas-de-ruta">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
                Ver Hojas de Ruta <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100 flex-1">
            {(!metrics.rutasActivas || metrics.rutasActivas.length === 0) ? (
              <div className="p-10 text-center text-slate-400 font-medium text-xs space-y-2">
                <Truck className="h-10 w-10 mx-auto opacity-30" />
                <p>No hay camiones en calle actualmente.</p>
                <Link href="/logistica/hojas-de-ruta">
                  <Button size="sm" className="bg-indigo-600 text-xs font-bold mt-2">Armar Hoja de Ruta</Button>
                </Link>
              </div>
            ) : (
              metrics.rutasActivas.map((ruta: any) => (
                <div key={ruta.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">Hoja de Ruta #{ruta.numero}</span>
                      <Badge className={`text-[10px] font-black uppercase ${
                        ruta.estado === 'EN_RUTA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {ruta.estado === 'EN_RUTA' ? '🚚 En Recorrido' : '📦 En Preparación'}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-600">
                      Chofer: <span className="text-indigo-600 font-extrabold">{ruta.repartidor?.nombre || 'Sin asignar'}</span> • Vehículo: {ruta.vehiculo || 'S/D'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Zona: {ruta.zona || 'General'} • {ruta.detalles?.length || 0} paradas / pedidos asignados
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/logistica/rendicion/${ruta.id}`}>
                      <Button size="sm" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl shadow-sm">
                        Rendir a Caja
                      </Button>
                    </Link>
                    <Link href={`/imprimir/hoja-de-ruta/${ruta.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200">
                        Imprimir Hoja
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ALERTAS DE CHEQUES PRÓXIMOS A VENCER (1 Columna) */}
        <Card className="shadow-sm border-slate-200 bg-white rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-amber-50/50 border-b border-amber-100 p-5 flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-black text-amber-950">Cheques a Vencer (7 Días)</CardTitle>
            </div>
            <Link href="/finanzas/cartera-valores">
              <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-amber-800 hover:bg-amber-100">
                Ver Cartera
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100 flex-1">
            {(!metrics.chequesVencenProntoLista || metrics.chequesVencenProntoLista.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                No hay cheques con vencimiento en los próximos 7 días.
              </div>
            ) : (
              metrics.chequesVencenProntoLista.map((ch: any) => (
                <div key={ch.id} className="p-3.5 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-xs text-slate-900">{ch.banco} N° {ch.numero_cheque}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{ch.cliente?.nombre_razon_social || ch.nombre_librador}</p>
                    <p className="text-[10px] font-mono text-amber-700 font-bold">Vence: {new Date(ch.fecha_cobro).toLocaleDateString('es-AR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-slate-900">${ch.monto.toLocaleString('es-AR')}</p>
                    <Badge className="text-[9px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                      {ch.tipo}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

      {/* 3. BLOQUE INFERIOR: VENTAS RECIENTES & QUIEBRES DE REPOSICIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* FEED DE ÚLTIMAS VENTAS (2 Columnas) */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5 flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-black text-slate-900">Últimos Comprobantes de Venta</CardTitle>
            </div>
            <Link href="/historial">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
                Ver Historial Completo <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase tracking-wider bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Comprobante</th>
                  <th className="px-5 py-3 font-semibold text-center">Estado Pago</th>
                  <th className="px-5 py-3 font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.ultimasVentas.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">No hay ventas registradas hoy.</td></tr>
                ) : (
                  metrics.ultimasVentas.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-900 truncate max-w-[180px]">{v.cliente.nombre_razon_social}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs font-mono">{v.tipo_comprobante.replace('_', ' ')} 000{v.punto_venta}-{v.numero_comprobante}</td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold ${v.estado_pago === 'PAGADO' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                          {v.estado_pago}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">${v.total.toLocaleString('es-AR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* QUIEBRES DE STOCK & ACCESOS RÁPIDOS (1 Columna) */}
        <div className="space-y-6">

          <Card className="shadow-sm border-rose-100 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-rose-50/50 border-b border-rose-100 p-4 flex flex-row justify-between items-center">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <CardTitle className="text-xs font-black text-rose-950 uppercase tracking-wider">Reposición Urgente</CardTitle>
              </div>
              <Link href="/compras/sugerido">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] font-bold text-rose-700 hover:bg-rose-100 p-1">
                  Sugerido
                </Button>
              </Link>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {metrics.productosBajoStock.length === 0 ? (
                <div className="p-6 text-center text-emerald-600 font-bold text-xs flex flex-col items-center gap-1">
                  <Check className="h-6 w-6" /> Stock de seguridad al 100%
                </div>
              ) : (
                metrics.productosBajoStock.map((p: any) => (
                  <div key={p.id} className="p-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="max-w-[180px]">
                      <p className="font-bold text-xs text-slate-800 truncate" title={p.nombre_producto}>{p.nombre_producto}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.codigo_articulo}</p>
                    </div>
                    <Badge variant="destructive" className="font-mono text-[10px] px-2 py-0.5 font-bold">
                      Quedan {p.stock_actual} u
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* ACCESOS RÁPIDOS */}
          <Card className="shadow-sm border-slate-200 bg-white rounded-3xl p-4 space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Accesos Directos</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/portal-b2b" target="_blank" className="w-full">
                <Button variant="outline" className="w-full h-11 border-indigo-100 bg-indigo-50/40 text-indigo-700 font-bold text-xs rounded-2xl hover:bg-indigo-100">
                  <Building2 className="h-4 w-4 mr-1 text-indigo-600" /> Portal B2B
                </Button>
              </Link>
              <Link href="/reportes/comisiones" className="w-full">
                <Button variant="outline" className="w-full h-11 border-amber-100 bg-amber-50/40 text-amber-800 font-bold text-xs rounded-2xl hover:bg-amber-100">
                  <Sparkles className="h-4 w-4 mr-1 text-amber-600" /> Comisiones
                </Button>
              </Link>
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}