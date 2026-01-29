"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { WorksheetStorage } from './WorksheetStorage';
import type { Section } from '@schema/page';

const WorksheetStorageContext = createContext<WorksheetStorage | null>(null);

interface WorksheetStorageProviderProps {
  worksheetSlug?: string;
  pageContent?: Section[];
  storage?: WorksheetStorage | null;
  children: ReactNode;
}

/**
 * Provides worksheet storage context for persisting task responses.
 * Can be used in two modes:
 * 1. Auto mode: Pass worksheetSlug and pageContent to auto-initialize storage
 * 2. Manual mode: Pass pre-initialized storage instance directly
 */
export function WorksheetStorageProvider({
  worksheetSlug,
  pageContent,
  storage: manualStorage,
  children
}: WorksheetStorageProviderProps) {
  const [autoStorage, setAutoStorage] = useState<WorksheetStorage | null>(null);
  const pathname = usePathname();

  const worksheetSignature = useMemo(
    () => {
      if (!pageContent) return undefined;
      return WorksheetStorage.computeSignature({ content: pageContent });
    },
    [pageContent]
  );

  useEffect(() => {
    // If manual storage is provided, don't initialize auto storage
    if (manualStorage !== undefined) {
      return;
    }

    if (!WorksheetStorage.isAvailable()) {
      setAutoStorage(null);
      return;
    }

    if (!worksheetSignature) {
      setAutoStorage(null);
      return;
    }

    const slug = worksheetSlug || pathname || "worksheet";
    const instance = WorksheetStorage.forWorksheet(slug, worksheetSignature);
    setAutoStorage(instance);
  }, [pathname, worksheetSignature, worksheetSlug, manualStorage]);

  const storage = manualStorage !== undefined ? manualStorage : autoStorage;
  const worksheetInstanceKey = storage?.worksheetId ?? "worksheet";

  return (
    <WorksheetStorageContext.Provider value={storage} key={worksheetInstanceKey}>
      {children}
    </WorksheetStorageContext.Provider>
  );
}

export function useWorksheetStorage(): WorksheetStorage | null {
  return useContext(WorksheetStorageContext);
}
