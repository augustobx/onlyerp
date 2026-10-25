'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Layers,
} from 'lucide-react';
import { PedidosLink } from '@/components/pedidos-link';
import { ModuleHelpButton } from '@/components/module-help-modal';
import { PaletteSelector } from './PaletteSelector';
import { useERPTheme } from './ThemeContext';
import './nanolabs-theme.css';
import './nanolabs-theme-extra.css';

const CLAVE_PLEGADO = 'onlyerp-sidebar-plegado';
const PLEGADO_W = 76;

function iniciales(nombre: string): string {
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export interface LayoutNanoLabsProps {
  nombreUsuario: string;
  rolUsuario: string;
  esAdmin: boolean;
  permisos: string[];
  tenantNombre?: string;
  tenantSlug?: string;
  modulosActivos?: string[];
  logoutAction: () => void;
  children: ReactNode;
}

export function LayoutNanoLabs({
  nombreUsuario,
  rolUsuario,
  esAdmin,
  permisos,
  tenantNombre = 'OnlyERP',
  tenantSlug,
  modulosActivos = [
    'VENTAS',
    'COMPRAS',
    'INVENTARIO',
    'CLIENTES',
    'PROVEEDORES',
    'LISTAS_PRECIO',
    'PRESUPUESTOS',
    'CAJA',
    'CUENTAS_CORRIENTES',
    'LOGISTICA',
    'CHEQUES',
    'WMS',
    'COMISIONES',
    'AFIP',
    'PORTAL_B2B',
    'VENDEDORES_PWA',
  ],
  logoutAction,
  children,
}: LayoutNanoLabsProps) {
  const pathname = usePathname();
  const { palette, isDark, toggleDarkMode, setTheme } = useERPTheme();
  const [plegado, setPlegado] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ texto: string; top: number } | null>(null);

  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({
    mostrador: true,
    logistica: true,
    finanzas: false,
    stock: false,
    gerencia: false,
  });

  useEffect(() => {
    setMounted(true);
    try {
      const savedPlegado = localStorage.getItem(CLAVE_PLEGADO);
      if (savedPlegado !== null) setPlegado(savedPlegado === '1');

      const savedSections = localStorage.getItem('onlyerp_nl_sections');
      if (savedSections) setSeccionesAbiertas(JSON.parse(savedSections));
    } catch {}
  }, []);

  const togglePlegado = () => {
    setPlegado((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CLAVE_PLEGADO, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const toggleSeccion = (sec: string) => {
    setSeccionesAbiertas((prev) => {
      const nuevo = { ...prev, [sec]: !prev[sec] };
      try {
        localStorage.setItem('onlyerp_nl_sections', JSON.stringify(nuevo));
      } catch {}
      return nuevo;
    });
  };

  const hasMod = (mod: string) => modulosActivos.includes(mod);

  const isActive = (ruta: string) => {
    if (ruta === '/') return pathname === '/';
    return pathname === ruta || pathname.startsWith(ruta + '/');
  };

  const getModuloActivo = () => {
    if (!pathname || pathname === '/') return 'dashboard';
    if (pathname.startsWith('/ventas')) return 'ventas';
    if (pathname.startsWith('/pedidos')) return 'pedidos';
    if (pathname.startsWith('/logistica')) return 'hojas-de-ruta';
    if (pathname.startsWith('/cuentas-corrientes')) return 'cuentas-corrientes';
    if (pathname.startsWith('/finanzas')) return 'cheques';
    if (pathname.startsWith('/inventario')) return 'inventario';
    if (pathname.startsWith('/presupuestos')) return 'presupuestos';
    if (pathname.startsWith('/portal-b2b')) return 'portal-b2b';
    if (pathname.startsWith('/compras')) return 'compras';
    if (pathname.startsWith('/configuracion')) return 'configuracion';
    return 'dashboard';
  };

  return (
    <div className="bh-layout theme-nanolabs" data-nl-theme="2">
      {/* HEADER 80px */}
      <header className="bh-header bh-header--retail">
        <Link href="/" className="bh-logo" style={{ textDecoration: 'none' }}>
          <div className="bh-logo__mark">
            <span
              className="ot-mark nl-mark"
              style={{
                background: palette.gradient,
                boxShadow: `0 4px 14px ${palette.glow}`,
              }}
            >
              <Store size={22} strokeWidth={2.2} />
            </span>
          </div>
          <div className="bh-logo__text">
            {tenantNombre}
            <span>OnlyERP · NanoLabs Cloud</span>
          </div>
        </Link>

        <div className="bh-header__actions">
          {/* Ayuda contextual del módulo activo */}
          <div className="hidden sm:flex items-center">
            <ModuleHelpButton moduloId={getModuloActivo()} />
          </div>

          {/* Selector de Paletas de color */}
          <PaletteSelector />

          {/* Selector interactivo de Tema 1 vs Tema 2 */}
          <button
            type="button"
            onClick={() => setTheme('1')}
            className="bh-btn bh-btn-secondary bh-btn--small flex items-center gap-1.5 font-bold cursor-pointer"
            title="Estás en Tema 2 (NanoLabs Visual). Clic para volver a Tema 1 (Clásico)"
          >
            <Palette size={14} className="text-amber-500 shrink-0" />
            <span className="hidden md:inline text-xs">Tema 2</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-extrabold uppercase tracking-wider">
              Volver a Tema 1
            </span>
          </button>

          {/* Info del usuario y rol */}
          <div className="ot-usuario" title={`${nombreUsuario} (${rolUsuario})`}>
            <div className="bh-list-primary font-bold">{nombreUsuario}</div>
            <div className="bh-list-secondary text-xs uppercase tracking-wider font-semibold opacity-75">
              {esAdmin ? 'Admin' : rolUsuario === 'VENDEDOR' ? 'Preventista' : 'Operador'}
            </div>
          </div>

          {/* Avatar con iniciales */}
          <div className="bh-avatar" title={nombreUsuario}>
            {iniciales(nombreUsuario)}
          </div>

          {/* Botón cerrar sesión */}
          <form action={logoutAction} className="inline-flex">
            <button
              type="submit"
              className="bh-header__icon-btn text-rose-500 hover:text-rose-700 cursor-pointer"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      {/* BODY CON SIDEBAR PLEGABLE */}
      <div className="bh-layout__body">
        <aside
          className={`bh-sidebar${plegado ? ' bh-sidebar--collapsed' : ''}`}
          aria-label="Menú de Navegación OnlyERP"
          style={plegado ? { ['--bh-sidebar-width' as string]: `${PLEGADO_W}px` } : undefined}
        >
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {/* INICIO */}
            <Link
              href="/"
              className={`bh-sidebar__item${isActive('/') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
              onMouseEnter={(e) => {
                if (!plegado) return;
                const r = e.currentTarget.getBoundingClientRect();
                setTooltip({ texto: 'Panel de Control', top: r.top + r.height / 2 });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className="bh-sidebar__icon-chip">
                <LayoutDashboard size={17} strokeWidth={2} />
              </span>
              {!plegado && <span className="truncate">Panel de Control</span>}
            </Link>

            {/* SECCIÓN 1: MOSTRADOR & CAJA */}
            {(esAdmin || permisos.includes('VENTAS') || permisos.includes('CAJA') || permisos.includes('HISTORIAL')) && (
              <div className="my-1">
                {!plegado && (
                  <button
                    type="button"
                    onClick={() => toggleSeccion('mostrador')}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart size={13} /> 1. Mostrador & Caja
                    </span>
                    {seccionesAbiertas.mostrador ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}

                {(plegado || seccionesAbiertas.mostrador) && (
                  <div className="space-y-0.5">
                    {hasMod('VENTAS') && (esAdmin || permisos.includes('VENTAS')) && (
                      <Link
                        href="/ventas"
                        className={`bh-sidebar__item${isActive('/ventas') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Punto de Venta (POS)', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <ShoppingCart size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Punto de Venta</span>}
                      </Link>
                    )}

                    {hasMod('CAJA') && (esAdmin || permisos.includes('CAJA')) && (
                      <Link
                        href="/caja"
                        className={`bh-sidebar__item${isActive('/caja') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Caja Diaria', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Wallet size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Caja Diaria</span>}
                      </Link>
                    )}

                    {(esAdmin || permisos.includes('HISTORIAL')) && (
                      <Link
                        href="/historial"
                        className={`bh-sidebar__item${isActive('/historial') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Historial de Tickets', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <History size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Historial Tickets</span>}
                      </Link>
                    )}

                    {hasMod('PRESUPUESTOS') && (esAdmin || permisos.includes('PRESUPUESTOS')) && (
                      <Link
                        href="/presupuestos"
                        className={`bh-sidebar__item${isActive('/presupuestos') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Presupuestos', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <ClipboardList size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Presupuestos</span>}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 2: LOGÍSTICA & REPARTO */}
            {(hasMod('LOGISTICA') || hasMod('VENDEDORES_PWA')) && (esAdmin || permisos.includes('VENTAS')) && (
              <div className="my-1">
                {!plegado && (
                  <button
                    type="button"
                    onClick={() => toggleSeccion('logistica')}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <Truck size={13} /> 2. Logística & Reparto
                    </span>
                    {seccionesAbiertas.logistica ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}

                {(plegado || seccionesAbiertas.logistica) && (
                  <div className="space-y-0.5">
                    <Link
                      href="/pedidos"
                      className={`bh-sidebar__item${isActive('/pedidos') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                      onMouseEnter={(e) => {
                        if (!plegado) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setTooltip({ texto: 'Pedidos Preventa', top: r.top + r.height / 2 });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="bh-sidebar__icon-chip">
                        <Truck size={17} strokeWidth={2} />
                      </span>
                      {!plegado && <span className="truncate">Pedidos Preventa</span>}
                    </Link>

                    {hasMod('LOGISTICA') && (
                      <Link
                        href="/logistica/hojas-de-ruta"
                        className={`bh-sidebar__item${isActive('/logistica') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Hojas de Ruta & Despacho', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Route size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Hojas de Ruta</span>}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 3: FINANZAS & VALORES */}
            {(hasMod('CUENTAS_CORRIENTES') || hasMod('CHEQUES')) && (esAdmin || permisos.includes('CLIENTES') || permisos.includes('CAJA')) && (
              <div className="my-1">
                {!plegado && (
                  <button
                    type="button"
                    onClick={() => toggleSeccion('finanzas')}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <Landmark size={13} /> 3. Finanzas & Valores
                    </span>
                    {seccionesAbiertas.finanzas ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}

                {(plegado || seccionesAbiertas.finanzas) && (
                  <div className="space-y-0.5">
                    {hasMod('CUENTAS_CORRIENTES') && (
                      <Link
                        href="/cuentas-corrientes"
                        className={`bh-sidebar__item${isActive('/cuentas-corrientes') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Cuentas Corrientes', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Users size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Cuentas Corrientes</span>}
                      </Link>
                    )}

                    {hasMod('CHEQUES') && (
                      <Link
                        href="/finanzas/cartera-valores"
                        className={`bh-sidebar__item${isActive('/finanzas') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Cartera de Cheques & eCheqs', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Landmark size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Cheques y Valores</span>}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 4: STOCK & COMPRAS */}
            {(esAdmin || permisos.includes('INVENTARIO')) && (
              <div className="my-1">
                {!plegado && (
                  <button
                    type="button"
                    onClick={() => toggleSeccion('stock')}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <Package size={13} /> 4. Stock & Compras
                    </span>
                    {seccionesAbiertas.stock ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}

                {(plegado || seccionesAbiertas.stock) && (
                  <div className="space-y-0.5">
                    <Link
                      href="/inventario"
                      className={`bh-sidebar__item${isActive('/inventario') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                      onMouseEnter={(e) => {
                        if (!plegado) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setTooltip({ texto: 'Productos e Inventario', top: r.top + r.height / 2 });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="bh-sidebar__icon-chip">
                        <Package size={17} strokeWidth={2} />
                      </span>
                      {!plegado && <span className="truncate">Inventario & Stock</span>}
                    </Link>

                    {hasMod('COMPRAS') && (
                      <>
                        <Link
                          href="/compras/sugerido"
                          className={`bh-sidebar__item${isActive('/compras/sugerido') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Sugerido de Compras', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <Sparkles size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Sugerido Compras</span>}
                        </Link>
                        <Link
                          href="/compras"
                          className={`bh-sidebar__item${isActive('/compras') && !isActive('/compras/sugerido') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Compras a Proveedores', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <Wallet size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Compras</span>}
                        </Link>
                      </>
                    )}

                    <Link
                      href="/transferencias"
                      className={`bh-sidebar__item${isActive('/transferencias') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                      onMouseEnter={(e) => {
                        if (!plegado) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setTooltip({ texto: 'Transferencias de Stock', top: r.top + r.height / 2 });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="bh-sidebar__icon-chip">
                        <Replace size={17} strokeWidth={2} />
                      </span>
                      {!plegado && <span className="truncate">Transferencias</span>}
                    </Link>

                    <Link
                      href="/combos"
                      className={`bh-sidebar__item${isActive('/combos') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                      onMouseEnter={(e) => {
                        if (!plegado) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setTooltip({ texto: 'Combos y Promociones', top: r.top + r.height / 2 });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="bh-sidebar__icon-chip">
                        <Sparkles size={17} strokeWidth={2} />
                      </span>
                      {!plegado && <span className="truncate">Combos</span>}
                    </Link>

                    {hasMod('LISTAS_PRECIO') && (
                      <Link
                        href="/listas-precio"
                        className={`bh-sidebar__item${isActive('/listas-precio') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Listas de Precios', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Tag size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Listas de Precio</span>}
                      </Link>
                    )}

                    {hasMod('PROVEEDORES') && (
                      <Link
                        href="/proveedores"
                        className={`bh-sidebar__item${isActive('/proveedores') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Proveedores & Marcas', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Building2 size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Proveedores</span>}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 5: GERENCIA & CONTROL */}
            {(esAdmin || permisos.includes('REPORTES') || permisos.includes('CONFIGURACION') || permisos.includes('CLIENTES')) && (
              <div className="my-1">
                {!plegado && (
                  <button
                    type="button"
                    onClick={() => toggleSeccion('gerencia')}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <BarChart4 size={13} /> 5. Gerencia & Control
                    </span>
                    {seccionesAbiertas.gerencia ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}

                {(plegado || seccionesAbiertas.gerencia) && (
                  <div className="space-y-0.5">
                    {hasMod('CLIENTES') && (esAdmin || permisos.includes('CLIENTES')) && (
                      <Link
                        href="/clientes"
                        className={`bh-sidebar__item${isActive('/clientes') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                        onMouseEnter={(e) => {
                          if (!plegado) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ texto: 'Directorio Clientes', top: r.top + r.height / 2 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="bh-sidebar__icon-chip">
                          <Contact size={17} strokeWidth={2} />
                        </span>
                        {!plegado && <span className="truncate">Clientes</span>}
                      </Link>
                    )}

                    {(esAdmin || permisos.includes('REPORTES')) && (
                      <>
                        <Link
                          href="/reportes"
                          className={`bh-sidebar__item${isActive('/reportes') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Reportes & Métricas', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <BarChart4 size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Reportes</span>}
                        </Link>

                        {hasMod('COMISIONES') && (
                          <Link
                            href="/reportes/comisiones"
                            className={`bh-sidebar__item${isActive('/reportes/comisiones') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                            onMouseEnter={(e) => {
                              if (!plegado) return;
                              const r = e.currentTarget.getBoundingClientRect();
                              setTooltip({ texto: 'Liquidación de Comisiones', top: r.top + r.height / 2 });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className="bh-sidebar__icon-chip">
                              <Award size={17} strokeWidth={2} />
                            </span>
                            {!plegado && <span className="truncate">Comisiones</span>}
                          </Link>
                        )}

                        {hasMod('VENDEDORES_PWA') && (
                          <Link
                            href="/reportes/vendedores"
                            className={`bh-sidebar__item${isActive('/reportes/vendedores') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                            onMouseEnter={(e) => {
                              if (!plegado) return;
                              const r = e.currentTarget.getBoundingClientRect();
                              setTooltip({ texto: 'Rendimiento Preventa', top: r.top + r.height / 2 });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className="bh-sidebar__icon-chip">
                              <Users size={17} strokeWidth={2} />
                            </span>
                            {!plegado && <span className="truncate">Rendimiento Venta</span>}
                          </Link>
                        )}
                      </>
                    )}

                    {esAdmin && (
                      <>
                        <Link
                          href="/configuracion/comercial"
                          className={`bh-sidebar__item${isActive('/configuracion/comercial') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Reglas Comerciales & IVA', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <Tag size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Reglas Comerciales</span>}
                        </Link>

                        <Link
                          href="/usuarios"
                          className={`bh-sidebar__item${isActive('/usuarios') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Usuarios & Roles', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <ShieldCheck size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Usuarios & Roles</span>}
                        </Link>

                        <Link
                          href="/configuracion/sucursales"
                          className={`bh-sidebar__item${isActive('/configuracion/sucursales') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Sucursales & Depósitos', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <Store size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Sucursales</span>}
                        </Link>

                        <Link
                          href="/configuracion"
                          className={`bh-sidebar__item${isActive('/configuracion') && !isActive('/configuracion/comercial') && !isActive('/configuracion/sucursales') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Datos Empresa (AFIP)', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <Settings size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Empresa (AFIP)</span>}
                        </Link>

                        <Link
                          href="/importar"
                          className={`bh-sidebar__item${isActive('/importar') ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                          onMouseEnter={(e) => {
                            if (!plegado) return;
                            const r = e.currentTarget.getBoundingClientRect();
                            setTooltip({ texto: 'Importador Excel', top: r.top + r.height / 2 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="bh-sidebar__icon-chip">
                            <HardDrive size={17} strokeWidth={2} />
                          </span>
                          {!plegado && <span className="truncate">Importador</span>}
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER DEL SIDEBAR: MODO OSCURO + PLEGADO */}
          <div className={`bh-sidebar__footer${plegado ? ' bh-sidebar__footer--collapsed' : ''}`}>
            <button
              type="button"
              className="bh-sidebar__icon-btn cursor-pointer"
              onClick={toggleDarkMode}
              aria-label="Cambiar tema claro u oscuro"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className="bh-sidebar__icon-btn bh-sidebar__desktop-only cursor-pointer"
              onClick={togglePlegado}
              aria-label={plegado ? 'Expandir menú' : 'Plegar menú'}
              title={plegado ? 'Expandir menú' : 'Plegar menú'}
            >
              {plegado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="bh-main bh-cascada ot-pagina min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* TOOLTIP FLOTANTE EN SIDEBAR PLEGADO */}
      {mounted &&
        tooltip &&
        createPortal(
          <span
            className="bh-sidebar__tooltip ot-tooltip"
            style={{ top: tooltip.top, left: PLEGADO_W + 10, zIndex: 1000 }}
          >
            {tooltip.texto}
          </span>,
          document.body
        )}
    </div>
  );
}
