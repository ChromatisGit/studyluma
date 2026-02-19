import type { MacroStateAdapter } from "./MacroStateAdapter";

/**
 * Presenter-side store: mutable in-memory state + a settable broadcast listener.
 * Created once per component lifetime via useState initializer to avoid
 * ref-during-render issues with the React compiler.
 */
export type PresenterStore = {
  adapter: MacroStateAdapter;
  /** Call in useEffect to wire up the broadcast callback. */
  setBroadcast: (fn: (state: Record<string, string>) => void) => void;
  /** Read current state snapshot (for SYNC_RESPONSE). */
  getState: () => Record<string, string>;
};

export function createPresenterStore(): PresenterStore {
  const data: Record<string, string> = {};
  let broadcast: ((state: Record<string, string>) => void) | null = null;

  return {
    adapter: {
      read: (key) => data[key] ?? null,
      write: (key, value) => {
        data[key] = value;
        broadcast?.({ ...data });
      },
      isReadOnly: false,
    },
    setBroadcast: (fn) => {
      broadcast = fn;
    },
    getState: () => ({ ...data }),
  };
}

/**
 * Projector side: reads from broadcast state, writes are no-ops.
 */
export function createProjectorAdapter(
  state: Record<string, string>
): MacroStateAdapter {
  return {
    read: (key) => state[key] ?? null,
    write: () => {
      /* no-op on projector */
    },
    isReadOnly: true,
  };
}
