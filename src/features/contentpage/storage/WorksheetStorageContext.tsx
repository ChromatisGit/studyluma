"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFetcher, useLocation } from 'react-router';
import { WorksheetStorage } from './WorksheetStorage';
import { SyncManager } from './SyncManager';
import type { Section } from '@schema/page';
import { MacroStateProvider } from '@macros/state/MacroStateContext';
import { createWorksheetAdapter } from '@macros/state/WorksheetStorageAdapter';

const WorksheetStorageContext = createContext<WorksheetStorage | null>(null);
const WorksheetSyncContext = createContext({ checkpointState: 'idle' });

interface WorksheetStorageProviderProps {
  worksheetSlug?: string | undefined;
  /** The actual DB worksheet ID — used for DB reads/writes. */
  worksheetId?: string | undefined;
  pageContent?: Section[] | undefined;
  savedResponses?: Record<string, string> | undefined;
  submittedSections?: number[] | undefined;
  storage?: WorksheetStorage | null;
  /** Pass the authenticated user's ID to enable DB sync. */
  userId?: string | undefined;
  children: ReactNode;
}

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
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
  savedResponses,
  submittedSections,
  storage: manualStorage,
  userId,
  children
}: WorksheetStorageProviderProps) {
  const [autoStorage, setAutoStorage] = useState<WorksheetStorage | null>(null);
  const { pathname } = useLocation();
  const syncFetcher = useFetcher();
  const checkpointFetcher = useFetcher();
  const syncManagerRef = useRef<SyncManager | null>(null);
  const fetcherRef = useRef({
    syncSubmit: syncFetcher.submit,
    checkpointSubmit: checkpointFetcher.submit,
  });
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = {
      syncSubmit: syncFetcher.submit,
      checkpointSubmit: checkpointFetcher.submit,
    };
  }, [syncFetcher.submit, checkpointFetcher.submit]);

  useEffect(() => {
    if (syncFetcher.state === 'idle') {
      syncInFlightRef.current = false;
    }
  }, [syncFetcher.state]);

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
    instance.mergeDbData(savedResponses ?? {}, submittedSections ?? []);

    if (userId && worksheetId) {
      const syncManager = new SyncManager(
        (responses) => {
          if (syncInFlightRef.current) {
            throw new Error('Worksheet sync already in progress');
          }
          syncInFlightRef.current = true;
          try {
            void fetcherRef.current.syncSubmit(
              createFormData({
                intent: 'sync-responses',
                responses: JSON.stringify(responses),
              }),
              { method: 'POST', action: `/api/worksheet/${worksheetId}/save` },
            );
          } catch (error) {
            syncInFlightRef.current = false;
            throw error;
          }
        },
      );
      syncManagerRef.current = syncManager;

      instance.onSave = (key, value) => syncManager.markDirty(key, value);
      instance.onFlush = () => syncManager.flush();
      instance.onCheckpointSave = (idx, resp) => {
        void fetcherRef.current.checkpointSubmit(
          createFormData({
            intent: 'checkpoint',
            sectionIndex: String(idx),
            checkpoint: JSON.stringify(resp),
          }),
          { method: 'POST', action: `/api/worksheet/${worksheetId}/checkpoint` },
        );
      };
    }

    setAutoStorage(instance);

    return () => {
      syncManagerRef.current?.destroy();
      syncManagerRef.current = null;
    };
  }, [
    pathname,
    worksheetSignature,
    worksheetSlug,
    worksheetId,
    manualStorage,
    userId,
    savedResponses,
    submittedSections,
  ]);

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
  const syncStatus = useMemo(
    () => ({ checkpointState: checkpointFetcher.state }),
    [checkpointFetcher.state],
  );

  const content = (
    <WorksheetSyncContext.Provider value={syncStatus}>
      <WorksheetStorageContext.Provider value={storage}>
        {children}
      </WorksheetStorageContext.Provider>
    </WorksheetSyncContext.Provider>
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

export function useWorksheetSyncStatus() {
  return useContext(WorksheetSyncContext);
}
