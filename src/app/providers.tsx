"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import type { Session } from "@/domain/session";
import { MockAuthProvider, useMockAuth } from "@/client/contexts/MockAuthContext";
import { RouteProvider } from "@/client/contexts/RouteContext";
import { ThemeProvider } from "@/client/contexts/ThemeContext";

type ProvidersProps = {
  children: ReactNode;
  initialSession: Session | null;
};

function AuthenticatedRouteProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useMockAuth();
  return <RouteProvider isAuthenticated={isAuthenticated}>{children}</RouteProvider>;
}

export function Providers({ children, initialSession }: ProvidersProps) {
  const toasterOffset = {
    top: "calc(var(--sn-navbar-height) + var(--sn-space-half))",
    right: "var(--sn-space-half)",
    left: "var(--sn-space-half)",
  };

  return (
    <ThemeProvider>
      <MockAuthProvider initialSession={initialSession}>
        <AuthenticatedRouteProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            offset={toasterOffset}
            mobileOffset={toasterOffset}
          />
        </AuthenticatedRouteProvider>
      </MockAuthProvider>
    </ThemeProvider>
  );
}
