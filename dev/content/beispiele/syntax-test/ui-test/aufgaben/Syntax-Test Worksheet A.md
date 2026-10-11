+++
titel = "Syntax-Test Worksheet A"
einleitung = "Dieses Arbeitsblatt dient ausschließlich zum Testen der UI und des Konverters."
arbeitsweise-wahl = true
folgeblatt = "Syntax-Test Worksheet B"
+++

# "Aufgaben"

## Einsetzen: "Einfache Lücken"

Textfeld: ((Testwort))

Auswahlfeld: ((richtig | falsch | auch falsch))

Mathematische Lücken: ((2 * x)), ((3/4)) und ((sqrt(2) ~ 1.41)).

| $x$ | $0$ | $1$ | $2$ |
| --- | --- | --- | --- |
| $f(x)$ | ((0)) | ((1)) | ((4)) |

## Gruppe: "Auswahlaufgaben"

Hier gibt es a, b und c.

### Auswahl: "Einfachauswahl"

Welche Option ist als richtig markiert?

- ( ) Option A
- (x) Option B
- ( ) Option C

### Auswahl: "Mehrfachauswahl"

::mehrfach

Welche Optionen sind als richtig markiert?

- (x) Alpha
- ( ) Beta
- (x) Gamma
- ( ) Delta

### Auswahl

::mehrfach

Hier ist trotz Mehrfachauswahl nur eine Option richtig.

- (x) Alpha
- ( ) Beta
- ( ) Gamma
- ( ) Delta

## Antwort: "Exakte Antwort"

Berechne eine künstliche Antwort.

::antwort
y = 1/3

::fehler
1/2: Prüfe den Testwert noch einmal.
2/3: Hast du den Zähler vertauscht?

::tipp
Nutze bei Bedarf die Merkkarte:

[Testregel Eins](../inhalt.md#testregel-eins)

::schritte 2
- Lies den Testwert $a$ ab: ((3))
- Bestimme den Nenner: ((3))
- Gib das Ergebnis an

::loesung
$y = 1/3$

## Antwort: "Gerundete Antwort"

Berechne einen Testwert und runde.

::antwort
~ 0.33

::schritte 1
- Starte mit $1/3$.
- Runde auf zwei Nachkommastellen.
- Gib das Ergebnis an

::loesung
$0.33$

## Antwort

Gib entweder den exakten oder den gerundeten Wert ein. Diese Aufgabe hat keinen Titel.

::antwort
z = 1/3 ~ 0.33

::schritte 3
- Bestimme den exakten Wert: ((1/3))
- Gib das Ergebnis an

::loesung
$z = 1/3$

## Auftrag: "Freier Auftrag mit Textfeld"

Beschreibe kurz irgendeinen Testgedanken.

::textfeld

::loesung
Beispieltext für eine mögliche Lösung.

## Gruppe: "Mehrteilige Aufgabe mit Zwischentext"

Diese Aufgabe testet mehrere Teile und Text zwischen den Teilen.

### Antwort: "Teil A"

Bestimme einen Testwert.

::antwort
a = 2

::schritte 1
- Lies die Zahl ab.
- Gib das Ergebnis an

::loesung
$a = 2$

### Auswahl: "Teil B"

Wähle eine Option.

- (x) Erste Option
- ( ) Zweite Option

---

Dieser Text liegt auf Ebene der gesamten Aufgabe zwischen zwei Aufgabenteilen.

### Einsetzen: "Teil C"

Ergänze ((Test)) und ((4 * x)).

### Auftrag: "Teil D"

Zeichne im Heft ein beliebiges Symbol.

::loesung
Eine beliebige Zeichnung ist ausreichend.

## Antwort: "Optionale Aufgabe"

::optional

Diese Aufgabe soll als optional markiert werden.

::antwort
q = 7

::loesung
$q = 7$

# Checkpoint: "Selbsttest"

## Einsetzen

Checkpoint-Wort: ((fertig))

## Auswahl

Wähle die richtige Antwort.

- ( ) Nein
- (x) Ja

## Antwort: "Kontrollwert"

Gib den Kontrollwert ein.

::antwort
k = 5

::fehler
4: Der Testwert soll 5 sein.

::loesung
$k = 5$
