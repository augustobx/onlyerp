'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
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
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { PedidosLink } from '@/components/pedidos-link';
import { ModuleHelpButton } from '@/components/module-help-modal';
import { PaletteSelector } from './PaletteSelector';
import { useERPTheme } from './ThemeContext';
import { PALETTES } from './palettes';
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
  const { palette, setPalette, isDark, toggleDarkMode, setTheme } = useERPTheme();
  const [plegado, setPlegado] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ texto: string; top: number } | null>(null);

  // Menú flotante de Configuración rápida en el footer
  const [menuConfigAbierto, setMenuConfigAbierto] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number }>({ bottom: 70, left: 16 });
  const configBtnRef = useRef<HTMLButtonElement>(null);
  const configMenuRef = useRef<HTMLDivElement>(null);

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

  // Cerrar menú de configuración al cambiar de ruta
  useEffect(() => {
    setMenuConfigAbierto(false);
  }, [pathname]);

  // Cerrar menú con clic afuera o con tecla Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        configMenuRef.current &&
        !configMenuRef.current.contains(e.target as Node) &&
        configBtnRef.current &&
        !configBtnRef.current.contains(e.target as Node)
      ) {
        setMenuConfigAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuConfigAbierto(false);
    };

    if (menuConfigAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuConfigAbierto]);

  const handleToggleConfig = () => {
    if (!menuConfigAbierto && configBtnRef.current) {
      const rect = configBtnRef.current.getBoundingClientRect();
      if (plegado) {
        setMenuPos({
          bottom: Math.max(16, window.innerHeight - rect.bottom),
          left: PLEGADO_W + 12,
        });
      } else {
        setMenuPos({
          bottom: Math.max(16, window.innerHeight - rect.top + 8),
          left: Math.max(12, rect.left),
        });
      }
    }
    setMenuConfigAbierto((prev) => !prev);
  };

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
    <div className="bh-layout theme-nanolabs print:block print:min-h-0 print:h-auto print:bg-white" data-nl-theme="2">
      {/* HEADER 80px */}
      <header className="bh-header bh-header--retail print:hidden">
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

          {/* Selector de Paletas de color oficial */}
          <PaletteSelector />

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
      <div className="bh-layout__body print:block print:w-full">
        <aside
          className={`bh-sidebar print:hidden${plegado ? ' bh-sidebar--collapsed' : ''}`}
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
                      <Link style={{ display: hasMod('VENTAS') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('CAJA') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('VENTAS') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('PRESUPUESTOS') ? undefined : 'none' }}
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
                    <Link style={{ display: hasMod('VENTAS') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('LOGISTICA') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('CUENTAS_CORRIENTES') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('CHEQUES') ? undefined : 'none' }}
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
                    <Link style={{ display: hasMod('INVENTARIO') ? undefined : 'none' }}
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
                        <Link style={{ display: hasMod('COMPRAS') ? undefined : 'none' }}
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
                        <Link style={{ display: hasMod('COMPRAS') ? undefined : 'none' }}
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

                    <Link style={{ display: hasMod('INVENTARIO') ? undefined : 'none' }}
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

                    <Link style={{ display: hasMod('INVENTARIO') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('LISTAS_PRECIO') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('PROVEEDORES') ? undefined : 'none' }}
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
                      <Link style={{ display: hasMod('CLIENTES') ? undefined : 'none' }}
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
                          <Link style={{ display: hasMod('COMISIONES') ? undefined : 'none' }}
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
                          <Link style={{ display: hasMod('VENDEDORES_PWA') ? undefined : 'none' }}
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

                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER DEL SIDEBAR: CONFIGURACIÓN + MODO OSCURO + PLEGADO */}
          <div className={`bh-sidebar__footer${plegado ? ' bh-sidebar__footer--collapsed' : ''}`}>
            {/* BOTÓN CONFIGURACIÓN RÁPIDA (COLOR, AFIP, IMPORTADOR) */}
            <button
              ref={configBtnRef}
              type="button"
              className={`bh-sidebar__icon-btn cursor-pointer ${
                menuConfigAbierto ? 'active bg-slate-100 dark:bg-[#181c28] text-primary' : ''
              }`}
              onClick={handleToggleConfig}
              aria-label="Configuración rápida (Color, AFIP, Importador)"
              title="Configuración rápida (Color, AFIP, Importador)"
            >
              <Settings
                size={18}
                className={menuConfigAbierto ? 'rotate-45 transition-transform' : 'transition-transform'}
              />
            </button>

            {/* MODO OSCURO */}
            <button
              type="button"
              className="bh-sidebar__icon-btn cursor-pointer"
              onClick={toggleDarkMode}
              aria-label="Cambiar tema claro u oscuro"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* PLEGADO */}
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
        <main className="bh-main bh-cascada ot-pagina min-w-0 flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0 print:m-0 print:bg-white print:w-full print:block">
          {children}
        </main>
      </div>

      {/* POPUP FLOTANTE DE CONFIGURACIÓN (COLOR, AFIP, IMPORTADOR) */}
      {mounted &&
        menuConfigAbierto &&
        createPortal(
          <>
            {/* Backdrop para cerrar al hacer clic afuera */}
            <div
              className="fixed inset-0 z-[1040] bg-black/15 dark:bg-black/40 backdrop-blur-[1px] transition-opacity print:hidden"
              onClick={() => setMenuConfigAbierto(false)}
            />

            {/* Tarjeta flotante de configuración */}
            <div
              ref={configMenuRef}
              className="fixed z-[1050] w-84 rounded-3xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#2b3347] shadow-2xl p-4.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 font-sans print:hidden"
              style={{
                bottom: menuPos.bottom,
                left: menuPos.left,
                maxWidth: 'calc(100vw - 24px)',
              }}
            >
              {/* Encabezado */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2b3347]">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                    style={{ background: palette.gradient }}
                  >
                    <Settings size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-[#f8fafc]">
                      Configuración
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-[#94a3b8]">OnlyERP · Ajustes del Sistema</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuConfigAbierto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#f8fafc] hover:bg-slate-100 dark:hover:bg-[#181c28] cursor-pointer"
                  title="Cerrar"
                >
                  <X size={15} />
                </button>
              </div>

              {/* 1. CONFIGURACIÓN DE COLOR & APARIENCIA */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#181c28] border border-slate-200/80 dark:border-[#2b3347] space-y-2">
                <div className="flex items-center justify-between">
                  <Link
                    href="/configuracion/apariencia"
                    onClick={() => setMenuConfigAbierto(false)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-[#f8fafc] hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <Palette size={15} className="text-amber-500 shrink-0" />
                    <span>Config de Color & Tema</span>
                  </Link>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isDark ? palette.darkSubtlest : palette.subtlest,
                      color: palette.primary,
                    }}
                  >
                    {palette.badge}
                  </span>
                </div>

                {/* Paletas de 1 clic */}
                <div className="flex items-center justify-between pt-1">
                  {Object.values(PALETTES).map((p) => {
                    const isSelected = p.id === palette.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPalette(p.id)}
                        title={`Paleta ${p.name}`}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                          isSelected
                            ? 'scale-115 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#181c28]'
                            : 'hover:scale-110 opacity-75 hover:opacity-100'
                        }`}
                        style={{
                          background: p.gradient,
                          boxShadow: isSelected ? `0 2px 8px ${p.glow}` : undefined,
                        }}
                      >
                        {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. CONFIGURACIÓN DE AFIP & EMPRESA */}
              <Link
                href="/configuracion"
                onClick={() => setMenuConfigAbierto(false)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isActive('/configuracion') &&
                  !isActive('/configuracion/comercial') &&
                  !isActive('/configuracion/sucursales') &&
                  !isActive('/configuracion/apariencia')
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'bg-white dark:bg-[#131722] border-slate-200 dark:border-[#2b3347] hover:bg-slate-50 dark:hover:bg-[#181c28] text-slate-800 dark:text-[#f8fafc]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Store size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{hasMod('AFIP') ? 'Configuración de AFIP' : 'Configuración de empresa'}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#94a3b8] mt-0.5">
                      Empresa, CUIT y facturación
                    </p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 dark:text-[#94a3b8] shrink-0" />
              </Link>

              {/* 3. IMPORTADOR EXCEL */}
              <Link style={{ display: hasMod('INVENTARIO') ? undefined : 'none' }}
                href="/importar"
                onClick={() => setMenuConfigAbierto(false)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isActive('/importar')
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'bg-white dark:bg-[#131722] border-slate-200 dark:border-[#2b3347] hover:bg-slate-50 dark:hover:bg-[#181c28] text-slate-800 dark:text-[#f8fafc]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <HardDrive size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Importador Masivo</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#94a3b8] mt-0.5">
                      Planillas Excel de artículos y stock
                    </p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 dark:text-[#94a3b8] shrink-0" />
              </Link>

              {/* ACCESOS ADMINISTRATIVOS ADICIONALES */}
              {esAdmin && (
                <div className="pt-2 border-t border-slate-100 dark:border-[#2b3347] flex items-center justify-between gap-1.5">
                  <Link
                    href="/usuarios"
                    onClick={() => setMenuConfigAbierto(false)}
                    className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#181c28] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck size={13} className="text-indigo-500" />
                    <span>Usuarios</span>
                  </Link>
                  <Link
                    href="/configuracion/sucursales"
                    onClick={() => setMenuConfigAbierto(false)}
                    className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#181c28] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Store size={13} className="text-amber-500" />
                    <span>Sucursales</span>
                  </Link>
                  <Link
                    href="/configuracion/comercial"
                    onClick={() => setMenuConfigAbierto(false)}
                    className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#181c28] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Tag size={13} className="text-rose-500" />
                    <span>Reglas</span>
                  </Link>
                </div>
              )}
            </div>
          </>,
          document.body
        )}

      {/* TOOLTIP FLOTANTE EN SIDEBAR PLEGADO */}
      {mounted &&
        tooltip &&
        createPortal(
          <span
            className="bh-sidebar__tooltip ot-tooltip print:hidden"
            style={{ top: tooltip.top, left: PLEGADO_W + 10, zIndex: 1000 }}
          >
            {tooltip.texto}
          </span>,
          document.body
        )}
    </div>
  );
}
