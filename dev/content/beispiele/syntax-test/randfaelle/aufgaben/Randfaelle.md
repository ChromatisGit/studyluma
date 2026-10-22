+++
titel = "Randfälle"
+++

# "Hilfestufen"

## Antwort: "Schritte mit Lücken"

::antwort
a = 1

::schritte
- Erster Schritt: (($1$))
- Zweiter Schritt: (($1$))

## Antwort: "Schritt mit zwei Lücken"

Ein Schritt ist erst richtig, wenn alle seine Lücken stimmen.

::antwort
b = 2

::schritte
- Beide Zahlen ablesen: (($1$)) und (($2$))

## Antwort: "Ein einzelner Schritt"

::antwort
c = 3

::schritte
- Lies ab: (($3$))

## Gruppe: "Optionale Gruppe"

::optional

Die gesamte Gruppe ist optional.

### Antwort

::antwort
d = 4

::tipp
Ein Tipp nur am Teil.

::loesung
$d = 4$

### Auftrag

::textfeld

::loesung
Eine mögliche Lösung.

## Auswahl: "Alle richtig"

::mehrfach

Hier sind alle vier Optionen richtig.

- (x) Eins
- (x) Zwei
- (x) Drei
- (x) Vier

## Auswahl: "Nur zwei Optionen"

- (x) Ja
- ( ) Nein

## Einsetzen: "Auswahl mit Mathematik"

Der Wert von $x^2$ für $x = 3$ ist (($9$)); die Ableitung ist ((2 x | x | 2)).

## Auftrag: "Auftrag mit Merkkarten-Tipp"

Beschreibe den Zusammenhang.

::tipp
Lies nach: [Merkkarte ohne Beispiel](../inhalt.md#merkkarte-ohne-beispiel)

Und in einem anderen Kapitel: [Lösungsmenge](../../zweites-kapitel/inhalt.md#lösungsmenge)

# Checkpoint: "Nur Einsetzen"

## Einsetzen

Ergänze (($5$)).
