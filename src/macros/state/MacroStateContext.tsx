"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MacroStateAdapter } from "./MacroStateAdapter";

const MacroStateContext = createContext<MacroStateAdapter | null>(null);

type MacroStateProviderProps = {
  adapter: MacroStateAdapter;
  children: ReactNode;
};

export function MacroStateProvider({
  adapter,
  children,
}: MacroStateProviderProps) {
  return (
    <MacroStateContext.Provider value={adapter}>
      {children}
    </MacroStateContext.Provider>
  );
}

export function useMacroState(): MacroStateAdapter | null {
  return useContext(MacroStateContext);
}
