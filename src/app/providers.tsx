"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { RouteProvider } from "@ui/contexts/RouteContext";
import { ThemeProvider } from "@ui/contexts/ThemeContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const toasterOffset = {
    top: "calc(var(--sn-navbar-height) + var(--sn-space-sm))",
    right: "var(--sn-space-sm)",
    left: "var(--sn-space-sm)",
  };

  return (
    <ThemeProvider>
      <RouteProvider>
        {children}
        <Toaster
          position="top-center"
          richColors
          offset={toasterOffset}
          mobileOffset={toasterOffset}
          toastOptions={{
            style: { zIndex: 900 },
            }}
          />
      </RouteProvider>
    </ThemeProvider>
  );
}
