import type {
  Catalog,
  Foliensatz,
  Merkkarte,
  Placement,
  Quiz,
  RichNode,
  SlideSegment,
  Summary,
  Worksheet,
} from "../../catalog";

/**
 * One position of a presentation: a slide of the Foliensatz, or an embedded
 * Arbeitsblatt, Quiz, Merkkarte or the chapter's Inhalt. Embedded entries
 * can carry text of their own (`segments`).
 */
export type Slide = {
  /** The placement id; a Baustein used twice has two slides. */
  id: string;
  /** From 1, in the order the class sees them. */
  number: number;
  kind: Placement["kind"];
  title: string;
  /** Titles of the Foliensätze the slide was included through, outermost first. */
  from: string[];
  /** Planned end, seconds since the start of the presentation (`::bis`). */
  planUntil?: number;
  segments: SlideSegment[];
  /** Private notes for the teacher, outer inclusions first. */
  notes: RichNode[];
  worksheet?: Worksheet;
  quiz?: Quiz;
  merkkarte?: Merkkarte & { chapterId: string };
  summary?: Summary;
};

/** A started Foliensatz, fully expanded. */
export type Deck = {
  /** The presentation id; sessions and the projector are keyed by it. */
  id: string;
  chapterId: string;
  title: string;
  slides: Slide[];
};

/**
 * The planned end of every timed entry in the presentation's own timeline.
 * A time inside an included Foliensatz counts from where the inclusion
 * starts; a time on the inclusion itself ends the whole Baustein.
 */
export function plannedTimes(
  catalog: Catalog,
  root: Foliensatz,
): Map<string, number> {
  const sets = new Map(catalog.foliensaetze.map((set) => [set.id, set]));
  const times = new Map<string, number>();
  const visit = (
    set: Foliensatz,
    path: string[],
    base: number,
    depth: number,
  ): number => {
    let last = base;
    for (const entry of set.entries) {
      const own = [...path, entry.id];
      if (entry.kind === "foliensatz") {
        const target = entry.targetId ? sets.get(entry.targetId) : undefined;
        const inner =
          target && depth < 16 ? visit(target, own, last, depth + 1) : last;
        last = entry.until !== undefined ? base + entry.until : inner;
      } else if (entry.until !== undefined) {
        last = base + entry.until;
        times.set(own.join("/"), last);
      }
    }
    return last;
  };
  visit(root, [root.id], 0, 0);
  return times;
}

/** The slides of a presentation, with targets, notes and planned times. */
export function buildDeck(
  catalog: Catalog,
  presentationId: string,
): Deck | undefined {
  const presentation = catalog.presentations.find(
    (item) => item.id === presentationId,
  );
  const root = catalog.foliensaetze.find(
    (set) => set.id === presentation?.rootFoliensatzId,
  );
  if (!presentation || !root) {
    return undefined;
  }
  const sets = new Map(catalog.foliensaetze.map((set) => [set.id, set]));
  const entries = new Map(
    catalog.foliensaetze.flatMap((set) =>
      set.entries.map((entry) => [entry.id, entry] as const),
    ),
  );
  const times = plannedTimes(catalog, root);
  const cards = new Map(
    catalog.summaries.flatMap((summary) =>
      summary.merkkarten.map(
        (card) => [card.id, { ...card, chapterId: summary.chapterId }] as const,
      ),
    ),
  );
  const slides = presentation.placements.flatMap((placement, index) => {
    const entry = entries.get(placement.sourceEntryId);
    if (!entry) {
      return [];
    }
    const worksheet =
      placement.kind === "worksheet"
        ? catalog.worksheets.find((item) => item.id === placement.targetId)
        : undefined;
    const quiz =
      placement.kind === "quiz"
        ? catalog.quizzes.find((item) => item.id === placement.targetId)
        : undefined;
    const merkkarte =
      placement.kind === "merkkarte" && placement.targetId
        ? cards.get(placement.targetId)
        : undefined;
    const summary =
      placement.kind === "summary"
        ? catalog.summaries.find((item) => item.id === placement.targetId)
        : undefined;
    const through = placement.inclusionPath.slice(1, -1);
    const outer = (placement.noteSourceEntryIds ?? []).flatMap(
      (id) => entries.get(id)?.notes ?? [],
    );
    const planUntil = times.get(placement.inclusionPath.join("/"));
    const slide: Slide = {
      id: placement.id,
      number: index + 1,
      kind: placement.kind,
      title:
        placement.title ??
        worksheet?.title ??
        quiz?.title ??
        merkkarte?.title ??
        summary?.title ??
        "",
      from: through.flatMap((id) => {
        const target = entries.get(id)?.targetId;
        const set = target ? sets.get(target) : undefined;
        return set ? [set.title] : [];
      }),
      ...(planUntil !== undefined ? { planUntil } : {}),
      segments: entry.segments,
      notes: [...outer, ...(entry.notes ?? [])],
      ...(worksheet ? { worksheet } : {}),
      ...(quiz ? { quiz } : {}),
      ...(merkkarte ? { merkkarte } : {}),
      ...(summary ? { summary } : {}),
    };
    return [slide];
  });
  return {
    id: presentation.id,
    chapterId: presentation.chapterId,
    title: presentation.title,
    slides,
  };
}

/** The presentation to run: the one asked for, else the chapter's first in the overview. */
export function presentationFor(
  catalog: Catalog,
  chapterId: string,
  requested: string | null,
) {
  const own = catalog.presentations.filter(
    (item) => item.chapterId === chapterId,
  );
  return (
    own.find((item) => item.id === requested) ??
    own.find(
      (item) =>
        catalog.foliensaetze.find((set) => set.id === item.rootFoliensatzId)
          ?.inOverview,
    )
  );
}
