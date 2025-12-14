import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { WorksheetStorage } from './WorksheetStorage';

const WorksheetStorageContext = createContext<WorksheetStorage | null>(null);

interface WorksheetStorageProviderProps {
  storage: WorksheetStorage | null;
  children: ReactNode;
}

export function WorksheetStorageProvider({ storage, children }: WorksheetStorageProviderProps) {
  return (
    <WorksheetStorageContext.Provider value={storage}>
      {children}
    </WorksheetStorageContext.Provider>
  );
}

export function useWorksheetStorage(): WorksheetStorage | null {
  return useContext(WorksheetStorageContext);
}
