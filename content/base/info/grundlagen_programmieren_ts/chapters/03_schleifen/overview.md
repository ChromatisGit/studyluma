# Schleifen

Mit **Schleifen** können wir Code **mehrmals hintereinander** ausführen.
Das ist nützlich, wenn sich eine Aufgabe **wiederholt** – etwa beim Zählen, Rechnen oder Durchlaufen von Daten.

## for-Schleife

Die **`for`-Schleife** ist ideal, wenn man **weiß, wie oft** sich etwas wiederholen soll.

<CodeExample>
for (let i = 1; i <= 3; i = i + 1) {
  console.log(i);
}
</CodeExample>

Das passiert Schritt für Schritt:

1. `let i = 1` → Startwert
2. `i <= 3` → Bedingung wird geprüft
3. `console.log(i)` → Code wird ausgeführt
4. `i = i + 1` → Zähler erhöhen
5. Zurück zu Schritt 2

> **Merke:** Die for-Schleife eignet sich, wenn man eine **feste Anzahl** an Durchläufen hat.

### Kurzschreibweise

Für Zählererhöhungen gibt es eine Abkürzung:

<CodeExample>
for (let i = 0; i < 5; i++) {
  console.log("Hallo");
}
</CodeExample>

`i++` bedeutet dasselbe wie `i = i + 1`.

## while-Schleife

Die **`while`-Schleife** wiederholt Code, **solange** eine Bedingung `true` ist.
Sie ist nützlich, wenn man **nicht vorher weiß**, wie oft sich etwas wiederholt.

<CodeExample>
// Startbetrag in Euro 
let geld: number = 100; 

while (geld < 200) {
    console.log("Aktueller Kontostand: " + geld + " €");
    geld = geld * 1.1; // +10 % Zinsen pro Runde
}
</CodeExample>

Ablauf:

1. Bedingung prüfen (`zahl <= 3`)
2. Wenn `true`: Code ausführen
3. Danach wieder zur Bedingung springen
4. Wenn `false`: Schleife endet

> **Achtung:** Wenn die Bedingung nie `false` wird, entsteht eine **Endlosschleife**.

## Schleifen mit Bedingungen kombinieren

<CodeExample>
for (let i = 1; i <= 5; i++) {
  if (i % 2 === 0) {
    console.log(i + " ist gerade");
  }
}
</CodeExample>

Hier wird der Code im `if`-Block nur ausgeführt, wenn `i` gerade ist.

## Übersicht

| Schleifentyp | Verwendung                                | Beispiel                               |
| ------------ | ----------------------------------------- | -------------------------------------- |
| `for`        | Wiederhole eine feste Anzahl an Schritten | `for (let i = 0; i < 10; i++) { ... }` |
| `while`      | Wiederhole, solange eine Bedingung gilt   | `while (x < 10) { ... }`               |
