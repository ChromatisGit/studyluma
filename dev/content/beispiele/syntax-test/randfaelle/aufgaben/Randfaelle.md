+++
titel = "Randfälle"
+++

# "Hilfestufen"

## Antwort: "Schritte Stufe 0"

::schritte 0
- Nur auf Nachfrage.
- Zweiter Schritt.

::antwort
a = 1

## Antwort: "Schritte ohne Zahl"

Ohne Zahl entspricht `::schritte` der Stufe 0.

::antwort
b = 2

::schritte
- Erster Schritt: ((2))
- Zweiter Schritt

## Antwort: "Schritte Stufe 1"

::antwort
c = 3

::schritte 1
- Lies ab.
- Rechne.

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

Der Wert von $x^2$ für $x = 3$ ist ((9)); die Ableitung ist ((2 x | x | 2)).

## Auftrag: "Auftrag mit Merkkarten-Tipp"

Beschreibe den Zusammenhang.

::tipp
Lies nach: [Merkkarte ohne Beispiel](../inhalt.md#merkkarte-ohne-beispiel)

Und in einem anderen Kapitel: [Lösungsmenge](../../zweites-kapitel/inhalt.md#lösungsmenge)

# Checkpoint: "Nur Einsetzen"

## Einsetzen

Ergänze ((5)).
