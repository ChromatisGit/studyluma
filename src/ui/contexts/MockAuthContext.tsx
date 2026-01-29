"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Session } from "@schema/session";
import type { User } from "@schema/userTypes";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type MockAuthProviderProps = {
  children: ReactNode;
  initialSession: Session | null;
};

export function MockAuthProvider({ children, initialSession }: MockAuthProviderProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const user = session?.user ?? null;
  const isAuthenticated = Boolean(user);

  const value = useMemo(() => {
    const signOut = () => setSession(null);

    return {
      session,
      user,
      isAuthenticated,
      setSession,
      signOut,
    };
  }, [session, user, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMockAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return context;
}
