import { getLesson } from "../../lessons";

export type StepType = "frame" | "quiz" | "sheet" | "summary";
export type FlowStep = { id: string; type: StepType; ref: string | null };
export type Unterrichtsverlauf = {
  id: string;
  chapterId: string;
  name: string;
  steps: FlowStep[];
};

const key = (chapterId: string) => `studyluma:flows:${chapterId}`;

function seeded(chapterId: string): Unterrichtsverlauf[] {
  const lesson = getLesson(chapterId);
  if (!lesson) {
    return [];
  }
  return lesson.lessons.map((part) => ({
    id: `${chapterId}-lesson-${part.number}`,
    chapterId,
    name: part.title,
    steps: [
      {
        id: `${chapterId}-frame-${part.number}`,
        type: "frame",
        ref: String(part.number),
      },
    ],
  }));
}

class FlowStore {
  private value: Unterrichtsverlauf[];
  private loaded = false;
  private listeners = new Set<() => void>();
  constructor(private chapterId: string) {
    this.value = seeded(chapterId);
  }
  private load() {
    if (this.loaded || typeof window === "undefined") {
      return;
    }
    this.loaded = true;
    try {
      const saved = localStorage.getItem(key(this.chapterId));
      if (saved) {
        this.value = JSON.parse(saved) as Unterrichtsverlauf[];
      }
    } catch {
      /* Keep the fixture when storage is unavailable. */
    }
    window.addEventListener("storage", (event) => {
      if (event.key !== key(this.chapterId)) {
        return;
      }
      try {
        this.value = event.newValue
          ? (JSON.parse(event.newValue) as Unterrichtsverlauf[])
          : seeded(this.chapterId);
      } catch {
        this.value = seeded(this.chapterId);
      }
      this.listeners.forEach((listener) => listener());
    });
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => {
    this.load();
    return this.value;
  };
  getServerSnapshot = () => this.value;
  save(flow: Unterrichtsverlauf) {
    this.load();
    this.value = this.value.some((item) => item.id === flow.id)
      ? this.value.map((item) => (item.id === flow.id ? flow : item))
      : [...this.value, flow];
    this.commit();
  }
  remove(id: string) {
    this.load();
    this.value = this.value.filter((item) => item.id !== id);
    this.commit();
  }
  private commit() {
    try {
      localStorage.setItem(key(this.chapterId), JSON.stringify(this.value));
    } catch {
      /* The current page still reflects the edit. */
    }
    this.listeners.forEach((listener) => listener());
  }
}

const stores = new Map<string, FlowStore>();
export function flowStore(chapterId: string) {
  let store = stores.get(chapterId);
  if (!store) {
    store = new FlowStore(chapterId);
    stores.set(chapterId, store);
  }
  return store;
}

/** The demo transports the selected draft to its server-rendered lesson route. */
export function flowFromParam(
  chapterId: string,
  value: string | null,
): Unterrichtsverlauf | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed &&
      "chapterId" in parsed &&
      parsed.chapterId === chapterId &&
      "steps" in parsed &&
      Array.isArray(parsed.steps) &&
      "name" in parsed &&
      typeof parsed.name === "string" &&
      "id" in parsed &&
      typeof parsed.id === "string"
    ) {
      return parsed as Unterrichtsverlauf;
    }
  } catch {
    return flowStore(chapterId)
      .getSnapshot()
      .find((item) => item.id === value);
  }
  return undefined;
}
