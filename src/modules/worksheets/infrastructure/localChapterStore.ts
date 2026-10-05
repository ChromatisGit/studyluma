import { emptyChapterState, type ChapterState } from "../domain/chapterState";
import type {
  AmpelResponse,
  ClassAmpel,
  Mode,
  PartResponse,
  SheetState,
  TeacherStore,
  WorksheetStore,
} from "../domain/contract";
import classAmpel from "./fixtures/class-ampel.json";

const STUDENT = (chapterId: string) => `studyluma:worksheets:${chapterId}`;
const TEACHER = (chapterId: string) => `studyluma:teacher:${chapterId}`;

type TeacherPart = Pick<ChapterState, "unlocked" | "released">;
type StudentPart = Omit<ChapterState, "unlocked" | "released" | "ampels">;

function read<T>(key: string): Partial<T> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<T>;
  } catch {
    return {};
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the page keeps working in memory.
  }
}

const SERVER_SNAPSHOT = emptyChapterState();

/**
 * Saves a chapter's answers and the teacher's decisions in this browser.
 * Demo Ampel responses stay in memory for the current page session.
 * Until there is a server it stands in for both `WorksheetStore` and
 * `TeacherStore`; React reads it through `subscribe`/`getSnapshot`.
 */
export class LocalChapterStore {
  private state: ChapterState = emptyChapterState();
  private loaded = false;
  private listeners = new Set<() => void>();

  constructor(private readonly chapterId: string) {}

  private load() {
    if (this.loaded || typeof window === "undefined") {
      return;
    }
    this.loaded = true;
    const saved = read<StudentPart>(STUDENT(this.chapterId));
    this.state = {
      ...emptyChapterState(),
      responses: saved.responses ?? {},
      modes: saved.modes ?? {},
      seen: saved.seen ?? {},
      tabs: saved.tabs ?? {},
      ...read<TeacherPart>(TEACHER(this.chapterId)),
    };
    window.addEventListener("storage", (event) => {
      if (
        event.key === STUDENT(this.chapterId) ||
        event.key === TEACHER(this.chapterId)
      ) {
        this.loaded = false;
        this.load();
        this.emit();
      }
    });
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ChapterState => {
    this.load();
    return this.state;
  };

  getServerSnapshot = (): ChapterState => SERVER_SNAPSHOT;

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private update(change: (state: ChapterState) => ChapterState) {
    this.load();
    this.state = change(this.state);
    const { unlocked, released, responses, modes, seen, tabs } = this.state;
    const student: StudentPart = { responses, modes, seen, tabs };
    write(STUDENT(this.chapterId), student);
    write(TEACHER(this.chapterId), { unlocked, released });
    this.emit();
  }

  setResponse(partId: string, response: PartResponse) {
    this.update((state) => ({
      ...state,
      responses: { ...state.responses, [partId]: response },
    }));
  }

  setMode(sheetId: string, mode: Mode) {
    this.update((state) => ({
      ...state,
      modes: { ...state.modes, [sheetId]: mode },
    }));
  }

  setAmpel(sheetId: string, ampel: AmpelResponse) {
    this.load();
    this.state = {
      ...this.state,
      ampels: { ...this.state.ampels, [sheetId]: ampel },
    };
    this.emit();
  }

  markSeen(sheetId: string) {
    if (!this.getSnapshot().seen[sheetId]) {
      this.update((state) => ({
        ...state,
        seen: { ...state.seen, [sheetId]: true },
      }));
    }
  }

  setTab(sheetId: string, sectionId: string) {
    this.update((state) => ({
      ...state,
      tabs: { ...state.tabs, [sheetId]: sectionId },
    }));
  }

  setUnlocked(sheetId: string, unlocked: boolean) {
    this.update((state) => ({
      ...state,
      unlocked: { ...state.unlocked, [sheetId]: unlocked },
    }));
  }

  setReleased(aufgabeIds: string[], released: boolean) {
    this.update((state) => ({
      ...state,
      released: {
        ...state.released,
        ...Object.fromEntries(aufgabeIds.map((id) => [id, released])),
      },
    }));
  }

  /** Forgets everything saved for this chapter, answers and decisions. */
  reset() {
    this.update(() => emptyChapterState());
  }

  /** The contract's student adapter on top of this store. */
  worksheetStore(sheetIds: (sheetId: string) => string[]): WorksheetStore {
    return {
      load: async (sheetId) => {
        const state = this.getSnapshot();
        const own: SheetState = {
          responses: Object.fromEntries(
            sheetIds(sheetId).flatMap((id) => {
              const response = state.responses[id];
              return response ? [[id, response]] : [];
            }),
          ),
        };
        const ampel = state.ampels[sheetId];
        const mode = state.modes[sheetId];
        return {
          ...own,
          ...(ampel ? { ampel } : {}),
          ...(mode ? { mode } : {}),
        };
      },
      savePart: async (_sheetId, partId, response) =>
        this.setResponse(partId, response),
      saveMode: async (sheetId, mode) => this.setMode(sheetId, mode),
      saveAmpel: async (sheetId, ampel) => this.setAmpel(sheetId, ampel),
    };
  }

  /** The contract's teacher adapter; the class Ampel is sample data. */
  teacherStore(aufgabenOf: (sheetId: string) => string[]): TeacherStore {
    return {
      setUnlocked: async (sheetId, unlocked) =>
        this.setUnlocked(sheetId, unlocked),
      setReleased: async (sheetId, ids, released) =>
        this.setReleased(ids === "all" ? aufgabenOf(sheetId) : ids, released),
      loadClassAmpel: async (sheetId) => sampleClassAmpel(sheetId),
    };
  }
}

/** Sample totals for the teacher's class Ampel until answers are counted. */
export function sampleClassAmpel(sheetId: string): ClassAmpel {
  const sample = (classAmpel as Record<string, Omit<ClassAmpel, "sheetId">>)[
    sheetId
  ];
  return {
    sheetId,
    answered: sample?.answered ?? 0,
    total: sample?.total ?? 24,
    levels: sample?.levels ?? { green: 0, yellow: 0, red: 0 },
    causes: sample?.causes ?? {},
  };
}

const stores = new Map<string, LocalChapterStore>();

/** One store per chapter and page lifetime. */
export function chapterStore(chapterId: string): LocalChapterStore {
  let store = stores.get(chapterId);
  if (!store) {
    store = new LocalChapterStore(chapterId);
    stores.set(chapterId, store);
  }
  return store;
}
