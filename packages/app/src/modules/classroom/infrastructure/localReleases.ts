import type { SummaryRule } from "../../catalog";

type LocalReleases = {
  summaries: string[];
  solutions: string[];
  rules: Record<string, SummaryRule>;
};

const KEY = "studyluma:demo-releases";
const empty: LocalReleases = { summaries: [], solutions: [], rules: {} };
/** What this browser saved; null until the visitor changes a release. */
let stored: LocalReleases | null = null;
/** Chapters released from the start, until the visitor changes a release. */
let defaults: string[] = [];
/** What the pages read: the saved releases, else the defaults. */
let state: LocalReleases = empty;
/** The same on the server and while hydrating: nothing is saved there. */
let initial: LocalReleases = empty;
let loaded = false;
const listeners = new Set<() => void>();

function refresh() {
  initial = defaults.length ? { ...empty, summaries: defaults } : empty;
  state = stored ?? initial;
}

function load() {
  if (loaded || typeof window === "undefined") {
    return;
  }
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = JSON.parse(raw ?? "{}") as Partial<LocalReleases>;
    stored =
      raw === null
        ? null
        : {
            summaries: Array.isArray(saved.summaries) ? saved.summaries : [],
            solutions: Array.isArray(saved.solutions) ? saved.solutions : [],
            rules:
              saved.rules && typeof saved.rules === "object" ? saved.rules : {},
          };
  } catch {
    stored = null;
  }
  refresh();
}

function update(next: LocalReleases) {
  stored = next;
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Continue with memory state when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

export const localReleases = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    load();
    return state;
  },
  getServerSnapshot() {
    return initial;
  },
  /**
   * Chapters whose Inhalt is released until the visitor changes a release.
   * Set while rendering, before the first read; it notifies nobody.
   */
  setDefaults(summaryIds: string[]) {
    if (summaryIds.join("\n") === defaults.join("\n")) {
      return;
    }
    defaults = summaryIds;
    refresh();
  },
  setSummary(chapterId: string, released: boolean) {
    const current = localReleases.getSnapshot();
    update({
      ...current,
      summaries: released
        ? [...new Set([...current.summaries, chapterId])]
        : current.summaries.filter((id) => id !== chapterId),
    });
  },
  setRule(chapterId: string, rule: SummaryRule) {
    const current = localReleases.getSnapshot();
    update({ ...current, rules: { ...current.rules, [chapterId]: rule } });
  },
  setSolutions(taskIds: string[], released: boolean) {
    const current = localReleases.getSnapshot();
    update({
      ...current,
      solutions: released
        ? [...new Set([...current.solutions, ...taskIds])]
        : current.solutions.filter((id) => !taskIds.includes(id)),
    });
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) {
      loaded = false;
      load();
      listeners.forEach((listener) => listener());
    }
  });
}
