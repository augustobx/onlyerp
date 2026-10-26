'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useERPTheme } from './ThemeContext';
import { LayoutNanoLabs } from './LayoutNanoLabs';
import { AppShell } from '@/components/app-sidebar';

export interface ThemeShellProps {
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

export function ThemeShell(props: ThemeShellProps) {
  const { theme } = useERPTheme();
  const pathname = usePathname();

  // Si estamos en cualquier ruta dedicada de impresión (/imprimir/*: tickets, A4, pedidos, presupuestos, hojas de ruta),
  // omitir completamente el Shell (Sidebar + Header) para que el comprobante sea 100% limpio, autónomo y adaptado al cliente.
  if (pathname?.startsWith('/imprimir')) {
    return <main className="w-full min-h-screen bg-white text-black print:p-0 print:m-0 print:bg-white">{props.children}</main>;
  }

  // Tema 1 clásico conservado como respaldo histórico si se solicita explícitamente
  if (theme === '1-legacy') {
    return <AppShell {...props}>{props.children}</AppShell>;
  }

  // Tema 2 (NanoLabs Visual) oficial y predeterminado para todo el sistema
  return <LayoutNanoLabs {...props}>{props.children}</LayoutNanoLabs>;
}
