import type { Section } from '@schema/page';
import type { CheckpointResponse } from '@schema/checkpointTypes';

type TaskResponseEntry = {
  value: string;
  updatedAt: number;
};

type WorksheetRecord = {
  signature: string;
  createdAt: number;
  lastAccessed: number;
  responses: Record<string, TaskResponseEntry>;
  submittedSections: number[];
};

type StorageState = {
  version: 1;
  worksheets: Record<string, WorksheetRecord>;
};

const STORAGE_KEY = 'worksheet.storage.v1';
const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 365; // One year

function createDefaultState(): StorageState {
  return {
    version: 1,
    worksheets: {},
  };
}

function hashString(value: string): string {
  // djb2 hash for a short, stable signature
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export class WorksheetStorage {
  private slug: string;
  private signature: string;

  /** Called after each task response is saved to localStorage. Feeds into SyncManager. */
  onSave?: (taskKey: string, value: string) => void;
  /** Called after a checkpoint is submitted. Fires immediately to server. */
  onCheckpointSave?: (sectionIndex: number, response: CheckpointResponse) => void;
  /** Called by flush() — wired to SyncManager.flush() in context. */
  onFlush?: () => Promise<void>;

  private constructor(slug: string, signature: string) {
    this.slug = slug;
    this.signature = signature;
  }

  static isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  static computeSignature(params: { title?: string; content?: Section[] | unknown[] }): string {
    const normalized = JSON.stringify({
      title: params.title ?? '',
      content: params.content ?? [],
    });
    return hashString(normalized);
  }

  static forWorksheet(slug: string, signature: string): WorksheetStorage {
    const instance = new WorksheetStorage(slug, signature);
    instance.ensureRecord();
    return instance;
  }

  readResponse(taskKey: string): string {
    if (!WorksheetStorage.isAvailable()) return '';
    const { state, record } = this.ensureRecord();
    const stored = record.responses[taskKey]?.value ?? '';
    WorksheetStorage.persist(state);
    return stored;
  }

  saveResponse(taskKey: string, value: string): void {
    if (!WorksheetStorage.isAvailable()) return;
    const { state, record } = this.ensureRecord();

    if (!value) {
      delete record.responses[taskKey];
    } else {
      record.responses[taskKey] = {
        value,
        updatedAt: Date.now(),
      };
    }

    WorksheetStorage.persist(state);
    this.onSave?.(taskKey, value);
  }

  /** Returns true if the user has already submitted the checkpoint for this section. */
  hasCheckpoint(sectionIndex: number): boolean {
    if (!WorksheetStorage.isAvailable()) return false;
    const { state, record } = this.ensureRecord();
    WorksheetStorage.persist(state);
    return record.submittedSections.includes(sectionIndex);
  }

  /**
   * Marks a section's checkpoint as submitted locally (stores only the index).
   * Fires onCheckpointSave with the full response for immediate server sync.
   */
  markCheckpointSubmitted(sectionIndex: number, response: CheckpointResponse): void {
    if (!WorksheetStorage.isAvailable()) return;
    const { state, record } = this.ensureRecord();
    if (!record.submittedSections.includes(sectionIndex)) {
      record.submittedSections.push(sectionIndex);
    }
    WorksheetStorage.persist(state);
    this.onCheckpointSave?.(sectionIndex, response);
  }

  /**
   * Triggers a flush of all pending dirty task responses to the DB.
   * Wired to SyncManager.flush() by WorksheetStorageContext.
   */
  async flush(): Promise<void> {
    await this.onFlush?.();
  }

  /**
   * Merges data loaded from the DB into localStorage.
   * DB task responses take precedence over existing localStorage values.
   * submittedSections are unioned (any section submitted on any device is preserved).
   * Does NOT trigger onSave / onCheckpointSave callbacks.
   */
  mergeDbData(responses: Record<string, string>, submittedSections: number[]): void {
    if (!WorksheetStorage.isAvailable()) return;
    const { state, record } = this.ensureRecord();

    for (const [taskKey, value] of Object.entries(responses)) {
      if (value) {
        record.responses[taskKey] = { value, updatedAt: Date.now() };
      }
    }

    for (const idx of submittedSections) {
      if (!record.submittedSections.includes(idx)) {
        record.submittedSections.push(idx);
      }
    }

    WorksheetStorage.persist(state);
  }

  clearAll(): void {
    if (!WorksheetStorage.isAvailable()) return;
    const state = WorksheetStorage.loadState();
    WorksheetStorage.removeExpired(state);
    delete state.worksheets[this.slug];
    WorksheetStorage.persist(state);
  }

  private ensureRecord(): { state: StorageState; record: WorksheetRecord } {
    const state = WorksheetStorage.loadState();
    WorksheetStorage.removeExpired(state);

    let record = state.worksheets[this.slug];

    const isSignatureMismatch = record && record.signature !== this.signature;
    if (!record || isSignatureMismatch) {
      record = WorksheetStorage.createRecord(this.signature);
      state.worksheets[this.slug] = record;
    }

    record.lastAccessed = Date.now();

    return { state, record };
  }

  private static createRecord(signature: string): WorksheetRecord {
    const timestamp = Date.now();
    return {
      signature,
      createdAt: timestamp,
      lastAccessed: timestamp,
      responses: {},
      submittedSections: [],
    };
  }

  private static loadState(): StorageState {
    if (!WorksheetStorage.isAvailable()) {
      return createDefaultState();
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && parsed['version'] === 1 && parsed['worksheets'] && typeof parsed['worksheets'] === 'object') {
        const worksheets = parsed['worksheets'] as Record<string, Record<string, unknown>>;
        // Migrate existing records to new format
        for (const record of Object.values(worksheets)) {
          if (!record) continue;
          // Remove old checkpoints field, replace with submittedSections
          if ('checkpoints' in record && !('submittedSections' in record)) {
            const checkpoints = record['checkpoints'] as Record<string, unknown>;
            (record as WorksheetRecord).submittedSections = Object.keys(checkpoints).map(Number);
            delete (record as Record<string, unknown>).checkpoints;
          }
          if (!('submittedSections' in record)) {
            (record as WorksheetRecord).submittedSections = [];
          }
          // Remove old worksheetId field (no longer needed)
          if ('worksheetId' in record) {
            delete (record as Record<string, unknown>).worksheetId;
          }
        }
        return {
          version: 1,
          worksheets: worksheets as unknown as Record<string, WorksheetRecord>,
        };
      }
    } catch {
      // Fallback to default state on parse errors
    }

    return createDefaultState();
  }

  private static persist(state: StorageState): void {
    if (!WorksheetStorage.isAvailable()) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private static removeExpired(state: StorageState): void {
    const cutoff = Date.now() - STALE_AFTER_MS;
    for (const slug of Object.keys(state.worksheets)) {
      const record = state.worksheets[slug];
      if (!record || record.lastAccessed < cutoff) {
        delete state.worksheets[slug];
      }
    }
  }
}
