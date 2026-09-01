"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  Users,
  Settings,
  BarChart4,
  Store,
  Wallet,
  ShieldCheck,
  Building2,
  Tag,
  Contact,
  ClipboardList,
  Replace,
  HardDrive,
  Truck,
  Sparkles,
  Route,
  Landmark,
  Award,
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Menu,
  X,
  Layers,
} from "lucide-react";
import { PedidosLink } from "@/components/pedidos-link";
import { ModuleHelpButton } from "@/components/module-help-modal";

interface AppSidebarProps {
  nombreUsuario: string;
  rolUsuario: string;
  esAdmin: boolean;
  permisos: string[];
  tenantNombre?: string;
  tenantSlug?: string;
  modulosActivos?: string[];
  logoutAction: () => void;
  children: React.ReactNode;
}

export function AppShell({
  nombreUsuario,
  rolUsuario,
  esAdmin,
  permisos,
  tenantNombre = "OnlyERP",
  tenantSlug,
  modulosActivos = [
    "VENTAS",
    "COMPRAS",
    "INVENTARIO",
    "CLIENTES",
    "PROVEEDORES",
    "LISTAS_PRECIO",
    "PRESUPUESTOS",
    "CAJA",
    "CUENTAS_CORRIENTES",
    "LOGISTICA",
    "CHEQUES",
    "WMS",
    "COMISIONES",
    "AFIP",
    "PORTAL_B2B",
    "VENDEDORES_PWA",
  ],
  logoutAction,
  children,
}: AppSidebarProps) {
  const pathname = usePathname();

  const [sidebarOculto, setSidebarOculto] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({
    mostrador: true,
    logistica: true,
    finanzas: false,
    stock: false,
    gerencia: false,
  });

  useEffect(() => {
    try {
      const savedSidebar = localStorage.getItem("onlyerp_sidebar_collapsed");
      if (savedSidebar !== null) setSidebarOculto(savedSidebar === "true");

      const savedSections = localStorage.getItem("onlyerp_sidebar_sections");
      if (savedSections) setSeccionesAbiertas(JSON.parse(savedSections));
    } catch {}
  }, []);

  const toggleSidebar = () => {
    const nuevo = !sidebarOculto;
    setSidebarOculto(nuevo);
    try {
      localStorage.setItem("onlyerp_sidebar_collapsed", String(nuevo));
    } catch {}
  };

  const toggleSeccion = (sec: string) => {
    setSeccionesAbiertas((prev) => {
      const nuevo = { ...prev, [sec]: !prev[sec] };
      try {
        localStorage.setItem("onlyerp_sidebar_sections", JSON.stringify(nuevo));
      } catch {}
      return nuevo;
    });
  };

  const hasMod = (mod: string) => modulosActivos.includes(mod);

  const getModuloActivo = () => {
    if (!pathname || pathname === "/") return "dashboard";
    if (pathname.startsWith("/ventas")) return "ventas";
    if (pathname.startsWith("/pedidos")) return "pedidos";
    if (pathname.startsWith("/logistica")) return "hojas-de-ruta";
    if (pathname.startsWith("/cuentas-corrientes")) return "cuentas-corrientes";
    if (pathname.startsWith("/finanzas")) return "cheques";
    if (pathname.startsWith("/inventario")) return "inventario";
    if (pathname.startsWith("/presupuestos")) return "presupuestos";
    if (pathname.startsWith("/portal-b2b")) return "portal-b2b";
    if (pathname.startsWith("/compras")) return "compras";
    if (pathname.startsWith("/configuracion")) return "configuracion";
    return "dashboard";
  };

  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:block print:overflow-visible bg-slate-100 dark:bg-zinc-950">
      {/* SIDEBAR CORPORATIVO ULTRA-PREMIUM (DARK MIDNIGHT) */}
      <aside
        className={`bg-[#090d16] border-r border-slate-800/80 flex flex-col shrink-0 print:hidden text-slate-300 transition-all duration-300 z-30 ${
          sidebarOculto ? "w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden" : "w-72 translate-x-0"
        } ${mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-72 translate-x-0" : "hidden md:flex"}`}
      >
        {/* BRANDING & LOGO */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/60 shrink-0 bg-[#070a12]">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-base tracking-tight text-white block leading-none truncate max-w-[140px]">
                {tenantNombre}
              </span>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">
                OnlyERP SaaS
              </span>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            title="Ocultar barra lateral"
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* OPERADOR ACTIVO */}
        <div className="p-3.5 mx-3 my-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-inner flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0">
            {nombreUsuario.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-white truncate leading-tight">{nombreUsuario}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                  esAdmin
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {esAdmin ? "Admin" : rolUsuario === "VENDEDOR" ? "Preventista" : "Cajero"}
              </span>
              <span className="text-[10px] text-slate-500 truncate">• {tenantSlug || "Central"}</span>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN CON CATEGORÍAS PLEGABLES Y FEATURE FLAGS */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 hide-scrollbar text-xs">
          {/* INICIO DIRECTO */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 font-bold rounded-xl transition-all ${
              pathname === "/"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-indigo-400" />
            <span>Panel de Control</span>
          </Link>

          {/* PILAR 1: MOSTRADOR & CAJA */}
          {(esAdmin || permisos.includes("VENTAS") || permisos.includes("CAJA") || permisos.includes("HISTORIAL")) && (
            <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/30">
              <button
                type="button"
                onClick={() => toggleSeccion("mostrador")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase text-indigo-400 tracking-wider hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3 w-3" /> 1. Mostrador & Caja
                </span>
                {seccionesAbiertas.mostrador ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {seccionesAbiertas.mostrador && (
                <div className="p-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  {hasMod("VENTAS") && (esAdmin || permisos.includes("VENTAS")) && (
                    <Link
                      href="/ventas"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname === "/ventas" ? "bg-indigo-600/30 text-indigo-200" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-indigo-400" /> Punto de Venta (POS)
                    </Link>
                  )}
                  {hasMod("CAJA") && (esAdmin || permisos.includes("CAJA")) && (
                    <Link
                      href="/caja"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname === "/caja" ? "bg-indigo-600/30 text-indigo-200" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Wallet className="h-3.5 w-3.5 text-slate-400" /> Caja Diaria
                    </Link>
                  )}
                  {(esAdmin || permisos.includes("HISTORIAL")) && (
                    <Link
                      href="/historial"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname === "/historial" ? "bg-indigo-600/30 text-indigo-200" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <History className="h-3.5 w-3.5 text-slate-400" /> Historial de Tickets
                    </Link>
                  )}
                  {hasMod("PRESUPUESTOS") && (esAdmin || permisos.includes("PRESUPUESTOS")) && (
                    <Link
                      href="/presupuestos"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname?.startsWith("/presupuestos") ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-emerald-400" /> Presupuestos
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PILAR 2: DISTRIBUCIÓN & LOGÍSTICA (GATED) */}
          {(hasMod("LOGISTICA") || hasMod("VENDEDORES_PWA")) && (esAdmin || permisos.includes("VENTAS")) && (
            <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/30">
              <button
                type="button"
                onClick={() => toggleSeccion("logistica")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase text-amber-400 tracking-wider hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3 w-3" /> 2. Logística & Reparto
                </span>
                {seccionesAbiertas.logistica ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {seccionesAbiertas.logistica && (
                <div className="p-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  <PedidosLink />
                  {hasMod("LOGISTICA") && (
                    <Link
                      href="/logistica/hojas-de-ruta"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname?.startsWith("/logistica") ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Route className="h-3.5 w-3.5 text-amber-400" /> Hojas de Ruta & Despacho
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PILAR 3: FINANZAS & VALORES */}
          {(hasMod("CUENTAS_CORRIENTES") || hasMod("CHEQUES")) && (esAdmin || permisos.includes("CLIENTES") || permisos.includes("CAJA")) && (
            <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/30">
              <button
                type="button"
                onClick={() => toggleSeccion("finanzas")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase text-emerald-400 tracking-wider hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3 w-3" /> 3. Finanzas & Valores
                </span>
                {seccionesAbiertas.finanzas ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {seccionesAbiertas.finanzas && (
                <div className="p-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  {hasMod("CUENTAS_CORRIENTES") && (
                    <Link
                      href="/cuentas-corrientes"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname?.startsWith("/cuentas-corrientes") ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 text-emerald-400" /> Cuentas Corrientes
                    </Link>
                  )}
                  {hasMod("CHEQUES") && (
                    <Link
                      href="/finanzas/cartera-valores"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname?.startsWith("/finanzas") ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Landmark className="h-3.5 w-3.5 text-emerald-400" /> Cartera de Cheques & eCheqs
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PILAR 4: STOCK & ABASTECIMIENTO */}
          {(esAdmin || permisos.includes("INVENTARIO")) && (
            <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/30">
              <button
                type="button"
                onClick={() => toggleSeccion("stock")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase text-blue-400 tracking-wider hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Package className="h-3 w-3" /> 4. Stock & Compras
                </span>
                {seccionesAbiertas.stock ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {seccionesAbiertas.stock && (
                <div className="p-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  <Link
                    href="/inventario"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                      pathname?.startsWith("/inventario") ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5 text-blue-400" /> Productos e Inventario
                  </Link>
                  {hasMod("COMPRAS") && (
                    <>
                      <Link
                        href="/compras/sugerido"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/compras/sugerido" ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Sugerido de Compras
                      </Link>
                      <Link
                        href="/compras"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/compras" ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Wallet className="h-3.5 w-3.5 text-slate-400" /> Compras a Proveedores
                      </Link>
                    </>
                  )}
                  <Link
                    href="/transferencias"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                      pathname === "/transferencias" ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <Replace className="h-3.5 w-3.5 text-slate-400" /> Transferencias Stock
                  </Link>
                  <Link
                    href="/combos"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                      pathname === "/combos" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Combos y Promociones
                  </Link>
                  {hasMod("LISTAS_PRECIO") && (
                    <Link
                      href="/listas-precio"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname === "/listas-precio" ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5 text-slate-400" /> Listas de Precios
                    </Link>
                  )}
                  {hasMod("PROVEEDORES") && (
                    <Link
                      href="/proveedores"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname === "/proveedores" ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5 text-slate-400" /> Proveedores & Marcas
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PILAR 5: GERENCIA & CONFIGURACIÓN */}
          {(esAdmin || permisos.includes("REPORTES") || permisos.includes("CONFIGURACION") || permisos.includes("CLIENTES")) && (
            <div className="rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/30">
              <button
                type="button"
                onClick={() => toggleSeccion("gerencia")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase text-purple-400 tracking-wider hover:bg-slate-800/40 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <BarChart4 className="h-3 w-3" /> 5. Gerencia & Control
                </span>
                {seccionesAbiertas.gerencia ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {seccionesAbiertas.gerencia && (
                <div className="p-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  {hasMod("CLIENTES") && (esAdmin || permisos.includes("CLIENTES")) && (
                    <Link
                      href="/clientes"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                        pathname === "/clientes" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Contact className="h-3.5 w-3.5 text-purple-400" /> Directorio Clientes
                    </Link>
                  )}

                  {(esAdmin || permisos.includes("REPORTES")) && (
                    <>
                      <Link
                        href="/reportes"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/reportes" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <BarChart4 className="h-3.5 w-3.5 text-purple-400" /> Reportes & Métricas
                      </Link>
                      {hasMod("COMISIONES") && (
                        <Link
                          href="/reportes/comisiones"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                            pathname === "/reportes/comisiones" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <Award className="h-3.5 w-3.5 text-purple-400" /> Liquidación Comisiones
                        </Link>
                      )}
                      {hasMod("VENDEDORES_PWA") && (
                        <Link
                          href="/reportes/vendedores"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                            pathname === "/reportes/vendedores" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <Users className="h-3.5 w-3.5 text-purple-400" /> Rendimiento Preventa
                        </Link>
                      )}
                    </>
                  )}

                  {esAdmin && (
                    <>
                      <Link
                        href="/configuracion/comercial"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/configuracion/comercial" ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Tag className="h-3.5 w-3.5 text-indigo-400" /> Reglas Comerciales & IVA
                      </Link>
                      <Link
                        href="/usuarios"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/usuarios" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Usuarios & Roles
                      </Link>
                      <Link
                        href="/configuracion/sucursales"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/configuracion/sucursales" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5 text-slate-400" /> Sucursales & Depósitos
                      </Link>
                      <Link
                        href="/configuracion"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/configuracion" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" /> Datos Empresa (AFIP)
                      </Link>
                      <Link
                        href="/importar"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                          pathname === "/importar" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <HardDrive className="h-3.5 w-3.5 text-slate-400" /> Importador Excel
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* BOTÓN CERRAR SESIÓN */}
        <div className="p-3 border-t border-slate-800/60 bg-[#070a12] shrink-0">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CON TOPBAR */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* BARRA SUPERIOR GLOBAL */}
        <header className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-xs z-20 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              title={sidebarOculto ? "Mostrar menú lateral" : "Ocultar menú lateral"}
              className="hidden md:flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {sidebarOculto ? <PanelLeftOpen className="h-4 w-4 text-indigo-600" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{tenantNombre} • Sistema de Gestión</span>
            </div>
          </div>

          {/* AYUDA CONTEXTUAL */}
          <div className="flex items-center gap-2">
            <ModuleHelpButton moduloId={getModuloActivo()} />
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-zinc-950 print:overflow-visible print:p-0 print:bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
