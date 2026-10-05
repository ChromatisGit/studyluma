/**
 * Datenvertrag zwischen Content-Pipeline und Kapitel-/Arbeitsblatt-UI (v1).
 *
 * Die UI baut ausschließlich gegen diese Typen. Woher die Daten kommen
 * (Parser, Fixture, Datenbank), ist für die UI egal. Fachliche Regeln
 * stehen in SPEC-worksheet-format-v1.md.
 *
 * Konventionen
 * - `Markdown` ist Markdown mit Typst-Mathe in `$…$`. Gerendert wird mit dem
 *   bestehenden MarkdownRenderer (kern-typ → MathML). `==…==` ist Textmarker.
 * - `TypstMath` ist Typst-Mathe ohne `$`, z. B. "12 x^3", "1/3", "3 pi".
 * - Lücken stehen im Markdown als Platzhalter `\uFFFE<index>\uFFFE`
 *   (wie im bestehenden GapMarkdownRenderer). `<index>` zeigt in `gaps`.
 * - Tabellen bleiben Markdown (GFM); erste Zeile und erste Spalte sind Köpfe.
 * - Codeblöcke bleiben Markdown; ```lang copy bekommt einen „Kopieren“-Knopf.
 * - Alle Ids sind stabil und eindeutig im Kapitel. Antworten werden unter
 *   diesen Ids gespeichert.
 */

export type Markdown = string;
export type TypstMath = string;

// ─── Kapitel ────────────────────────────────────────────────────────────────

/** Höchstens vier Stunden: mehrere Arbeitsblätter und ein Challenge-Pool. */
export type Chapter = {
  id: string;
  /** "9.2" */
  number: string;
  title: string;
  courseTitle: string;
  /** Wer das Kapitel sieht; bestimmt, welche Lösungsdaten mitkommen. */
  viewer: "student" | "teacher";
  /** In Kursplan-Reihenfolge, nummeriert ab 1. */
  sheets: Sheet[];
  challenges: Challenge[];
};

export type Mode = "unterstuetzung" | "uebung" | "challenges";

export type Recommendation =
  | { type: "challenges" }
  | { type: "sheet"; sheetId: string }
  /** Später. */
  | { type: "lerntraining"; id: string };

/** Ein Arbeitsblatt ist ein Lernschritt. */
export type Sheet = {
  id: string;
  number: number;
  /** Front matter `titel`, z. B. "Gruppe A: Potenzregel". */
  title: string;
  /** Front matter `einleitung`. */
  intro?: string;
  /** `wahl`: Schüler wählen am Anfang; sonst fester Modus ohne Frage. */
  modus: "wahl" | Mode;
  /**
   * Empfehlung am Ende des Blatts. Ist das empfohlene Blatt nicht
   * freigeschaltet, zeigt die UI stattdessen die Challenges.
   */
  weiter: Recommendation;
  /** Von der Lehrkraft freigeschaltet (Zustand vom Server, pro Klasse). */
  unlocked: boolean;
  /** Abschnitte = Tabs, in Quellreihenfolge; höchstens ein Checkpoint, an beliebiger Stelle. */
  sections: Section[];
};

export type SectionKind = "plain" | "checkpoint";

export type Section = {
  id: string;
  kind: SectionKind;
  /** Tab-Beschriftung, z. B. "Aufgaben", "Checkpoint", "Weiterdenken". */
  title: string;
  intro?: Markdown;
  /** Nummern beginnen in jedem Abschnitt bei 1. */
  aufgaben: Aufgabe[];
};

// ─── Aufgaben und Teile ─────────────────────────────────────────────────────

export type StructureLevel = "none" | "plan" | "rechenweg";

export type Aufgabe = {
  id: string;
  /** Ab 1 pro Abschnitt. Verweise außerhalb: "Aufgabe 3", "Checkpoint 1", "Challenge 2". */
  number: number;
  title: string;
  /** Gemeinsamer Text einer Aufgabe mit Teilen. */
  intro?: Markdown;
  /** `::optional`: in „Mehr Challenges“ eingeklappt. */
  optional: boolean;
  /**
   * `::struktur`: was die Aufgabe in „Mehr Unterstützung“ und „Mehr Übung“
   * zeigt. In „Mehr Challenges“ und im Checkpoint immer "none".
   * Fehlt = keine Struktur. `uebung` ist nie mehr als `unterstuetzung`.
   */
  struktur?: { unterstuetzung: StructureLevel; uebung: StructureLevel };
  /** Länge 1 bei einteiligen Aufgaben (dann ohne `letter`). */
  parts: Part[];
  /** Fehlt, wenn kein Teil `::loesung` hat. */
  solution?: AufgabeSolution;
};

/** Eine Challenge ist eine Aufgabe im Kapitel-Pool. */
export type Challenge = Aufgabe & {
  /** `::braucht`: Blätter, die erledigt sein müssen (Ampel beantwortet). Leer = sofort offen. */
  requires: string[];
};

export type Part = {
  /** Bei einteiligen Aufgaben gleich der Aufgaben-Id, sonst "<id>-a" usw. */
  id: string;
  letter?: string;
  title?: string;
  task: Task;
  /** `::tipp`, mit aufgelöster Merkkarte. Nie im Checkpoint. */
  tip?: Tip;
  /** `::schritte`: Plan bzw. Rechenweg. Nie im Checkpoint. */
  steps?: Step[];
};

export type Task = LueckentextTask | AuswahlTask | ErgebnisTask | AuftragTask;

/** Aufgaben dieser Typen haben „Prüfen“. */
export type CheckableTask = LueckentextTask | AuswahlTask | ErgebnisTask;

export type LueckentextTask = {
  type: "lueckentext";
  /** Enthält Lücken-Platzhalter, auch in Tabellenzellen. */
  body: Markdown;
  gaps: Gap[];
};

export type AuswahlTask = {
  type: "auswahl";
  prompt: Markdown;
  /** In der geschriebenen Reihenfolge, nie gemischt; angezeigt als A, B, C. */
  options: AuswahlOption[];
  /** false = genau eine richtige Option → Radiobuttons. */
  multiple: boolean;
};

export type AuswahlOption = { id: string; label: Markdown; correct: boolean };

export type ErgebnisTask = {
  type: "ergebnis";
  prompt: Markdown;
  /**
   * Linke Seite aus `::antwort f'(x) = …`, ohne "=". Wird vor dem Feld
   * gezeigt ("f′(x) ="). Fehlt = "Ergebnis"; bei Mengen Default "L".
   */
  label?: TypstMath;
  answer: MathAnswer;
  /** `::fehler` (optional): bekannte falsche Antworten mit Rückfrage. */
  errors?: { answer: TypstMath; message: string }[];
};

/** Arbeit im Heft, mit dem Nachbarn oder an einem anderen Gerät. Keine Prüfung. */
export type AuftragTask = {
  type: "auftrag";
  prompt: Markdown;
  /** `::textfeld`: einfaches Textfeld, speichert automatisch, ohne Status. */
  textfeld: boolean;
};

// ─── Hilfe und Struktur ─────────────────────────────────────────────────────

/** Mindestens eines von `text` und `merkkarte` ist gesetzt. */
export type Tip = { text?: Markdown; merkkarte?: MerkkarteRef };

/** Von der Pipeline aufgelöst; nur aus dem aktuellen oder früheren Kapiteln. */
export type MerkkarteRef = {
  id: string;
  title: string;
  /** "9.2 · Die Ableitungsregeln" */
  origin: string;
  /** Link in die Zusammenfassung des Kapitels. */
  href: string;
  rule: Markdown;
  examples?: Markdown;
};

/**
 * Ein Schritt aus `::schritte`. Der letzte Schritt hat keine `line`: Seine
 * Zeile im Rechenweg ist das Antwortfeld der Aufgabe.
 */
export type Step = {
  id: string;
  /** Name im Plan, z. B. "Exponent ablesen". */
  name: Markdown;
  /** Zeile mit Lücken im Rechenweg. */
  line?: Markdown;
  gaps?: Gap[];
};

// ─── Lücken ─────────────────────────────────────────────────────────────────

export type Gap =
  /** Mehrere Optionen: Dropdown, leer bis zur Wahl, Optionen alphabetisch. */
  (
    | { id: string; kind: "dropdown"; options: string[]; correct: string }
    /** Eine Option mit Wörtern: freie Eingabe, getrimmt, ohne Groß/Klein (außer in Code). */
    | { id: string; kind: "text"; correct: string; caseSensitive: boolean }
    /** Typst-Mathe: Mathefeld mit Tastenfeld und Zahlregeln. */
    | { id: string; kind: "math"; answer: MathAnswer }
  ) & {
    /** Nur in Tabellenzellen: Kopf von Zeile und Spalte ("f′(x) bei x = 0,5"). */
    cell?: { row: Markdown; column: Markdown };
  };

// ─── Musterlösung ───────────────────────────────────────────────────────────

export type SolutionPart = { partId: string; letter?: string; body: Markdown };

/**
 * Gesperrte Lösungen kommen ohne Inhalt; Schüler sehen dann gar nichts.
 * Der Text wird erst nach der Freigabe ausgeliefert.
 */
export type AufgabeSolution =
  | { state: "locked" }
  | { state: "released"; parts: SolutionPart[] }
  | { state: "teacher"; released: boolean; parts: SolutionPart[] };

// ─── Erwartete Antworten (Mathe) ────────────────────────────────────────────

export type NumberAnswer = {
  kind: "number";
  /** Exakter Wert, falls bekannt: "96", "1/3", "3 pi", "sqrt(2)/2". `e` ist die Eulersche Zahl. */
  exact?: TypstMath;
  /** Nur bei `≈`: gerundeter Wert und geforderte Nachkommastellen. */
  rounded?: { value: string; places: number };
};

export type MathAnswer =
  | NumberAnswer
  /** Term mit Variablen; die erste Variable ersetzt die x-Taste. */
  | { kind: "term"; expected: TypstMath; variables: string[] }
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
