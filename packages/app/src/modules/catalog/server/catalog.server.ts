import { artifacts } from "chromatis-artifacts";
import {
  CATALOG_FILE,
  CATALOG_META_FILE,
  catalogShapeErrors,
  checkCatalogCompatibility,
  type CatalogArtifactMeta,
} from "@studyluma/catalog-contract";
import type {
  Catalog,
  CatalogIndex,
  Merkkarte,
  PublicCatalog,
  Releases,
  RichInline,
  RichNode,
  Task,
  TaskPart,
} from "../domain/types";

/** The files of one catalog artifact, by path relative to its directory. */
export type CatalogFiles = { read(path: string): Uint8Array | undefined };

/** Why the catalog the build supplied cannot be used. */
export class CatalogUnavailableError extends Error {
  constructor(problems: string[]) {
    super(`The StudyLuma catalog cannot be used: ${problems.join("; ")}`);
    this.name = "CatalogUnavailableError";
  }
}

/** The one catalog artifact the build embedded (the module's `catalog` artifact). */
function embeddedFiles(): CatalogFiles {
  const artifact = artifacts.catalog;
  if (!artifact) {
    throw new CatalogUnavailableError([
      'this build embeds no catalog (artifact "catalog")',
    ]);
  }
  return {
    read(path) {
      const encoded = artifact.files[path];
      if (encoded === undefined) {
        return undefined;
      }
      // A plain loop: `Uint8Array.from` with a mapping callback is about ten
      // times slower, which a multi-megabyte catalog cannot afford on Workers.
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    },
  };
}

function readJson(files: CatalogFiles, path: string): unknown {
  const bytes = files.read(path);
  if (!bytes) {
    throw new CatalogUnavailableError([
      `${path} is missing; build the catalog with @studyluma/compiler`,
    ]);
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new CatalogUnavailableError([`${path} is not valid JSON`]);
  }
}

/**
 * Reads and validates a catalog artifact: its format must be one this app
 * reads, and `catalog.json` must be the build `catalog.meta.json` names.
 * Fails with a message that says what to do; it never rebuilds anything.
 */
export function loadCatalog(files: CatalogFiles): Catalog {
  const meta = readJson(files, CATALOG_META_FILE);
  const compatibility = checkCatalogCompatibility(meta);
  if (!compatibility.ok) {
    throw new CatalogUnavailableError(compatibility.errors);
  }
  const catalog = readJson(files, CATALOG_FILE);
  const problems = catalogShapeErrors(catalog);
  if (problems.length) {
    throw new CatalogUnavailableError(problems);
  }
  const { buildId } = catalog as Catalog;
  if (buildId !== (meta as CatalogArtifactMeta).buildId) {
    throw new CatalogUnavailableError([
      `${CATALOG_META_FILE} names another build than ${CATALOG_FILE}`,
    ]);
  }
  return catalog as Catalog;
}

let provided: CatalogFiles | undefined;
let cache: { files: CatalogFiles; catalog: Catalog } | undefined;
let index: CatalogIndex | undefined;

/**
 * Tests supply the catalog they need; `undefined` goes back to the embedded
 * one. Production code never calls this.
 */
export function provideCatalogFiles(files: CatalogFiles | undefined): void {
  provided = files;
  cache = undefined;
  index = undefined;
  redacted.clear();
}

function loaded(): { files: CatalogFiles; catalog: Catalog } {
  if (!cache) {
    const files = provided ?? embeddedFiles();
    cache = { files, catalog: loadCatalog(files) };
  }
  return cache;
}

/** The complete catalog, answers included. Server only. */
export function getCatalog(): Catalog {
  return loaded().catalog;
}

/** What every page knows about the catalog, built once per build. */
export function catalogIndex(): CatalogIndex {
  const catalog = getCatalog();
  if (index?.buildId !== catalog.buildId) {
    const worksheets: CatalogIndex["worksheets"] = {};
    for (const chapter of catalog.chapters) {
      worksheets[chapter.id] = chapter.worksheetIds.flatMap((id) => {
        const sheet = catalog.worksheets.find((item) => item.id === id);
        return sheet ? [{ id: sheet.id, slug: sheet.slug }] : [];
      });
    }
    index = {
      buildId: catalog.buildId,
      timetable: catalog.timetable,
      summaryTitles: Object.fromEntries(
        catalog.summaries.map((summary) => [summary.chapterId, summary.title]),
      ),
      merkkarten: catalog.summaries.flatMap((summary) =>
        summary.merkkarten.map((card) => ({
          id: card.id,
          anchor: card.anchor,
          chapterId: summary.chapterId,
        })),
      ),
      worksheets,
    };
  }
  return index;
}

/** Fails now, not on the first request, when the embedded catalog is unusable. */
export function verifyCatalog(): void {
  getCatalog();
}

export function assetBytes(
  assetId: string,
): { bytes: Uint8Array; mimeType: string } | undefined {
  const { catalog, files } = loaded();
  const asset = catalog.assets.find((a) => a.id === assetId);
  if (
    !asset ||
    !/^assets\/[a-f0-9]{64}\.(png|jpg|jpeg|webp|gif|svg)$/.test(asset.path)
  ) {
    return;
  }
  const bytes = files.read(asset.path);
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

/**
 * Gaps keep their kind; the expected answer never leaves the server. A
 * dropdown's entries come shuffled from the compiler, so their order tells
 * nothing.
 */
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

/**
 * The Merkkarten the tips of a catalog's tasks point to, looked up in the
 * complete catalog: a tip may point into a chapter the slice leaves out.
 */
function tipCardsOf(
  catalog: Catalog,
  cardsFrom: Catalog = getCatalog(),
): PublicCatalog["tipCards"] {
  const cards = new Map<string, Merkkarte & { chapterId: string }>();
  for (const summary of cardsFrom.summaries) {
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
 * The content of these chapters; the small shared parts (chapters, topics,
 * courses, timetable, assets) stay whole. A presentation brings the
 * Foliensätze it places slides from, wherever they live.
 */
function sliceOf(catalog: Catalog, chapterIds: readonly string[]): Catalog {
  const wanted = new Set(chapterIds);
  const presentations = catalog.presentations.filter((item) =>
    wanted.has(item.chapterId),
  );
  const sets = new Set(
    presentations.flatMap((item) => [
      item.rootFoliensatzId,
      ...item.placements.map((placement) => placement.sourceFoliensatzId),
    ]),
  );
  return {
    ...catalog,
    summaries: catalog.summaries.filter((item) => wanted.has(item.chapterId)),
    worksheets: catalog.worksheets.filter((item) => wanted.has(item.chapterId)),
    challengePools: catalog.challengePools.filter((item) =>
      wanted.has(item.chapterId),
    ),
    quizzes: catalog.quizzes.filter((item) => wanted.has(item.chapterId)),
    foliensaetze: catalog.foliensaetze.filter(
      (item) => wanted.has(item.chapterId) || sets.has(item.id),
    ),
    presentations,
  };
}

/**
 * Redacted slices already worked out, most recently used last. The catalog
 * is fixed for a build, so a slice depends only on its key: the reader, the
 * chapters and what is released of them. Pages share these objects; nothing
 * may change them.
 */
const redacted = new Map<string, PublicCatalog>();
const REDACTED_LIMIT = 32;

function remembered(key: string, make: () => PublicCatalog): PublicCatalog {
  const found = redacted.get(key);
  if (found) {
    redacted.delete(key);
    redacted.set(key, found);
    return found;
  }
  const made = make();
  redacted.set(key, made);
  const oldest = redacted.keys().next().value;
  if (redacted.size > REDACTED_LIMIT && oldest !== undefined) {
    redacted.delete(oldest);
  }
  return made;
}

/** What of these chapters is released, as a key. */
function releaseKey(releases: Releases, chapterIds: readonly string[]): string {
  const slice = sliceOf(getCatalog(), chapterIds);
  const summaries = slice.summaries
    .filter((summary) => releases.summary(summary.chapterId))
    .map((summary) => summary.chapterId);
  const solutions = allTasks(slice)
    .filter((task) => releases.solution(task.id))
    .map((task) => task.id);
  return `${summaries.join(",")}|${solutions.join(",")}`;
}

/**
 * What the teacher's browser gets for these chapters: everything, answers
 * and notes included, plus what the answer fields need to know (kind and
 * variable).
 */
export function teacherCatalog(chapterIds: readonly string[]): PublicCatalog {
  const key = `teacher|${getCatalog().buildId}|${chapterIds.join(",")}`;
  return remembered(key, () => {
    const catalog = structuredClone(sliceOf(getCatalog(), chapterIds));
    allParts(catalog).forEach(describeAnswer);
    return { ...catalog, tipCards: tipCardsOf(catalog) };
  });
}

/** What a student's browser may see of these chapters. */
export function publicCatalog(
  releases: Releases,
  chapterIds: readonly string[],
): PublicCatalog {
  const key = `public|${getCatalog().buildId}|${chapterIds.join(",")}|${releaseKey(releases, chapterIds)}`;
  return remembered(key, () => redactedCatalog(releases, chapterIds));
}

function redactedCatalog(
  releases: Releases,
  chapterIds: readonly string[],
): PublicCatalog {
  const catalog = structuredClone(sliceOf(getCatalog(), chapterIds));
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
