import { createContext, useContext, useEffect, useRef } from "react";
import type { Worksheet as Sheet } from "../../catalog";
import type { SheetReporter } from "../domain/report";
import { progressOf } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";

/** Provided by the Classroom Session on a student device; null elsewhere. */
export const SheetReporterContext = createContext<SheetReporter | null>(null);

/** Typing makes the state change constantly; the class hears of it this often. */
const REPORT_DELAY_MS = 1500;

/**
 * Reports how far this student is on an open sheet. Only changes are sent,
 * after a short pause; answers and results never are.
 */
export function useProgressReporting(sheet: Sheet, active: boolean) {
  const reporter = useContext(SheetReporterContext);
  const { chapter, state } = useWorksheet();
  const sent = useRef("");
  const progress = progressOf(chapter, sheet, state);
  const key = JSON.stringify(progress);
  useEffect(() => {
    if (!reporter || !active || key === sent.current) {
      return;
    }
    const timer = setTimeout(() => {
      sent.current = key;
      reporter.progress({ sheetId: sheet.id, ...progress });
    }, REPORT_DELAY_MS);
    return () => clearTimeout(timer);
    // `progress` is `key` parsed; the key is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reporter, active, key, sheet.id]);
}
