'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

/* ==========================================================================
   TEMA CLARO / OSCURO (data-theme en <html>)
   ========================================================================== */
const CLAVE_TEMA = 'nl-theme';

export function useTema() {
  const [tema, setTema] = useState<string>('light');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const actual =
        document.documentElement.getAttribute('data-theme') ||
        localStorage.getItem(CLAVE_TEMA) ||
        'light';
      setTema(actual);
      document.documentElement.setAttribute('data-theme', actual);
      if (actual === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const alternar = () => {
    const nuevo = tema === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nuevo);
      if (nuevo === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem(CLAVE_TEMA, nuevo);
    }
    setTema(nuevo);
  };

  return { tema, alternar };
}

/* ==========================================================================
   BOTÓN (NanoLabsButton / BhButton)
   ========================================================================== */
export interface NanoLabsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'normal' | 'small';
  leadingIcon?: ComponentType<{ size?: number; className?: string }>;
  trailingIcon?: ComponentType<{ size?: number; className?: string }>;
  loading?: boolean;
}

export function NanoLabsButton({
  variant = 'primary',
  size = 'normal',
  leadingIcon: Leading,
  trailingIcon: Trailing,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: NanoLabsButtonProps) {
  const clases = [
    'bh-btn',
    `bh-btn-${variant}`,
    size === 'small' ? 'bh-btn--small' : '',
    loading ? 'bh-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconSize = size === 'small' ? 14 : 16;

  return (
    <button className={clases} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="bh-girando" aria-hidden="true" />
      ) : (
        Leading && <Leading size={iconSize} className="shrink-0" />
      )}
      {children}
      {!loading && Trailing && <Trailing size={iconSize} className="shrink-0" />}
    </button>
  );
}

export const BhButton = NanoLabsButton;

/* ==========================================================================
   CHIP / BADGE (NanoLabsChip / BhChip)
   ========================================================================== */
export type Tono = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface NanoLabsChipProps {
  label: ReactNode;
  tone?: Tono;
  icon?: ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export function NanoLabsChip({ label, tone = 'neutral', icon: Icono, className = '' }: NanoLabsChipProps) {
  const clases = ['bh-chip', `bh-chip--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span className={clases}>
      {Icono && <Icono size={12} className="shrink-0" />}
      {label}
    </span>
  );
}

export const BhChip = NanoLabsChip;

/* ==========================================================================
   ALERTA (NanoLabsAlert / BhAlert)
   ========================================================================== */
export interface NanoLabsAlertProps {
  title?: string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

export function NanoLabsAlert({
  title,
  tone = 'info',
  onClose,
  className = '',
  children,
}: NanoLabsAlertProps) {
  const IconoDefecto =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning' || tone === 'danger'
      ? AlertCircle
      : Info;

  return (
    <div className={`bh-alert bh-alert--${tone} ${className}`} role="alert">
      <IconoDefecto size={18} className="bh-alert__icon shrink-0" />
      <div className="bh-alert__content">
        {title && <h4 className="bh-alert__title">{title}</h4>}
        <div className="bh-alert__description">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="bh-alert__close"
          aria-label="Cerrar aviso"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export const BhAlert = NanoLabsAlert;

/* ==========================================================================
   MODAL (NanoLabsModal / BhModal)
   ========================================================================== */
export interface NanoLabsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'normal' | 'wide' | 'side';
  children: ReactNode;
  footer?: ReactNode;
}

export function NanoLabsModal({
  open,
  onClose,
  title,
  size = 'normal',
  children,
  footer,
}: NanoLabsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();

    const alTecla = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTecla);
    return () => {
      window.removeEventListener('keydown', alTecla);
      previo?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bh-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bh-modal__scrim" onClick={onClose} />
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`bh-modal__panel ${size === 'side' ? 'bh-modal__panel--side' : ''} ${
          size === 'wide' ? 'bh-modal__panel--wide' : ''
        }`}
      >
        <div className="bh-modal__header">
          <h2 className="bh-modal__title">{title}</h2>
          <button type="button" className="bh-modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="bh-modal__body">{children}</div>
        {footer && <div className="bh-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export const BhModal = NanoLabsModal;

/* ==========================================================================
   TABS (NanoLabsTabs / BhTabs)
   ========================================================================== */
export interface NanoLabsTab {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  badge?: number | string;
}

export interface NanoLabsTabsProps {
  tabs: NanoLabsTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function NanoLabsTabs({ tabs, activeId, onChange, className = '' }: NanoLabsTabsProps) {
  const alTecla = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let proximo = -1;
    if (e.key === 'ArrowRight') proximo = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') proximo = (index - 1 + tabs.length) % tabs.length;
    if (proximo >= 0) {
      e.preventDefault();
      onChange(tabs[proximo].id);
    }
  };

  return (
    <div className={`bh-tabs ${className}`} role="tablist">
      {tabs.map((tab, i) => {
        const activo = tab.id === activeId;
        const Icono = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activo}
            tabIndex={activo ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => alTecla(e, i)}
            className={`bh-tabs__item ${activo ? 'bh-tabs__item--active' : ''}`}
          >
            {Icono && <Icono size={16} className="shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && <span className="bh-tabs__badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const BhTabs = NanoLabsTabs;

/* ==========================================================================
   ESTRUCTURAS BÁSICAS
   ========================================================================== */
export type IconoNanoLabs = ComponentType<{ size?: number; className?: string }>;

export function Encabezado({
  titulo,
  bajada,
  acciones,
  className = '',
}: {
  titulo: string;
  bajada?: string;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bh-header-hero ${className}`}>
      <div>
        <h1 className="bh-header-hero__title">{titulo}</h1>
        {bajada && <p className="bh-header-hero__subtitle">{bajada}</p>}
      </div>
      {acciones && <div className="bh-header-hero__actions">{acciones}</div>}
    </div>
  );
}

export function Indicador({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  className = '',
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: string;
  icono?: IconoNanoLabs;
  className?: string;
}) {
  return (
    <div className={`bh-stat-card ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="bh-stat-card__label">{etiqueta}</span>
        {Icono && <Icono size={18} className="text-slate-400 shrink-0" />}
      </div>
      <div className="bh-stat-card__value">{valor}</div>
      {detalle && <div className="bh-stat-card__detail">{detalle}</div>}
    </div>
  );
}

export function Volver({
  href,
  texto = 'Volver',
  className = '',
}: {
  href: string;
  texto?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`bh-btn bh-btn-secondary bh-btn--small ot-volver ${className}`}>
      <ArrowLeft size={14} className="shrink-0" />
      {texto}
    </Link>
  );
}

export function Cargando({
  mensaje = 'Cargando información…',
}: {
  mensaje?: string;
}) {
  return (
    <div className="bh-empty-state">
      <span className="bh-girando" aria-hidden="true" style={{ width: 24, height: 24 }} />
      <p className="mt-3 text-sm text-slate-500 font-medium">{mensaje}</p>
    </div>
  );
}

export function Vacio({
  titulo,
  mensaje,
  icono: Icono = Info,
  accion,
}: {
  titulo: string;
  mensaje?: string;
  icono?: IconoNanoLabs;
  accion?: ReactNode;
}) {
  return (
    <div className="bh-empty-state">
      <Icono size={36} className="text-slate-400 mx-auto mb-2 shrink-0" />
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{titulo}</h3>
      {mensaje && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{mensaje}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

/* ==========================================================================
   SISTEMA DE TOAST
   ========================================================================== */
export type TipoToast = 'success' | 'warning' | 'danger' | 'info';

interface MensajeToast {
  id: string;
  tipo: TipoToast;
  texto: string;
}

interface ContextoToast {
  toast: (texto: string, tipo?: TipoToast) => void;
}

const ToastContext = createContext<ContextoToast>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensajes, setMensajes] = useState<MensajeToast[]>([]);

  const toast = useCallback((texto: string, tipo: TipoToast = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setMensajes((prev) => [...prev, { id, tipo, texto }]);
    setTimeout(() => {
      setMensajes((prev) => prev.filter((m) => m.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="bh-toast-container" aria-live="polite">
        {mensajes.map((m) => (
          <div key={m.id} className={`bh-toast bh-toast--${m.tipo}`}>
            <span>{m.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
