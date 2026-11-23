import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import * as repo from '@/db/database';

export type ThemePreference = 'auto' | 'light' | 'dark';

type Ctx = {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

function applyTheme(t: ThemePreference) {
  Appearance.setColorScheme(t === 'auto' ? 'unspecified' : t);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [theme, setThemeState] = useState<ThemePreference>('auto');

  useEffect(() => {
    let cancelled = false;
    repo.getSetting(db, 'theme').then((v) => {
      if (cancelled) return;
      const t: ThemePreference = v === 'light' || v === 'dark' ? v : 'auto';
      setThemeState(t);
      applyTheme(t);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme: async (t) => {
        setThemeState(t);
        applyTheme(t);
        await repo.setSetting(db, 'theme', t);
      },
    }),
    [db, theme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
