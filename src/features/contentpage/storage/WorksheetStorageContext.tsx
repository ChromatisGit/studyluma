"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { WorksheetStorage } from './WorksheetStorage';
import { SyncManager } from './SyncManager';
import type { Section } from '@schema/page';
import { MacroStateProvider } from '@macros/state/MacroStateContext';
import { createWorksheetAdapter } from '@macros/state/WorksheetStorageAdapter';
import {
  loadWorksheetDataAction,
  syncWorksheetAction,
  saveCheckpointAction,
} from '@actions/worksheetActions';
import { useState } from 'react';

const WorksheetStorageContext = createContext<WorksheetStorage | null>(null);

interface WorksheetStorageProviderProps {
  worksheetSlug?: string;
  /** The actual DB worksheet ID — used for DB reads/writes. */
  worksheetId?: string;
  pageContent?: Section[];
  storage?: WorksheetStorage | null;
  /** Pass the authenticated user's ID to enable DB sync. */
  userId?: string;
  children: ReactNode;
}

/**
 * Provides worksheet storage context for persisting task responses.
 * Can be used in two modes:
 * 1. Auto mode: Pass worksheetSlug and pageContent to auto-initialize storage
 * 2. Manual mode: Pass pre-initialized storage instance directly
 *
 * When userId + worksheetId are provided, DB sync is enabled:
 * - On mount: DB data is loaded and merged into localStorage (DB is authoritative)
 * - On save: localStorage is written immediately; DB is updated via SyncManager
 *   (debounced 1.5s, flushed on section navigation, tab hide, and on reconnect)
 * - Checkpoints: sent to server immediately (deliberate user action, not debounced)
 */
export function WorksheetStorageProvider({
  worksheetSlug,
  worksheetId,
  pageContent,
  storage: manualStorage,
  userId,
  children
}: WorksheetStorageProviderProps) {
  const [autoStorage, setAutoStorage] = useState<WorksheetStorage | null>(null);
  const pathname = usePathname();
  const syncManagerRef = useRef<SyncManager | null>(null);

  const worksheetSignature = useMemo(
    () => {
      if (!pageContent) return undefined;
      return WorksheetStorage.computeSignature({ content: pageContent });
    },
    [pageContent]
  );

  useEffect(() => {
    if (manualStorage !== undefined) return;

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

    if (userId && worksheetId) {
      const syncManager = new SyncManager(
        async (responses) => { await syncWorksheetAction(worksheetId, responses); },
      );
      syncManagerRef.current = syncManager;

      instance.onSave = (key, value) => syncManager.markDirty(key, value);
      instance.onFlush = () => syncManager.flush();
      instance.onCheckpointSave = (idx, resp) => {
        void saveCheckpointAction(worksheetId, idx, resp);
      };

      loadWorksheetDataAction(worksheetId).then((result) => {
        if (result.ok) {
          instance.mergeDbData(result.data.taskResponses, result.data.submittedSections);
        }
        setAutoStorage(instance);
      }).catch(() => {
        setAutoStorage(instance);
      });
    } else {
      setAutoStorage(instance);
    }

    return () => {
      syncManagerRef.current?.destroy();
      syncManagerRef.current = null;
    };
  }, [pathname, worksheetSignature, worksheetSlug, worksheetId, manualStorage, userId]);

  // Flush on tab hide (user navigates away or switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void syncManagerRef.current?.flush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Flush when connectivity is restored after going offline
  useEffect(() => {
    const handleOnline = () => {
      void syncManagerRef.current?.flush();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const storage = manualStorage !== undefined ? manualStorage : autoStorage;

  const content = (
    <WorksheetStorageContext.Provider value={storage}>
      {children}
    </WorksheetStorageContext.Provider>
  );

  if (storage) {
    const adapter = createWorksheetAdapter(storage);
    return <MacroStateProvider adapter={adapter}>{content}</MacroStateProvider>;
  }

  return content;
}

export function useWorksheetStorage(): WorksheetStorage | null {
  return useContext(WorksheetStorageContext);
}
