import type { Section } from '@schema/page';
import type { CheckpointResponse } from '@schema/checkpointTypes';

type TaskResponseEntry = {
  value: string;
  updatedAt: number;
};

type WorksheetRecord = {
  worksheetId: string;
  signature: string;
  createdAt: number;
  lastAccessed: number;
  responses: Record<string, TaskResponseEntry>;
  checkpoints: Record<number, CheckpointResponse>;
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

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `worksheet-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export class WorksheetStorage {
  private slug: string;
  private signature: string;

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

  get worksheetId(): string | null {
    if (!WorksheetStorage.isAvailable()) return null;
    const { state, record } = this.ensureRecord();
    WorksheetStorage.persist(state);
    return record.worksheetId;
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
  }

  readCheckpoint(sectionIndex: number): CheckpointResponse | null {
    if (!WorksheetStorage.isAvailable()) return null;
    const { state, record } = this.ensureRecord();
    WorksheetStorage.persist(state);
    return record.checkpoints[sectionIndex] ?? null;
  }

  saveCheckpoint(sectionIndex: number, response: CheckpointResponse): void {
    if (!WorksheetStorage.isAvailable()) return;
    const { state, record } = this.ensureRecord();
    record.checkpoints[sectionIndex] = response;
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
      worksheetId: generateId(),
      signature,
      createdAt: timestamp,
      lastAccessed: timestamp,
      responses: {},
      checkpoints: {},
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
      const parsed = JSON.parse(raw) as StorageState;
      if (parsed && parsed.version === 1 && parsed.worksheets) {
        // Migrate existing records that lack checkpoints field
        for (const record of Object.values(parsed.worksheets)) {
          if (record && !record.checkpoints) {
            record.checkpoints = {};
          }
        }
        return {
          version: 1,
          worksheets: parsed.worksheets,
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
