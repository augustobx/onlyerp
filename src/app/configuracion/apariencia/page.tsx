'use client';

import React from 'react';
import Link from 'next/link';
import { Palette, ArrowLeft, Sparkles } from 'lucide-react';
import { ConfiguracionApariencia } from '@/components/nanolabs-visual';
import { Button } from '@/components/ui/button';

export default function AparienciaPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto min-h-[calc(100vh-6rem)] pb-12 font-sans">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#2b3347] p-5 rounded-3xl gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3.5 rounded-2xl text-white shadow-md shadow-orange-500/20">
            <Palette className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-[#f8fafc] tracking-tight">
                Colores & Apariencia
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <Sparkles size={11} /> NanoLabs Visual
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-[#cbd5e1] mt-0.5">
              Personalizá la identidad cromática y el contraste visual de tu instancia OnlyERP.
            </p>
          </div>
        </div>

        <Link href="/configuracion">
          <Button variant="outline" className="border-slate-200 dark:border-[#2b3347] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#181c28] font-bold text-xs rounded-xl h-10">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver a Configuración
          </Button>
        </Link>
      </div>

      {/* COMPONENTE INTERACTIVO DE PALETAS Y MODO OSCURO */}
      <ConfiguracionApariencia />
    </div>
  );
}
