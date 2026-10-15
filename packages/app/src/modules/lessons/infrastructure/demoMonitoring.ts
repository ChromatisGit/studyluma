import type { SheetMonitoring } from "../../worksheets";

/**
 * Scripted class figures for the Demo, which runs no Classroom Session and so
 * has no students to count. Only the Demo's monitoring may use this, and the
 * numbers are shown as demo data; a real session never sees them (a test
 * checks the imports).
 */
const REGISTERED = 22;

export function demoMonitoring(sectionCount: number): SheetMonitoring {
  const done = 3;
  const working = 17;
  // Everybody reaches the first section; each later one is reached by fewer.
  const sections = Array.from({ length: sectionCount }, (_, i) =>
    Math.max(
      done,
      Math.round(
        REGISTERED - (i * (REGISTERED - done)) / Math.max(sectionCount, 1),
      ),
    ),
  );
  return {
    registered: REGISTERED,
    working,
    done,
    sections,
    challenges: 1,
    ampel: {
      sheetId: "demo",
      answered: 15,
      total: REGISTERED,
      levels: { green: 9, yellow: 4, red: 2 },
      causes: { task: 3, approach: 2, mistake: 1 },
    },
  };
}
