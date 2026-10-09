import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { content } from "../../../../.chromatis/build/content";
import type {
  Catalog,
  Merkkarte,
  PublicCatalog,
  Releases,
  RichInline,
  RichNode,
  Task,
  TaskPart,
} from "../domain/types";

function directory(): string {
  const configured =
    process.env.CONTENT_CATALOG_DIR ?? process.env.STUDYLUMA_BUNDLE_DIR;
  if (configured) {
    return resolve(configured);
  }
  const defaultRoot = resolve(
    process.cwd(),
    "../studyluma-content/.generated/studyluma/v1",
  );
  const builds = readdirSync(defaultRoot).filter(
    (name) =>
      /^[a-f0-9]{64}$/.test(name) &&
      statSync(join(defaultRoot, name)).isDirectory(),
  );
  const [only] = builds;
  if (builds.length !== 1 || !only) {
    throw new Error("Set STUDYLUMA_BUNDLE_DIR to one immutable v1 build");
  }
  return join(defaultRoot, only);
}

function bundledBytes(file: string): Uint8Array | undefined {
  const encoded = content.catalog?.files[file];
  return encoded
    ? Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
    : undefined;
}

const LISTS = [
  "topics",
  "courses",
  "chapters",
  "summaries",
  "worksheets",
  "challengePools",
  "quizzes",
  "foliensaetze",
  "presentations",
  "assets",
] as const;

/** Validates the parts of the catalog the Website relies on. */
export function parseCatalog(value: unknown, dir: string): Catalog {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid StudyLuma catalog");
  }
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1) {
    throw new Error(
      `Unsupported StudyLuma schema version ${String(data.schemaVersion)}`,
    );
  }
  if (
    typeof data.buildId !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.buildId)
  ) {
    throw new Error("Invalid StudyLuma buildId");
  }
  if (basename(dir) !== data.buildId) {
    throw new Error("StudyLuma build directory does not match catalog buildId");
  }
  for (const field of LISTS) {
    if (!Array.isArray(data[field])) {
      throw new Error(`Invalid StudyLuma catalog: ${field}`);
    }
  }
  const timetable = data.timetable as { periods?: unknown } | undefined;
  if (!Array.isArray(timetable?.periods)) {
    throw new Error("Invalid StudyLuma catalog: timetable");
  }
  return data as unknown as Catalog;
}

let cache: { directory: string; catalog: Catalog } | undefined;
/** The complete catalog, answers included. Server only. */
export function getCatalog(): Catalog {
  if (typeof Bun === "undefined") {
    const source = bundledBytes("catalog.json");
    if (!source || !content.catalog) {
      throw new Error("Catalog content was not bundled");
    }
    return parseCatalog(
      JSON.parse(new TextDecoder().decode(source)),
      content.catalog.basename,
    );
  }
  const dir = directory();
  if (cache?.directory === dir) {
    return cache.catalog;
  }
  const catalog = parseCatalog(
    JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8")),
    dir,
  );
  cache = { directory: dir, catalog };
  return catalog;
}

export function assetBytes(
  assetId: string,
): { bytes: Uint8Array; mimeType: string } | undefined {
  const asset = getCatalog().assets.find((a) => a.id === assetId);
  if (
    !asset ||
    !/^assets\/[a-f0-9]{64}\.(png|jpg|jpeg|webp|gif|svg)$/.test(asset.path)
  ) {
    return;
  }
  const bytes =
    typeof Bun === "undefined"
      ? bundledBytes(asset.path)
      : readFileSync(join(directory(), asset.path));
  return bytes ? { bytes, mimeType: asset.mimeType } : undefined;
}

type Visitor = (node: Record<string, unknown>) => void;
function walk(value: unknown, visit: Visitor): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
    return;
  }
  const node = value as Record<string, unknown>;
  visit(node);
  Object.values(node).forEach((child) => walk(child, visit));
}

/** Gaps keep their kind; the expected answer never leaves the server. */
function hideGapAnswers(value: unknown): void {
  walk(value, (node) => {
    if (node.type !== "gap") {
      return;
    }
    const answer = node.answer as { checkRow?: unknown } | undefined;
    node.inputKind =
      Array.isArray(node.choices) && node.choices.length
        ? "dropdown"
        : answer?.checkRow
          ? "math"
          : "text";
    delete node.answer;
    // Dropdown choices reveal the correct one by position; the order is neutral on the client.
    if (Array.isArray(node.choices)) {
      node.choices = [...(node.choices as string[])].sort((a, b) =>
        a.localeCompare(b, "de"),
      );
    }
  });
}

/** What the answer field needs to know without the answer: its kind and variable. */
function describeAnswer(part: TaskPart): void {
  const answer = part.answer;
  const variable = answer?.kind
    ? undefined
    : (answer?.exact ?? "").match(/\b[a-z]\b/g)?.find((name) => name !== "e");
  if (variable) {
    part.variable = variable;
  }
  if (answer?.kind) {
    part.answerKind = answer.kind;
  }
}

function hidePart(part: TaskPart, solutionReleased: boolean): void {
  describeAnswer(part);
  delete part.answer;
  delete part.answers;
  delete part.markers.fehler;
  if (!solutionReleased) {
    delete part.markers.loesung;
  }
  for (const option of part.options ?? []) {
    delete option.correct;
  }
}

/** The default for a reader nothing has been released to. */
export const nothingReleased: Releases = {
  summary: () => false,
  solution: () => false,
};

function hideTask(releases: Releases, task: Task): void {
  const released = releases.solution(task.id);
  for (const item of task.items) {
    if (item.type === "part") {
      hidePart(item.part, released);
    }
  }
}

function tipCardIds(task: Task): string[] {
  const ids: string[] = [];
  for (const item of task.items) {
    if (item.type === "part") {
      walk(item.part.markers.tipp, (node) => {
        if (node.type === "merkkarteRef") {
          ids.push(node.targetId as string);
        }
      });
    }
  }
  return ids;
}

/** The tasks of worksheets and challenges, in the order of the catalog. */
function allTasks(catalog: Catalog): Task[] {
  return [
    ...catalog.worksheets.flatMap((sheet) =>
      sheet.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.type === "task" ? [item.task] : [],
        ),
      ),
    ),
    ...catalog.challengePools.flatMap((pool) => pool.challenges),
  ];
}

function allParts(catalog: Catalog): TaskPart[] {
  return allTasks(catalog).flatMap((task) =>
    task.items.flatMap((item) => (item.type === "part" ? [item.part] : [])),
  );
}

/** The Merkkarten the tips of a catalog's tasks point to. */
function tipCardsOf(catalog: Catalog): PublicCatalog["tipCards"] {
  const cards = new Map<string, Merkkarte & { chapterId: string }>();
  for (const summary of catalog.summaries) {
    for (const card of summary.merkkarten) {
      cards.set(card.id, { ...card, chapterId: summary.chapterId });
    }
  }
  const tipCards: PublicCatalog["tipCards"] = {};
  for (const task of allTasks(catalog)) {
    for (const id of tipCardIds(task)) {
      const card = cards.get(id);
      if (card) {
        tipCards[id] = structuredClone(card);
      }
    }
  }
  return tipCards;
}

/**
 * What the teacher's browser gets: everything, answers and notes included,
 * plus what the answer fields need to know (kind and variable).
 */
export function teacherCatalog(): PublicCatalog {
  const catalog = structuredClone(getCatalog());
  allParts(catalog).forEach(describeAnswer);
  return { ...catalog, tipCards: tipCardsOf(getCatalog()) };
}

/** What a student's browser may see. */
export function publicCatalog(releases: Releases): PublicCatalog {
  const catalog = structuredClone(getCatalog());
  const tipCards = tipCardsOf(catalog);
  for (const summary of catalog.summaries) {
    if (!releases.summary(summary.chapterId)) {
      summary.content = [];
      summary.merkkarten = summary.merkkarten.map((card) => ({
        id: card.id,
        title: card.title,
        anchor: card.anchor,
        rule: [] as RichNode[],
        examples: [] as RichNode[][],
      }));
    }
  }
  for (const task of allTasks(catalog)) {
    hideTask(releases, task);
  }
  for (const quiz of catalog.quizzes) {
    for (const question of quiz.questions) {
      for (const option of question.options) {
        delete option.correct;
      }
    }
  }
  for (const set of catalog.foliensaetze) {
    for (const entry of set.entries) {
      delete entry.notes;
    }
  }
  hideGapAnswers(catalog.worksheets);
  hideGapAnswers(catalog.challengePools);
  hideGapAnswers(catalog.summaries);
  hideGapAnswers(catalog.foliensaetze);
  hideGapAnswers(tipCards);
  return { ...catalog, tipCards };
}

export type { RichInline, Releases };
