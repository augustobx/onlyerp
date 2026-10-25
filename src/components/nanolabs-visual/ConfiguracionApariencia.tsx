'use client';

import React from 'react';
import { Palette, Check, Sun, Moon, Sparkles, CheckCircle2, ShoppingCart, Store, ArrowRight } from 'lucide-react';
import { PALETTES } from './palettes';
import { useERPTheme } from './ThemeContext';
import { toast } from 'sonner';

export function ConfiguracionApariencia() {
  const { palette, setPalette, isDark, toggleDarkMode } = useERPTheme();

  const handleSelectPalette = (paletteId: string, paletteName: string) => {
    setPalette(paletteId);
    toast.success(`Paleta aplicada: ${paletteName}`, {
      description: 'El nuevo esquema cromático se aplicó en tiempo real a todo OnlyERP.',
    });
  };

  return (
    <div className="space-y-6">
      {/* TARJETA 1: SELECTOR DE PALETAS CORPORATIVAS */}
      <div className="bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#2b3347] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-[#2b3347] gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{
                background: palette.gradient,
                boxShadow: `0 4px 14px ${palette.glow}`,
              }}
            >
              <Palette size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#f8fafc] leading-tight">
                Paleta Cromática Corporativa
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#cbd5e1] mt-0.5">
                Seleccioná uno de los 7 esquemas de color oficiales de NanoLabs para tu empresa.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-[#181c28] border border-slate-200 dark:border-[#2b3347] text-xs font-semibold self-start sm:self-auto">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: palette.primary }}
            />
            <span className="text-slate-700 dark:text-[#cbd5e1]">
              Activa: <strong>{palette.name}</strong>
            </span>
          </div>
        </div>

        {/* GRILLA DE PALETAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {Object.values(PALETTES).map((p) => {
            const isSelected = p.id === palette.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPalette(p.id, p.name)}
                className={`relative flex flex-col p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-50 dark:bg-[#181c28] border-2 shadow-md'
                    : 'bg-white dark:bg-[#131722] border-slate-200 dark:border-[#2b3347] hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: p.primary,
                        boxShadow: `0 4px 16px ${p.glow}`,
                      }
                    : undefined
                }
              >
                {/* CHECKMARK SUPERIOR */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-8 h-8 rounded-xl shadow-xs flex items-center justify-center text-white"
                    style={{ background: p.gradient }}
                  >
                    <Sparkles size={14} />
                  </div>

                  {isSelected ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white shadow-xs"
                      style={{ background: p.primary }}
                    >
                      <Check size={12} strokeWidth={3} /> Activa
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#94a3b8] uppercase font-bold">
                      {p.primary}
                    </span>
                  )}
                </div>

                {/* NOMBRE Y DETALLE */}
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-[#f8fafc]">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#cbd5e1]">
                    Tonalidad {p.badge}
                  </p>
                </div>

                {/* MUESTRA DE COLOR (BARRA DEGRADÉ) */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#2b3347] flex items-center justify-between">
                  <div
                    className="h-2 flex-1 rounded-full mr-3 shadow-xs"
                    style={{ background: p.gradient }}
                  />
                  <span
                    className="text-[11px] font-black px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: isDark ? p.darkSubtlest : p.subtlest,
                      color: p.primary,
                    }}
                  >
                    {p.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TARJETA 2: MODO CLARO / OSCURO */}
      <div className="bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#2b3347] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#181c28] flex items-center justify-center text-slate-700 dark:text-[#f8fafc] border border-slate-200 dark:border-[#2b3347] shrink-0">
              {isDark ? <Moon size={22} className="text-amber-400" /> : <Sun size={22} className="text-amber-500" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#f8fafc] leading-tight">
                Modo Visual del Sistema
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#cbd5e1] mt-0.5">
                Cambiá entre Modo Oscuro de alto contraste (#0c0f17 / #131722) y Modo Claro pulcro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isDark) toggleDarkMode();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                !isDark
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                  : 'bg-transparent border-slate-200 dark:border-[#2b3347] text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#181c28]'
              }`}
            >
              <Sun size={15} /> Modo Claro
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isDark) toggleDarkMode();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow-xs'
                  : 'bg-transparent border-slate-200 dark:border-[#2b3347] text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#181c28]'
              }`}
            >
              <Moon size={15} /> Modo Oscuro
            </button>
          </div>
        </div>
      </div>

      {/* TARJETA 3: VISTA PREVIA EN VIVO */}
      <div className="bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#2b3347] rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#2b3347]">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-[#cbd5e1]">
              Vista Previa en Vivo de Componentes
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#94a3b8]">
              Así se visualizan botones, estados, badges e indicadores con tu combinación activa.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-[#94a3b8]">
            {isDark ? '🌙 Modo Oscuro' : '☀️ Modo Claro'} · {palette.badge}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Muestra 1: Botón Primario y Secundario */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181c28] border border-slate-200 dark:border-[#2b3347] space-y-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-[#94a3b8]">Acciones Principales</p>
            <div className="space-y-2">
              <button
                type="button"
                className="w-full h-10 px-4 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
                style={{
                  background: palette.primary,
                  boxShadow: `0 3px 10px ${palette.glow}`,
                }}
              >
                <ShoppingCart size={15} /> Facturar Pedido
              </button>
              <button
                type="button"
                className="w-full h-10 px-4 rounded-xl font-bold text-xs border transition-colors cursor-pointer"
                style={{
                  color: palette.primary,
                  borderColor: palette.primary,
                  backgroundColor: 'transparent',
                }}
              >
                Acción Secundaria
              </button>
            </div>
          </div>

          {/* Muestra 2: KPI Card */}
          <div
            className="p-4 rounded-2xl border space-y-2 flex flex-col justify-between"
            style={{
              backgroundColor: isDark ? palette.darkSubtlest : palette.subtlest,
              borderColor: palette.primary,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-[#cbd5e1]">
                Ventas del Día
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: palette.primary }}
              >
                <Store size={14} />
              </div>
            </div>
            <div>
              <p
                className="text-2xl font-black font-mono tracking-tight"
                style={{ color: isDark ? palette.subtle : palette.primary }}
              >
                $1.450.800
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#cbd5e1] font-semibold mt-0.5">
                +18.4% vs promedio semanal
              </p>
            </div>
          </div>

          {/* Muestra 3: Badges y Estado */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181c28] border border-slate-200 dark:border-[#2b3347] space-y-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-[#94a3b8]">Chips & Estados</p>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-xs"
                style={{ background: palette.gradient }}
              >
                <CheckCircle2 size={13} /> {palette.name}
              </span>
              <span
                className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: isDark ? palette.darkSubtlest : palette.subtlest,
                  borderColor: palette.primary,
                  color: palette.primary,
                }}
              >
                Activo
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/50 dark:border-[#2b3347] flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-[#cbd5e1]">
              <span>Contraste verificado</span>
              <span className="text-emerald-500 font-bold">100% Legible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
