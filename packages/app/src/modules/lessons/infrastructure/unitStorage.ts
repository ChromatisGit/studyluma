import type { Unit } from "../domain/unit";

/** The unit running in this browser; a browser runs one at a time. */
const CURRENT = "studyluma:unit";
const ARCHIVE = "studyluma:unit:archive";
/** Before units, a lesson belonged to its deck. Those entries are dropped once. */
const LEGACY_PREFIX = "studyluma:lesson:";
const LEGACY_DROPPED = "studyluma:unit:legacy-dropped";

const listeners = new Set<() => void>();
let cache: { raw: string | null; unit: Unit | undefined } = {
  raw: null,
  unit: undefined,
};

function dropLegacy() {
  try {
    if (localStorage.getItem(LEGACY_DROPPED)) {
      return;
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(LEGACY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(LEGACY_DROPPED, "1");
  } catch {
    // Blocked storage: nothing to drop.
  }
}

function read(): Unit | undefined {
  try {
    dropLegacy();
    const raw = localStorage.getItem(CURRENT);
    if (raw !== cache.raw) {
      cache = { raw, unit: raw ? (JSON.parse(raw) as Unit) : undefined };
    }
  } catch {
    cache = { raw: null, unit: undefined };
  }
  return cache.unit;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** The running unit as an external store: it survives a reload and follows other windows. */
export const unitStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => undefined,
};

export function loadUnit(): Unit | undefined {
  return read();
}

export function saveUnit(unit: Unit) {
  try {
    localStorage.setItem(CURRENT, JSON.stringify(unit));
  } catch {
    // Storage can be full or blocked; the unit keeps running in memory.
  }
  notify();
}

/** Ends the unit here: it moves to the local archive and nothing runs any more. */
export function archiveUnit(unit: Unit) {
  try {
    const stored = JSON.parse(localStorage.getItem(ARCHIVE) ?? "[]") as Unit[];
    localStorage.setItem(ARCHIVE, JSON.stringify([...stored, unit]));
  } catch {
    // The archive is best effort.
  }
  try {
    localStorage.removeItem(CURRENT);
  } catch {
    // Blocked storage.
  }
  notify();
}
