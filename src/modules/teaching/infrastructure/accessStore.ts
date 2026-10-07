export type SummaryRule = "kapitel" | "abschluss" | "manuell";
type Access = { unlocked: boolean; rule: SummaryRule };

class AccessStore {
  private value: Access = { unlocked: false, rule: "manuell" };
  private loaded = false;
  private listeners = new Set<() => void>();
  constructor(private chapterId: string) {}
  private load() {
    if (this.loaded || typeof window === "undefined") {
      return;
    }
    this.loaded = true;
    try {
      const saved = localStorage.getItem(`studyluma:summary:${this.chapterId}`);
      if (saved) {
        this.value = JSON.parse(saved) as Access;
      }
    } catch {
      /* Use the default. */
    }
    window.addEventListener("storage", (event) => {
      if (event.key !== `studyluma:summary:${this.chapterId}`) {
        return;
      }
      try {
        this.value = event.newValue
          ? (JSON.parse(event.newValue) as Access)
          : { unlocked: false, rule: "manuell" };
      } catch {
        this.value = { unlocked: false, rule: "manuell" };
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
  set(change: Partial<Access>) {
    this.load();
    this.value = { ...this.value, ...change };
    try {
      localStorage.setItem(
        `studyluma:summary:${this.chapterId}`,
        JSON.stringify(this.value),
      );
    } catch {
      /* State remains available in this page. */
    }
    this.listeners.forEach((listener) => listener());
  }
}

const stores = new Map<string, AccessStore>();
export function summaryStore(chapterId: string) {
  let store = stores.get(chapterId);
  if (!store) {
    store = new AccessStore(chapterId);
    stores.set(chapterId, store);
  }
  return store;
}
