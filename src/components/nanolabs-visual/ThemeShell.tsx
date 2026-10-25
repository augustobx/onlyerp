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

  if (theme === '2') {
    return <LayoutNanoLabs {...props}>{props.children}</LayoutNanoLabs>;
  }

  return <AppShell {...props}>{props.children}</AppShell>;
}
