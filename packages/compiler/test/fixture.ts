import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const CHAPTER = "math/lineare-funktionen/kapitel-a";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const files: Record<string, string> = {
  "inhalt.md": `+++
titel = "Lineare Funktionen"
+++

# "Lineare Funktionen"

Eine lineare Funktion hat die Form $f(x) = m x + b$.

## Merkkarte: "Steigung bestimmen"

Die Steigung durch zwei Punkte ist

$m = (y_2-y_1)/(x_2-x_1)$.

::beispiel
Für $A(1,2)$ und $B(3,6)$ ist $m = 2$.

---

## "Achsenabschnitt"

Der Achsenabschnitt ist der Schnittpunkt mit der y-Achse.
`,
  "aufgaben/Steigung.md": `+++
titel = "Steigung"
einleitung = "Rechne im Heft."
folgeblatt = "Folgeblatt"
+++

# "Grundlagen"

Einleitender Text.

## Gruppe: "Gerade untersuchen"

Gegeben ist die Gerade durch $A(1,2)$ und $B(3,6)$.

### Einsetzen

Die Steigung ist ((2)).

---

Zwischentext.

### Antwort: "Steigung berechnen"

Berechne $m$.

::antwort
m = 2

::schritte
- Differenzen bestimmen: ((4)) und ((2))
- Quotient bilden: ((2))

::tipp
Welche Formel? [Steigung bestimmen](../inhalt.md#steigung-bestimmen)

::loesung
$m = 2$

## Auswahl

::mehrfach

Welche Aussagen stimmen?

- (x) Aussage A
- ( ) Aussage B
- (x) Aussage C

## Auftrag

::optional

Begründe die Regel.

::textfeld

# Checkpoint: "Selbsttest"

## Antwort

Berechne $m$ für $A(0,0)$ und $B(1,3)$.

::antwort
m = 3
`,
  "aufgaben/Folgeblatt.md": `+++
titel = "Folgeblatt"
arbeitsweise-wahl = false
+++

# "Mehr"

## Antwort

Berechne $2 + 2$.

::antwort
4
`,
  "challenges.md": `# Challenges

## Auftrag: "Steigung begründen"

Erkläre, warum $m = 2$ gilt.

::braucht
- Steigung

::loesung
Begründung.

## Gruppe: "Mehrteilig"

### Antwort

Berechne $3 + 3$.

::antwort
6

::schritte
- Rechnen: ((6))
`,
  "quiz/Steigung erkennen.md": `# "Steigung erkennen"

## Auswahl

Welche Steigung hat $f(x) = 2x + 1$?

- ( ) $1$
- (x) $2$
- ( ) $3$

## Auswahl

::mehrfach

Welche Funktionen haben die Steigung 3?

- (x) $f(x) = 3x$
- ( ) $f(x) = x + 3$
- (x) $f(x) = 3x - 1$
`,
  "folien/Baustein.md": `+++
titel = "Steigung verstehen"
in-uebersicht = false
+++

# Merkkarte: "Steigung bestimmen"

# Quiz: Steigung erkennen
::bis 4:00
`,
  "folien/Stunde.md": `+++
titel = "Stunde"
+++

# "Einstieg"

Was fällt euch auf?

![Graph](../bild.png)

::bis 4:00

::notiz
Erst Beobachtungen sammeln.

# Foliensatz: Baustein
::bis 8:00

# Inhalt

# Foliensatz: Baustein
::bis 12:00
`,
};
/** Writes the representative author content (one course, one chapter) to a fresh temporary directory. */
export function makeContent(extra: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "studyluma-test-"));
  const write = (path: string, data: string | Buffer) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), data);
  };
  for (const [path, text] of Object.entries(files))
    write(`${CHAPTER}/${path}`, text);
  write(`${CHAPTER}/bild.png`, PNG);
  write(
    "math/lineare-funktionen/thema.toml",
    'titel = "Lineare Funktionen"\nicon = "gerade"\n',
  );
  write("definitions.toml", 'stundenplan = ["08:00-08:45", "08:50-09:35"]\n');
  write(
    "kurse/mathe.toml",
    'titel = "Mathematik"\n\n[themen]\nlineare-funktionen = ["kapitel-a"]\n',
  );
  for (const [path, text] of Object.entries(extra)) write(path, text);
  return root;
}
