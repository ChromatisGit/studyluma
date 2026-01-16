"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type TsWorkerContextType = {
  worker: Worker | null;
};

const TsWorkerContext = createContext<TsWorkerContextType | null>(null);

export function TsWorkerProvider({ children }: { children: ReactNode }) {
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    // Preload worker on mount
    const newWorker = new Worker(
      new URL('./tsRunner.ts', import.meta.url),
      { type: 'module' }
    );
    setWorker(newWorker);

    // Clean up on unmount
    return () => {
      newWorker.terminate();
    };
  }, []);

  return (
    <TsWorkerContext.Provider value={{ worker }}>
      {children}
    </TsWorkerContext.Provider>
  );
}

export function useTsWorkerContext() {
  const context = useContext(TsWorkerContext);
  if (!context) {
    throw new Error('useTsWorkerContext must be used within TsWorkerProvider');
  }
  return context;
}
