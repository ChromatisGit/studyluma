import type {
  Merkkarte,
  RichNode,
  Task,
  TaskPart,
  Worksheet,
  WorksheetSection,
} from "../../catalog";
import { gapsOf, inputGraphicOf, walkInlines } from "../../content-renderer";
import type { ChapterState } from "./chapterState";
import type { Mode, PartResponse, Recommendation } from "./contract";

/** A Merkkarte reachable from a tip, with where it lives. */
export type MerkkarteCard = Merkkarte & {
  chapterId: string;
  /** "9.2 · Die Ableitungsregeln" */
  origin: string;
  /** Link to the card in its chapter's Inhalt. */
  href: string;
};

/** A chapter's worksheets and challenges as one page needs them. */
/** Who is reading: a student or the teacher. */
export type Viewer = "student" | "teacher";

export type SheetsData = {
  id: string;
  /** "9.2", from the course the chapter is read in. */
  number: string;
  title: string;
  buildId: string;
  viewer: Viewer;
  sheets: Worksheet[];
  challenges: Task[];
  /** Tasks whose solution is released (decided by the teacher). */
  releasedSolutions: string[];
  /**
   * The unlocked sheets a Classroom Session holds, by sheet id; null without
   * a session, when this browser's own store decides.
   */
  sessionSheets: Record<string, boolean> | null;
  cards: Record<string, MerkkarteCard>;
};

export type PartInfo = {
  part: TaskPart;
  /** a), b), … when the task has more than one part. */
  letter?: string;
};

/** Where an Aufgabe sits in its chapter. */
export type AufgabeInfo = {
  aufgabe: Task;
  /** From 1 within its section; challenges within the pool. */
  number: number;
  parts: PartInfo[];
  sheet?: Worksheet;
  section?: WorksheetSection;
  inCheckpoint: boolean;
  challenge: boolean;
};

export type ChapterIndex = {
  aufgaben: Map<string, AufgabeInfo>;
  parts: Map<string, PartInfo & { info: AufgabeInfo }>;
  sheets: Map<string, Worksheet>;
};

export const tasksOf = (section: WorksheetSection): Task[] =>
  section.items.flatMap((item) => (item.type === "task" ? [item.task] : []));

export function partInfos(task: Task): PartInfo[] {
  const parts = task.items.flatMap((item) =>
    item.type === "part" ? [item.part] : [],
  );
  return parts.map((part, i) =>
    parts.length > 1 ? { part, letter: String.fromCharCode(97 + i) } : { part },
  );
}

export function indexChapter(data: SheetsData): ChapterIndex {
  const aufgaben = new Map<string, AufgabeInfo>();
  const parts: ChapterIndex["parts"] = new Map();
  const add = (info: AufgabeInfo) => {
    aufgaben.set(info.aufgabe.id, info);
    for (const entry of info.parts) {
      parts.set(entry.part.id, { ...entry, info });
    }
  };
  for (const sheet of data.sheets) {
    for (const section of sheet.sections) {
      tasksOf(section).forEach((aufgabe, i) =>
        add({
          aufgabe,
          number: i + 1,
          parts: partInfos(aufgabe),
          sheet,
          section,
          inCheckpoint: section.checkpoint,
          challenge: false,
        }),
      );
    }
  }
  data.challenges.forEach((aufgabe, i) =>
    add({
      aufgabe,
      number: i + 1,
      parts: partInfos(aufgabe),
      inCheckpoint: false,
      challenge: true,
    }),
  );
  return {
    aufgaben,
    parts,
    sheets: new Map(data.sheets.map((sheet) => [sheet.id, sheet])),
  };
}

export const sheetNumber = (data: SheetsData, sheet: Worksheet) =>
  data.sheets.indexOf(sheet) + 1;

export const fixedMode = (sheet: Worksheet): Mode | null =>
  sheet.chooseMode ? null : "uebung";

/** The sheet's mode: fixed by the author or chosen by the student. */
export const modeOf = (sheet: Worksheet, state: ChapterState): Mode | null =>
  fixedMode(sheet) ?? state.modes[sheet.id] ?? null;

/**
 * The first sheet is open from the start; the teacher unlocks the rest. In a
 * Classroom Session the session's decisions count, otherwise this browser's.
 */
export const isUnlocked = (
  data: SheetsData,
  sheet: Worksheet,
  state: ChapterState,
) => isSheetUnlocked(data.sheets[0]?.id, data.sessionSheets, sheet.id, state);

/** `isUnlocked` from ids alone, for views that load no worksheet content. */
export const isSheetUnlocked = (
  firstSheetId: string | undefined,
  sessionSheets: SheetsData["sessionSheets"],
  sheetId: string,
  state: ChapterState,
) =>
  (sessionSheets ? sessionSheets[sheetId] : state.unlocked[sheetId]) ??
  firstSheetId === sheetId;

export const isCheckable = (part: TaskPart) => part.type !== "Auftrag";

export const checkedOnce = (response: PartResponse | undefined) =>
  response?.lastCheckedValue !== undefined;

/** The current answer, including every gap, has been submitted for checking. */
function validatedAnswer(part: TaskPart, response: PartResponse | undefined) {
  if (!response?.lastCheck || !checkedOnce(response)) {
    return false;
  }
  if (
    JSON.stringify(response.value) !== JSON.stringify(response.lastCheckedValue)
  ) {
    return false;
  }
  if (part.type === "Einsetzen") {
    const values = response.value as Record<string, unknown> | undefined;
    return gapsOf(part.content).every((gap) => {
      const value = values?.[gap.id];
      return typeof value === "string"
        ? value.trim().length > 0
        : Array.isArray(value) && value.length > 0;
    });
  }
  if (part.type === "Graph") {
    const values = response.value as Record<string, unknown> | undefined;
    const slots = inputGraphicOf(part.content)?.graphic.input?.count ?? 1;
    return Array.from({ length: slots }, (_, i) => values?.[String(i)]).every(
      (row) => Array.isArray(row) && row.length > 0,
    );
  }
  return true;
}

/**
 * Whether a part's steps are open from the start: only in "Mehr
 * Unterstützung". In the other modes, in the checkpoint and in challenges
 * they stay the last rung of the help.
 */
export function stepsOpenFromStart(
  part: TaskPart,
  info: AufgabeInfo,
  state: ChapterState,
): boolean {
  const { sheet } = info;
  return (
    !!part.steps &&
    !!sheet &&
    !info.inCheckpoint &&
    (modeOf(sheet, state) ?? "uebung") === "unterstuetzung"
  );
}

/** A part's tip: its text without the Merkkarte link, and the Merkkarte. */
export type Tip = { content: RichNode[]; card?: MerkkarteCard };

export function tipOf(
  part: TaskPart,
  cards: SheetsData["cards"],
): Tip | undefined {
  const nodes = part.markers.tipp;
  if (!nodes?.length) {
    return undefined;
  }
  let card: MerkkarteCard | undefined;
  walkInlines(nodes, (inline) => {
    if (inline.type === "merkkarteRef" && !card) {
      card = cards[inline.targetId];
    }
  });
  const onlyRef = (node: RichNode) =>
    node.type === "paragraph" &&
    node.children.every(
      (child) =>
        child.type === "merkkarteRef" ||
        (child.type === "text" && !child.value.trim()),
    ) &&
    node.children.some((child) => child.type === "merkkarteRef");
  const content = card ? nodes.filter((node) => !onlyRef(node)) : nodes;
  return { content, ...(card ? { card } : {}) };
}

export type HelpStep = {
  kind: "tip" | "rule" | "steps";
  /** How much of the Merkkarte this step shows: 1 title, 2 rule and examples. */
  merkkarte?: 1 | 2;
};

/**
 * One help button per task, always in the same order: Tipp, Merkkarte,
 * Schritte. Pieces that don't exist or that the task already shows are left
 * out. The steps stay available on demand whatever the mode.
 */
export function helpLadder(
  part: TaskPart,
  info: AufgabeInfo,
  state: ChapterState,
  data: SheetsData,
): HelpStep[] {
  if (info.inCheckpoint) {
    return [];
  }
  const open = stepsOpenFromStart(part, info, state);
  const tip = tipOf(part, data.cards);
  const card = tip?.card;
  const steps: HelpStep[] = [];
  if (tip?.content.length || card) {
    steps.push(
      card ? { kind: "tip", merkkarte: open ? 2 : 1 } : { kind: "tip" },
    );
  }
  if (card && !open) {
    steps.push({ kind: "rule", merkkarte: 2 });
  }
  if (part.steps && !open) {
    steps.push({ kind: "steps" });
  }
  return steps;
}

/** Whether a part shows its steps now: from the start or once help opened them. */
export function stepsShown(
  part: TaskPart,
  info: AufgabeInfo,
  state: ChapterState,
  helpShown: Record<string, number>,
  data: SheetsData,
): boolean {
  return (
    !!part.steps &&
    (stepsOpenFromStart(part, info, state) ||
      helpLadder(part, info, state, data)
        .slice(0, helpShown[part.id] ?? 0)
        .some((step) => step.kind === "steps"))
  );
}

/** A step is done once its gaps were checked and are all right. */
export const stepDone = (response: PartResponse, stepId: string): boolean =>
  response.steps?.[stepId]?.lastCheck?.state === "richtig";

/** The step to work on: the first one not done; the step count when all are. */
export function activeStep(part: TaskPart, response: PartResponse): number {
  const items = part.steps?.items ?? [];
  const at = items.findIndex((step) => !stepDone(response, step.id));
  return at < 0 ? items.length : at;
}

/** A part with steps whose answer is right: nothing left to edit. */
export const answerLocked = (part: TaskPart, response: PartResponse): boolean =>
  !!part.steps && response.lastCheck?.state === "richtig";

/** Optional tasks are folded in "Mehr Challenges" until opened. */
export function isFoldedOptional(
  info: AufgabeInfo,
  state: ChapterState,
  opened: Record<string, boolean>,
) {
  return (
    !!info.aufgabe.optional &&
    !!info.sheet &&
    modeOf(info.sheet, state) === "challenges" &&
    !opened[info.aufgabe.id]
  );
}

const checkpointOf = (sheet: Worksheet) =>
  sheet.sections.find((s) => s.checkpoint);

const partsOf = (task: Task) => partInfos(task).map((entry) => entry.part);

/** Every checkable part was checked once (a checkpoint needs its Ampel). */
export function sectionDone(
  sheet: Worksheet,
  section: WorksheetSection,
  state: ChapterState,
): boolean {
  if (section.checkpoint) {
    return !!state.ampels[sheet.id] && checkpointChecked(sheet, state);
  }
  const parts = tasksOf(section)
    .filter(
      (aufgabe) => !(aufgabe.optional && modeOf(sheet, state) === "challenges"),
    )
    .flatMap(partsOf)
    .filter(isCheckable);
  return parts.every((part) => validatedAnswer(part, state.responses[part.id]));
}

/** A sheet is done once its checkpoint's Ampel is answered. */
export function sheetDone(sheet: Worksheet, state: ChapterState): boolean {
  return checkpointOf(sheet)
    ? !!state.ampels[sheet.id]
    : sheet.sections.every((section) => sectionDone(sheet, section, state));
}

/** Started: any answer saved on the sheet. */
export function sheetStarted(sheet: Worksheet, state: ChapterState): boolean {
  return sheet.sections.some((section) =>
    tasksOf(section).some((aufgabe) =>
      partsOf(aufgabe).some(
        (part) => state.responses[part.id]?.value !== undefined,
      ),
    ),
  );
}

/** What a student reports of a sheet to the class: how far, finished, challenges begun. */
export function progressOf(
  data: SheetsData,
  sheet: Worksheet,
  state: ChapterState,
): { reached: number; done: boolean; challenges: boolean } {
  const answered = (aufgabe: Task) =>
    partsOf(aufgabe).some(
      (part) => state.responses[part.id]?.value !== undefined,
    );
  const sectionIndex = (id: string | undefined) =>
    Math.max(
      0,
      sheet.sections.findIndex((section) => section.id === id),
    );
  const furthestAnswered = sheet.sections.reduce(
    (furthest, section, i) => (tasksOf(section).some(answered) ? i : furthest),
    0,
  );
  return {
    reached: Math.max(sectionIndex(state.tabs[sheet.id]), furthestAnswered),
    done: sheetDone(sheet, state),
    challenges: data.challenges.some(answered),
  };
}

/** A challenge opens once all sheets named by `::braucht` are done. */
export function challengeOpen(
  challenge: Task,
  data: SheetsData,
  state: ChapterState,
): boolean {
  return (challenge.prerequisites ?? []).every((id) => {
    const sheet = data.sheets.find((s) => s.id === id);
    return !!sheet && sheetDone(sheet, state);
  });
}

export const openChallenges = (data: SheetsData, state: ChapterState) =>
  data.challenges.filter((challenge) => challengeOpen(challenge, data, state));

/** The checkpoint is answered once every checkable part was checked. */
export function checkpointChecked(
  sheet: Worksheet,
  state: ChapterState,
): boolean {
  const checkpoint = checkpointOf(sheet);
  return (
    !!checkpoint &&
    tasksOf(checkpoint)
      .flatMap(partsOf)
      .filter(isCheckable)
      .every((part) => validatedAnswer(part, state.responses[part.id]))
  );
}

/** The author's recommendation; a locked sheet falls back to the challenges. */
export function recommendation(
  sheet: Worksheet,
  data: SheetsData,
  state: ChapterState,
): Recommendation {
  if (sheet.nextWorksheetId) {
    const target = data.sheets.find((s) => s.id === sheet.nextWorksheetId);
    return target && isUnlocked(data, target, state)
      ? { type: "sheet", sheetId: target.id }
      : { type: "challenges" };
  }
  return { type: "challenges" };
}

/** Opening the chapter lands on the newest sheet the teacher has unlocked. */
export function newestSheet(
  data: SheetsData,
  state: ChapterState,
): Worksheet | undefined {
  return (
    [...data.sheets]
      .reverse()
      .find((sheet) => isUnlocked(data, sheet, state)) ?? data.sheets[0]
  );
}

/** The parts of a task that carry a Musterlösung. */
export const solutionParts = (info: AufgabeInfo) =>
  info.parts.filter((entry) => entry.part.markers.loesung);

/** Whether the solution of an Aufgabe is released (teacher decision wins). */
export function isReleased(
  aufgabe: Task,
  state: ChapterState,
  data: SheetsData,
): boolean {
  const hasSolution = partInfos(aufgabe).some(
    (entry) => entry.part.markers.loesung,
  );
  return (
    hasSolution &&
    (state.released[aufgabe.id] ?? data.releasedSolutions.includes(aufgabe.id))
  );
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
