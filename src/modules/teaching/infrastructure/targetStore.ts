export type ActiveTarget = {
  kind: "sheet" | "quiz";
  id: string;
  chapterId: string;
} | null;
class TargetStore {
  private value: ActiveTarget = null;
  private loaded = false;
  private listeners = new Set<() => void>();
  constructor(private courseId: string) {}
  private load() {
    if (this.loaded || typeof window === "undefined") {
      return;
    }
    this.loaded = true;
    try {
      this.value = JSON.parse(
        localStorage.getItem(`studyluma:target:${this.courseId}`) ?? "null",
      ) as ActiveTarget;
    } catch {
      this.value = null;
    }
    window.addEventListener("storage", (event) => {
      if (event.key !== `studyluma:target:${this.courseId}`) {
        return;
      }
      try {
        this.value = JSON.parse(event.newValue ?? "null") as ActiveTarget;
      } catch {
        this.value = null;
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
  getServerSnapshot = () => null;
  set(value: ActiveTarget) {
    this.load();
    this.value = value;
    try {
      localStorage.setItem(
        `studyluma:target:${this.courseId}`,
        JSON.stringify(value),
      );
    } catch {
      /* Keep the page state. */
    }
    this.listeners.forEach((listener) => listener());
  }
}
const stores = new Map<string, TargetStore>();
export function targetStore(courseId: string) {
  let store = stores.get(courseId);
  if (!store) {
    store = new TargetStore(courseId);
    stores.set(courseId, store);
  }
  return store;
}
