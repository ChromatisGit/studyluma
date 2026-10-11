import type {
  Merkkarte,
  RichNode,
  StructureLevel,
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

/** The first sheet is open from the start; the teacher unlocks the rest. */
export const isUnlocked = (
  data: SheetsData,
  sheet: Worksheet,
  state: ChapterState,
) => state.unlocked[sheet.id] ?? data.sheets[0]?.id === sheet.id;

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

const LEVEL: Record<StructureLevel, number> = {
  none: 0,
  plan: 1,
  rechenweg: 2,
};

/**
 * `::schritte N` sets what a task shows from the start in "Mehr
 * Unterstützung" and "Mehr Übung"; "Mehr Challenges", the checkpoint and
 * challenges never show steps unasked.
 */
export function baseLevel(info: AufgabeInfo, state: ChapterState): number {
  const { aufgabe, sheet } = info;
  if (
    !sheet ||
    info.inCheckpoint ||
    !aufgabe.struktur ||
    !info.parts.some((p) => p.part.steps)
  ) {
    return 0;
  }
  const mode = modeOf(sheet, state) ?? "uebung";
  return mode === "challenges" ? 0 : LEVEL[aufgabe.struktur[mode]];
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
  kind: "tip" | "rule" | "example" | "plan" | "rechenweg";
  /** How much of the Merkkarte this step shows: 1 title, 2 rule, 3 example. */
  merkkarte?: 1 | 2 | 3;
  /** The structure this step adds: 1 plan, 2 Rechenweg. */
  level?: 1 | 2;
};

/**
 * One help button per task, always in the same order: Tipp, Merkkarte,
 * Beispiel, Plan, Rechenweg. Pieces that don't exist or that the task
 * already shows are left out. The steps stay available on demand whatever
 * their initial level was.
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
  const base = baseLevel(info, state);
  const tip = tipOf(part, data.cards);
  const card = tip?.card;
  const steps: HelpStep[] = [];
  if (tip?.content.length || card) {
    steps.push(
      card ? { kind: "tip", merkkarte: base === 0 ? 1 : 2 } : { kind: "tip" },
    );
  }
  if (card && base === 0) {
    steps.push({ kind: "rule", merkkarte: 2 });
  }
  if (card?.examples.length) {
    steps.push({ kind: "example", merkkarte: 3 });
  }
  if (part.steps && base === 0) {
    steps.push({ kind: "plan", level: 1 });
  }
  // A Plan has no gaps: there is no Rechenweg to ask for.
  if (part.steps?.kind === "rechenweg" && base < 2) {
    steps.push({ kind: "rechenweg", level: 2 });
  }
  return steps;
}

/** The structure a task shows now: its base level or what help added. */
export function structureLevel(
  info: AufgabeInfo,
  state: ChapterState,
  helpShown: Record<string, number>,
  data: SheetsData,
): number {
  const added = info.parts.flatMap(({ part }) =>
    helpLadder(part, info, state, data)
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
