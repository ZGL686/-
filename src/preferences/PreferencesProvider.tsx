import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import type { Preferences } from './model';
import { defaultPreferences, parsePreferences, preferenceKey } from './model';

function apply(p: Preferences) {
  const root = document.documentElement;
  root.dataset.font = p.font;
  root.dataset.motion = p.motion;
  root.style.setProperty('--base-font-size', `${p.fontSize}px`);
}
export function initializePreferences(): Preferences {
  let preferences = { ...defaultPreferences };
  try {
    preferences = parsePreferences(localStorage.getItem(preferenceKey));
  } catch {
    /* Session defaults remain usable when storage is unavailable. */
  }
  apply(preferences);
  return preferences;
}
type Value = {
  preferences: Preferences;
  setPreferences: (patch: Partial<Omit<Preferences, 'version'>>) => void;
  storageError: boolean;
};
const Context = createContext<Value | null>(null);
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('PreferencesProvider is required');
  return value;
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, set] = useState(initializePreferences);
  const [storageError, setStorageError] = useState(false);
  function setPreferences(patch: Partial<Omit<Preferences, 'version'>>) {
    const next = parsePreferences(JSON.stringify({ ...preferences, ...patch }));
    apply(next);
    set(next);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <Context.Provider value={{ preferences, setPreferences, storageError }}>
      {children}
    </Context.Provider>
  );
}
