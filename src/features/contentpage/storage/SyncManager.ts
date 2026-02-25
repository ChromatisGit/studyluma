const DEBOUNCE_MS = 1500;
const MAX_INTERVAL_MS = 15_000;

/**
 * Manages batched, debounced DB sync for worksheet task responses.
 *
 * - markDirty(key, value): records a pending change and schedules a flush
 * - flush(): sends all pending changes in one batch request
 * - On network failure: merges the failed batch back into dirty (newer value wins)
 *   so data is never lost and retried on the next flush
 * - destroy(): clears all pending timers on unmount
 *
 * Two-timer approach:
 *   debounce timer  — resets on each keystroke, fires 1.5s after last change
 *   max-interval    — fires unconditionally 15s after the first dirty key,
 *                     so continuous typing always gets flushed eventually
 */
export class SyncManager {
  private dirty = new Map<string, string>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxIntervalTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly onSync: (responses: Record<string, string>) => Promise<void>,
  ) {}

  markDirty(key: string, value: string): void {
    this.dirty.set(key, value);
    this.scheduleDebounce();
    this.scheduleMaxInterval();
  }

  private scheduleDebounce(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, DEBOUNCE_MS);
  }

  /** Start the max-interval timer only once per dirty cycle — don't reset it on each keystroke. */
  private scheduleMaxInterval(): void {
    if (this.maxIntervalTimer !== null) return;
    this.maxIntervalTimer = setTimeout(() => {
      this.maxIntervalTimer = null;
      void this.flush();
    }, MAX_INTERVAL_MS);
  }

  async flush(): Promise<void> {
    // Cancel both timers — a manual flush covers both cases.
    if (this.debounceTimer !== null) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
    if (this.maxIntervalTimer !== null) { clearTimeout(this.maxIntervalTimer); this.maxIntervalTimer = null; }

    if (this.dirty.size === 0) return;

    // Snapshot and clear dirty before the async call so new changes
    // that arrive during the request are not accidentally included.
    const batch = new Map(this.dirty);
    this.dirty.clear();

    try {
      await this.onSync(Object.fromEntries(batch));
    } catch {
      // Network failure: merge the failed batch back into dirty.
      // If a key was updated again while the request was in flight,
      // the newer in-memory value already in dirty takes precedence.
      for (const [key, value] of batch) {
        if (!this.dirty.has(key)) {
          this.dirty.set(key, value);
        }
      }
      // Schedule a retry. The 'online' event in WorksheetStorageContext
      // will also trigger flush() when connectivity is restored.
      this.scheduleDebounce();
    }
  }

  destroy(): void {
    if (this.debounceTimer !== null) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
    if (this.maxIntervalTimer !== null) { clearTimeout(this.maxIntervalTimer); this.maxIntervalTimer = null; }
  }
}
