import { createContext, useContext } from "react";

export type WorksheetDemoState = {
  isHidden?: boolean;
  isSolutionHidden?: boolean;
};

export type DemoCourseOverride = {
  currentTopicId?: string;
  currentChapterId?: string;
  registrationOpen?: boolean;
  worksheets?: Record<string, WorksheetDemoState>;
};

export type DemoOverridesStore = {
  courses: Record<string, DemoCourseOverride>;
};

export type DemoOverrideContextValue = {
  isDemoMode: boolean;
  getOverride: (courseId: string) => DemoCourseOverride;
  setWorksheetHidden: (courseId: string, worksheetId: string, isHidden: boolean) => void;
  setSolutionHidden: (courseId: string, worksheetId: string, isSolutionHidden: boolean) => void;
  setRegistrationOpen: (courseId: string, open: boolean) => void;
  setProgress: (courseId: string, topicId: string, chapterId: string) => void;
  resetCourse: (courseId: string) => void;
};

const defaultValue: DemoOverrideContextValue = {
  isDemoMode: false,
  getOverride: () => ({}),
  setWorksheetHidden: () => {},
  setSolutionHidden: () => {},
  setRegistrationOpen: () => {},
  setProgress: () => {},
  resetCourse: () => {},
};

export const DemoOverrideContext = createContext<DemoOverrideContextValue>(defaultValue);

export function useDemoOverrides(): DemoOverrideContextValue {
  return useContext(DemoOverrideContext);
}
