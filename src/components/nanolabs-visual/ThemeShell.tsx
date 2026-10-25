'use client';

import React from 'react';
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

  // Tema 1 clásico conservado como respaldo histórico si se solicita explícitamente
  if (theme === '1-legacy') {
    return <AppShell {...props}>{props.children}</AppShell>;
  }

  // Tema 2 (NanoLabs Visual) oficial y predeterminado para todo el sistema
  return <LayoutNanoLabs {...props}>{props.children}</LayoutNanoLabs>;
}
