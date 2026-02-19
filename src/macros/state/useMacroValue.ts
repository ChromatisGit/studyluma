"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useMacroState } from "./MacroStateContext";

/**
 * Hook for macro state that auto-syncs with the active state adapter
 * (localStorage for worksheets, BroadcastChannel for slides, or ephemeral).
 *
 * Replaces the duplicated load/save pattern across all input macros.
 */
export function useMacroValue<T>(
  key: string | undefined,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const adapter = useMacroState();

  const [value, setValue] = useState<T>(() => {
    if (!adapter || !key) return initialValue;
    const saved = adapter.read(key);
    if (saved === null) return initialValue;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return initialValue;
    }
  });

  // Sync from adapter when it changes (e.g. projector receiving new broadcast state)
  useEffect(() => {
    if (!adapter || !key || !adapter.isReadOnly) return;
    const saved = adapter.read(key);
    if (saved === null) return;
    try {
      setValue(JSON.parse(saved) as T);
    } catch {
      /* ignore parse errors */
    }
  }, [adapter, key]);

  // Write on change (only for writable adapters)
  useEffect(() => {
    if (!adapter || !key || adapter.isReadOnly) return;
    adapter.write(key, JSON.stringify(value));
  }, [value, adapter, key]);

  return [value, setValue];
}
