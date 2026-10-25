'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ColorPalette, PALETTES, DEFAULT_PALETTE_ID, getPalette, applyPaletteToDOM } from './palettes';

export type ERPTheme = '1' | '2' | '1-legacy';

interface ERPThemeContextType {
  theme: ERPTheme;
  setTheme: (theme: ERPTheme) => void;
  toggleERPTheme: () => void;
  palette: ColorPalette;
  setPalette: (paletteId: string) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ERPThemeContext = createContext<ERPThemeContextType>({
  theme: '2',
  setTheme: () => {},
  toggleERPTheme: () => {},
  palette: PALETTES[DEFAULT_PALETTE_ID],
  setPalette: () => {},
  isDark: false,
  toggleDarkMode: () => {},
});

export const useERPTheme = () => useContext(ERPThemeContext);

export function ERPThemeProvider({
  initialTheme = '2',
  initialPaletteId = DEFAULT_PALETTE_ID,
  children,
}: {
  initialTheme?: ERPTheme;
  initialPaletteId?: string;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ERPTheme>(initialTheme || '2');
  const [palette, setPaletteState] = useState<ColorPalette>(getPalette(initialPaletteId));
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Theme 2 (NanoLabs Visual) oficial y predeterminado
    const searchParams = new URLSearchParams(window.location.search);
    const urlTheme = searchParams.get('theme');
    let resolvedTheme: ERPTheme = '2';

    if (urlTheme === '1-legacy') {
      resolvedTheme = '1-legacy';
      document.cookie = `onlyerp_theme=1-legacy; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyerp_theme', '1-legacy');
    } else {
      // Por defecto Theme 2
      resolvedTheme = '2';
      document.cookie = `onlyerp_theme=2; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyerp_theme', '2');
    }
    setThemeState(resolvedTheme);

    // 2. Palette resolution
    const urlPalette = searchParams.get('palette');
    let resolvedPaletteId = initialPaletteId;

    if (urlPalette && PALETTES[urlPalette]) {
      resolvedPaletteId = urlPalette;
      document.cookie = `onlyerp_palette=${urlPalette}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyerp_palette', urlPalette);
    } else {
      const savedPalette = localStorage.getItem('onlyerp_palette');
      if (savedPalette && PALETTES[savedPalette]) {
        resolvedPaletteId = savedPalette;
      }
    }
    const pal = getPalette(resolvedPaletteId);
    setPaletteState(pal);

    // 3. Dark mode resolution
    const savedDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      localStorage.getItem('nl-theme') === 'dark';
    setIsDark(savedDark);

    if (savedDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }

    applyPaletteToDOM(pal, savedDark);
  }, [initialTheme, initialPaletteId]);

  const setTheme = (newTheme: ERPTheme) => {
    setThemeState(newTheme);
    if (typeof document !== 'undefined') {
      document.cookie = `onlyerp_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyerp_theme', newTheme);
    }
  };

  const toggleERPTheme = () => {
    setTheme(theme === '1' ? '2' : '1');
  };

  const setPalette = (paletteId: string) => {
    const pal = getPalette(paletteId);
    setPaletteState(pal);
    if (typeof document !== 'undefined') {
      document.cookie = `onlyerp_palette=${paletteId}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyerp_palette', paletteId);
      applyPaletteToDOM(pal, isDark);
    }
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof document !== 'undefined') {
      const val = nextDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', val);
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('nl-theme', val);
      applyPaletteToDOM(palette, nextDark);
    }
  };

  return (
    <ERPThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleERPTheme,
        palette,
        setPalette,
        isDark,
        toggleDarkMode,
      }}
    >
      {children}
    </ERPThemeContext.Provider>
  );
}
