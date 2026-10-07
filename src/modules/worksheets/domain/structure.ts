import type {
  Aufgabe,
  Challenge,
  Chapter,
  Mode,
  Part,
  PartResponse,
  Recommendation,
  Section,
  Sheet,
  StructureLevel,
} from "./contract";
import type { ChapterState } from "./chapterState";

/** Where an Aufgabe sits in its chapter. */
export type AufgabeInfo = {
  aufgabe: Aufgabe | Challenge;
  sheet?: Sheet;
  section?: Section;
  inCheckpoint: boolean;
  challenge: boolean;
};

export type ChapterIndex = {
  aufgaben: Map<string, AufgabeInfo>;
  parts: Map<string, { part: Part; info: AufgabeInfo }>;
  sheets: Map<string, Sheet>;
};

export function indexChapter(chapter: Chapter): ChapterIndex {
  const aufgaben = new Map<string, AufgabeInfo>();
  const parts = new Map<string, { part: Part; info: AufgabeInfo }>();
  const add = (info: AufgabeInfo) => {
    aufgaben.set(info.aufgabe.id, info);
    for (const part of info.aufgabe.parts) {
      parts.set(part.id, { part, info });
    }
  };
  for (const sheet of chapter.sheets) {
    for (const section of sheet.sections) {
      for (const aufgabe of section.aufgaben) {
        add({
          aufgabe,
          sheet,
          section,
          inCheckpoint: section.kind === "checkpoint",
          challenge: false,
        });
      }
    }
  }
  for (const challenge of chapter.challenges) {
    add({ aufgabe: challenge, inCheckpoint: false, challenge: true });
  }
  return {
    aufgaben,
    parts,
    sheets: new Map(chapter.sheets.map((sheet) => [sheet.id, sheet])),
  };
}

export const fixedMode = (sheet: Sheet): Mode | null =>
  sheet.modus !== "wahl" ? sheet.modus : null;

/** The sheet's mode: fixed by the author or chosen by the student. */
export const modeOf = (sheet: Sheet, state: ChapterState): Mode | null =>
  fixedMode(sheet) ?? state.modes[sheet.id] ?? null;

export const isUnlocked = (sheet: Sheet, state: ChapterState) =>
  state.unlocked[sheet.id] ?? sheet.unlocked;

export const isCheckable = (part: Part) => part.task.type !== "auftrag";

export const checkedOnce = (response: PartResponse | undefined) =>
  response?.lastCheckedValue !== undefined;

/** The current answer, including every gap, has been submitted for checking. */
function validatedAnswer(part: Part, response: PartResponse | undefined) {
  if (!response?.lastCheck || !checkedOnce(response)) {
    return false;
  }
  if (
    JSON.stringify(response.value) !== JSON.stringify(response.lastCheckedValue)
  ) {
    return false;
  }
  if (part.task.type === "lueckentext") {
    const values = response.value as Record<string, unknown> | undefined;
    return part.task.gaps.every((gap) => {
      const value = values?.[gap.id];
      return typeof value === "string"
        ? value.trim().length > 0
        : Array.isArray(value) && value.length > 0;
    });
  }
  return true;
}

const LEVEL: Record<StructureLevel, number> = {
  none: 0,
  plan: 1,
  rechenweg: 2,
};

/**
 * `::struktur` sets what a task shows in "Mehr Unterstützung" and "Mehr
 * Übung"; "Mehr Challenges" and the checkpoint never show structure.
 */
export function baseLevel(info: AufgabeInfo, state: ChapterState): number {
  const { aufgabe, sheet } = info;
  if (
    !sheet ||
    info.inCheckpoint ||
    !aufgabe.struktur ||
    !aufgabe.parts.some((p) => p.steps)
  ) {
    return 0;
  }
  const mode = modeOf(sheet, state) ?? "uebung";
  return mode === "challenges" ? 0 : LEVEL[aufgabe.struktur[mode]];
}

export type HelpStep = {
  kind: "tip" | "rule" | "example" | "plan" | "rechenweg";
  /** How much of the Merkkarte this step shows: 1 title, 2 rule, 3 example. */
  merkkarte?: 1 | 2 | 3;
  /** The structure this step adds: 1 plan, 2 Rechenweg. */
  level?: 1 | 2;
};

/**
 * One help button per task, always in the same order: Tipp, Merkkarte,
 * Beispiel, Plan, Rechenweg. Pieces that don't exist or that the task
 * already shows are left out.
 */
export function helpLadder(
  part: Part,
  info: AufgabeInfo,
  state: ChapterState,
): HelpStep[] {
  if (info.inCheckpoint) {
    return [];
  }
  const base = baseLevel(info, state);
  const card = part.tip?.merkkarte;
  const steps: HelpStep[] = [];
  if (part.tip?.text || card) {
    steps.push(
      card ? { kind: "tip", merkkarte: base === 0 ? 1 : 2 } : { kind: "tip" },
    );
  }
  if (card && base === 0) {
    steps.push({ kind: "rule", merkkarte: 2 });
  }
  if (card?.examples) {
    steps.push({ kind: "example", merkkarte: 3 });
  }
  if (part.steps && base === 0) {
    steps.push({ kind: "plan", level: 1 });
  }
  if (part.steps && base < 2) {
    steps.push({ kind: "rechenweg", level: 2 });
  }
  return steps;
}

/** The structure a task shows now: its base level or what help added. */
export function structureLevel(
  info: AufgabeInfo,
  state: ChapterState,
  helpShown: Record<string, number>,
): number {
  const added = info.aufgabe.parts.flatMap((part) =>
    helpLadder(part, info, state)
      .slice(0, helpShown[part.id] ?? 0)
      .map((step) => step.level ?? 0),
  );
  return Math.max(baseLevel(info, state), ...added);
}

/** Optional tasks are folded in "Mehr Challenges" until opened. */
export function isFoldedOptional(
  info: AufgabeInfo,
  state: ChapterState,
  opened: Record<string, boolean>,
) {
  return (
    info.aufgabe.optional &&
    !!info.sheet &&
    modeOf(info.sheet, state) === "challenges" &&
    !opened[info.aufgabe.id]
  );
}

const checkpointOf = (sheet: Sheet) =>
  sheet.sections.find((s) => s.kind === "checkpoint");

/** Every checkable part was checked once (a checkpoint needs its Ampel). */
export function sectionDone(
  sheet: Sheet,
  section: Section,
  state: ChapterState,
): boolean {
  if (section.kind === "checkpoint") {
    return !!state.ampels[sheet.id] && checkpointChecked(sheet, state);
  }
  const parts = section.aufgaben
    .filter(
      (aufgabe) => !(aufgabe.optional && modeOf(sheet, state) === "challenges"),
    )
    .flatMap((aufgabe) => aufgabe.parts)
    .filter(isCheckable);
  return parts.every((part) => validatedAnswer(part, state.responses[part.id]));
}

/** A sheet is done once its checkpoint's Ampel is answered. */
export function sheetDone(sheet: Sheet, state: ChapterState): boolean {
  return checkpointOf(sheet)
    ? !!state.ampels[sheet.id]
    : sheet.sections.every((section) => sectionDone(sheet, section, state));
}

/** Started: any answer saved on the sheet. */
export function sheetStarted(sheet: Sheet, state: ChapterState): boolean {
  return sheet.sections.some((section) =>
    section.aufgaben.some((aufgabe) =>
      aufgabe.parts.some(
        (part) => state.responses[part.id]?.value !== undefined,
      ),
    ),
  );
}

export function challengeOpen(
  challenge: Challenge,
  chapter: Chapter,
  state: ChapterState,
): boolean {
  return challenge.requires.every((id) => {
    const sheet = chapter.sheets.find((s) => s.id === id);
    return !!sheet && sheetDone(sheet, state);
  });
}

export const openChallenges = (chapter: Chapter, state: ChapterState) =>
  chapter.challenges.filter((challenge) =>
    challengeOpen(challenge, chapter, state),
  );

/** The checkpoint is answered once every checkable part was checked. */
export function checkpointChecked(sheet: Sheet, state: ChapterState): boolean {
  const checkpoint = checkpointOf(sheet);
  return (
    !!checkpoint &&
    checkpoint.aufgaben
      .flatMap((aufgabe) => aufgabe.parts)
      .filter(isCheckable)
      .every((part) => validatedAnswer(part, state.responses[part.id]))
  );
}

/** The author's recommendation; a locked sheet falls back to the challenges. */
export function recommendation(
  sheet: Sheet,
  chapter: Chapter,
  state: ChapterState,
): Recommendation {
  const next = sheet.weiter;
  if (next.type === "sheet") {
    const target = chapter.sheets.find((s) => s.id === next.sheetId);
    return target && isUnlocked(target, state) ? next : { type: "challenges" };
  }
  return next.type === "lerntraining" ? { type: "challenges" } : next;
}

/** Opening the chapter lands on the newest sheet the teacher has unlocked. */
export function newestSheet(
  chapter: Chapter,
  state: ChapterState,
): Sheet | undefined {
  return (
    [...chapter.sheets].reverse().find((sheet) => isUnlocked(sheet, state)) ??
    chapter.sheets[0]
  );
}

/** Whether the solution of an Aufgabe is released (teacher decision wins). */
export function isReleased(aufgabe: Aufgabe, state: ChapterState): boolean {
  const solution = aufgabe.solution;
  if (!solution) {
    return false;
  }
  const fixture =
    solution.state === "released" ||
    (solution.state === "teacher" && solution.released);
  return state.released[aufgabe.id] ?? fixture;
}

/**
 * Records a check: wrong attempts only count when the answer changed, so
 * pressing Prüfen twice doesn't open help by itself.
 */
export function recordCheck(
  response: PartResponse,
  check: NonNullable<PartResponse["lastCheck"]>,
): PartResponse {
  const changed =
    JSON.stringify(response.value) !==
    JSON.stringify(response.lastCheckedValue);
  return {
    ...response,
    wrongChecks:
      response.wrongChecks + (check.state !== "richtig" && changed ? 1 : 0),
    lastCheck: check,
    lastCheckedValue: structuredClone(response.value),
  };
}
