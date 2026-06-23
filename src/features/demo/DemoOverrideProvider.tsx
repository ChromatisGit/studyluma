"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DemoOverrideContext,
  type DemoCourseOverride,
  type DemoOverridesStore,
} from "@ui/demo/DemoOverrideContext";

const STORAGE_KEY = "demo:overrides";

// The DB seed unlocks demo-math through its last chapter so every chapter is
// reachable in the demo, but the displayed "current" chapter should start at
// the first one until the demo admin moves it via Progress Control.
const DEFAULT_PROGRESS_OVERRIDES: Record<string, { currentTopicId: string; currentChapterId: string }> = {
  "demo-math": { currentTopicId: "vektorgeometrie", currentChapterId: "geraden" },
};

function readStore(): DemoOverridesStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { courses: {} };
    return JSON.parse(raw) as DemoOverridesStore;
  } catch {
    return { courses: {} };
  }
}

function writeStore(store: DemoOverridesStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage might be full or blocked
  }
}

export function DemoOverrideProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DemoOverridesStore>({ courses: {} });

  // Load from localStorage after mount (localStorage not available during SSR)
  useEffect(() => {
    setStore(readStore());
  }, []);

  // Sync changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setStore(readStore());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const mutate = useCallback((updater: (prev: DemoOverridesStore) => DemoOverridesStore) => {
    setStore((prev) => {
      const next = updater(prev);
      writeStore(next);
      return next;
    });
  }, []);

  const getOverride = useCallback(
    (courseId: string): DemoCourseOverride => {
      const defaults = DEFAULT_PROGRESS_OVERRIDES[courseId];
      const stored = store.courses[courseId];
      return defaults ? { ...defaults, ...stored } : stored ?? {};
    },
    [store],
  );

  const setWorksheetHidden = useCallback(
    (courseId: string, worksheetId: string, isHidden: boolean) => {
      mutate((prev) => {
        const course = prev.courses[courseId] ?? {};
        return {
          courses: {
            ...prev.courses,
            [courseId]: {
              ...course,
              worksheets: {
                ...course.worksheets,
                [worksheetId]: { ...course.worksheets?.[worksheetId], isHidden },
              },
            },
          },
        };
      });
    },
    [mutate],
  );

  const setSolutionHidden = useCallback(
    (courseId: string, worksheetId: string, isSolutionHidden: boolean) => {
      mutate((prev) => {
        const course = prev.courses[courseId] ?? {};
        return {
          courses: {
            ...prev.courses,
            [courseId]: {
              ...course,
              worksheets: {
                ...course.worksheets,
                [worksheetId]: { ...course.worksheets?.[worksheetId], isSolutionHidden },
              },
            },
          },
        };
      });
    },
    [mutate],
  );

  const setRegistrationOpen = useCallback(
    (courseId: string, open: boolean) => {
      mutate((prev) => ({
        courses: {
          ...prev.courses,
          [courseId]: { ...prev.courses[courseId], registrationOpen: open },
        },
      }));
    },
    [mutate],
  );

  const setProgress = useCallback(
    (courseId: string, topicId: string, chapterId: string) => {
      mutate((prev) => ({
        courses: {
          ...prev.courses,
          [courseId]: {
            ...prev.courses[courseId],
            currentTopicId: topicId,
            currentChapterId: chapterId,
          },
        },
      }));
    },
    [mutate],
  );

  const resetCourse = useCallback(
    (courseId: string) => {
      mutate((prev) => {
        const next = { ...prev.courses };
        delete next[courseId];
        return { courses: next };
      });
    },
    [mutate],
  );

  return (
    <DemoOverrideContext.Provider
      value={{
        isDemoMode: true,
        getOverride,
        setWorksheetHidden,
        setSolutionHidden,
        setRegistrationOpen,
        setProgress,
        resetCourse,
      }}
    >
      {children}
    </DemoOverrideContext.Provider>
  );
}
