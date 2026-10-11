import type { MathRow } from "../../content-renderer";
/**
 * Zustand, Rückmeldung und erwartete Antworten der Arbeitsblatt-UI. Blätter,
 * Aufgaben und Teile sind die Typen des kompilierten Katalogs
 * (`../../catalog`); Antworten werden unter den Ids der Teile gespeichert.
 */

export type Markdown = string;
export type TypstMath = string;

export type Mode = "unterstuetzung" | "uebung" | "challenges";

export type Recommendation =
  | { type: "challenges" }
  | { type: "sheet"; sheetId: string }
  /** Später. */
  | { type: "lerntraining"; id: string };

// ─── Erwartete Antworten (Mathe) ────────────────────────────────────────────

export type NumberAnswer = {
  kind: "number";
  /** Exakter Wert, falls bekannt: "96", "1/3", "3 pi", "sqrt(2)/2". `e` ist die Eulersche Zahl. */
  exact?: TypstMath;
  /** Compiler-prepared math row for authored exact answers. */
  exactRow?: MathRow;
  /** Nur bei `≈`: gerundeter Wert und geforderte Nachkommastellen. */
  rounded?: { value: string; places: number };
};

export type MathAnswer =
  | NumberAnswer
  /** Term mit Variablen; die erste Variable ersetzt die x-Taste. */
  | {
      kind: "term";
      expected: TypstMath;
      expectedRow?: MathRow;
      variables: string[];
    }
  | { kind: "vector"; components: NumberAnswer[] }
  /** Lösungsmenge; ein Feld, Lösungen mit ";" getrennt. Leer = "Keine Lösung". */
  | { kind: "set"; elements: NumberAnswer[] };

// ─── Zustand und Rückmeldung (UI-Seite) ─────────────────────────────────────

export type CheckState = "richtig" | "fast" | "nochNicht";

export type CheckResult = {
  state: CheckState;
  /** Z. B. "Das ist gerundet. Gib das Ergebnis exakt an, mit π." oder eine `::fehler`-Rückfrage. */
  message?: string;
  note?: string;
  /** Teilergebnisse je Lücke, Tabellenzelle, Vektorkomponente oder Mengenelement. */
  items?: Record<string, CheckState>;
};

export type PartResponse = {
  value: unknown;
  /** Prüfungen mit Ergebnis ≠ richtig und geänderter Antwort (für die Hilfe). */
  wrongChecks: number;
  lastCheck?: CheckResult;
  lastCheckedValue?: unknown;
  /** Antworten in den Rechenweg-Lücken, nach Schritt-Id. */
  steps?: Record<string, { value: unknown; lastCheck?: CheckResult }>;
};

export type AmpelLevel = "green" | "yellow" | "red";
export type AmpelCause =
  "topic" | "task" | "approach" | "execution" | "mistake" | "other";

export type AmpelResponse = {
  level: AmpelLevel;
  /** Pflicht bei yellow und red. */
  causes?: AmpelCause[];
};

/** Pro Schüler und Blatt; nur für den Schüler selbst. */
export type SheetState = {
  responses: Record<string, PartResponse>;
  /** Wird serverseitig ohne Bezug zum Schüler gezählt. */
  ampel?: AmpelResponse;
  /** Gewählter Modus; fehlt bei festem `modus` oder vor der Wahl. */
  mode?: Mode;
};

/** Was die Lehrkraft pro Blatt sieht: anonyme Summen, keine Einzelergebnisse. */
export type ClassAmpel = {
  sheetId: string;
  answered: number;
  total: number;
  levels: Record<AmpelLevel, number>;
  causes: Partial<Record<AmpelCause, number>>;
};

// ─── Adapter ────────────────────────────────────────────────────────────────

/** Speicher für Schülerantworten. Für die UI-Session lokal, später Server. */
export type WorksheetStore = {
  load(sheetId: string): Promise<SheetState>;
  savePart(
    sheetId: string,
    partId: string,
    response: PartResponse,
  ): Promise<void>;
  saveMode(sheetId: string, mode: Mode): Promise<void>;
  saveAmpel(sheetId: string, ampel: AmpelResponse): Promise<void>;
};

/** Lehrkraft-Aktionen pro Klasse. In der UI-Session simuliert die Demo-Ansicht „Lehrkraft“ ihn. */
export type TeacherStore = {
  setUnlocked(sheetId: string, unlocked: boolean): Promise<void>;
  /** `"all"` gibt alle Musterlösungen eines Blatts frei bzw. sperrt sie. */
  setReleased(
    sheetId: string,
    aufgabeIds: string[] | "all",
    released: boolean,
  ): Promise<void>;
  loadClassAmpel(sheetId: string): Promise<ClassAmpel>;
};
