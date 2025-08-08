import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('theme:mode');
        if (stored === 'dark' || stored === 'light') {
          setModeState(stored);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const setMode = async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem('theme:mode', next);
    } catch {}
  };

  const toggle = async () => {
    await setMode(mode === 'light' ? 'dark' : 'light');
  };

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode]);

  if (!loaded) return null as any;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  return ctx;
}; 