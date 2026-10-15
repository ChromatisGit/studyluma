import type { AmpelCause, AmpelLevel } from "./contract";

/**
 * Where a student's worksheet reports to the class go. The Classroom Session
 * provides one; without a session there is none and nothing is reported.
 */
export type SheetReporter = {
  progress(report: {
    sheetId: string;
    reached: number;
    done: boolean;
    challenges: boolean;
  }): void;
  ampel(report: {
    sheetId: string;
    level: AmpelLevel;
    causes: AmpelCause[];
  }): void;
};
