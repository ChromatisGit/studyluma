import type { AmpelResponse } from "../domain/contract";

export type WorksheetLinks = {
  sheet: (sheetId: string) => string;
  challenges: string;
  summary: string;
  chapter: string;
};

/** Page-only state: what is open right now. Nothing here is saved. */
export type UiState = {
  help: Record<string, number>;
  solutionOpen: Record<string, boolean>;
  optionalOpen: Record<string, boolean>;
  newMarks: Record<string, boolean>;
  emptyNote: Record<string, boolean>;
  saved: Record<string, boolean>;
  pickMode: Record<string, boolean>;
  ampelEdit: Record<string, boolean>;
  ampelDraft: Record<string, AmpelResponse | { level: null; causes: [] }>;
  drawer: boolean;
  pult: number | null;
};

export const initialUi = (): UiState => ({
  help: {},
  solutionOpen: {},
  optionalOpen: {},
  newMarks: {},
  emptyNote: {},
  saved: {},
  pickMode: {},
  ampelEdit: {},
  ampelDraft: {},
  drawer: false,
  pult: null,
});
