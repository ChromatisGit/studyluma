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
      return encoded === undefined
        ? undefined
        : Uint8Array.from(atob(encoded), (character) =>
            character.charCodeAt(0),
          );
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

/**
 * Tests supply the catalog they need; `undefined` goes back to the embedded
 * one. Production code never calls this.
 */
export function provideCatalogFiles(files: CatalogFiles | undefined): void {
  provided = files;
  cache = undefined;
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
