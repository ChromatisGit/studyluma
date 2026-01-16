#import "/src/typst-style/overview-style.typ": *
#show: overview-style

#title[Schleifen]

Mit *Schleifen* können wir Code *mehrmals hintereinander* ausführen.
Das ist nützlich, wenn sich eine Aufgabe *wiederholt* - etwa beim Zählen, Rechnen oder Durchlaufen von Daten.

= for-Schleife

Die `for`-Schleife ist ideal, wenn man *weiß, wie oft* sich etwas wiederholen soll.

#codeRunner[
  ```ts
  for (let i = 1; i <= 3; i = i + 1) {
    console.log(i);
  }
  ```
]

Das passiert Schritt für Schritt:

- 1. `let i = 1` → Startwert
- 2. `i <= 3` → Bedingung wird geprüft
- 3. `console.log(i)` → Code wird ausgeführt
- 4. `i = i + 1` → Zähler erhöhen
- 5. Zurück zu Schritt 2

#highlight[
  Wie bei `if` gilt auch hier: Variablen existieren nur innerhalb des Blocks. Wir können also nur innerhalb der `for`-Schleife auf die Variable `i` zugreifen.
]

== Kurzschreibweise

Für Zählererhöhungen gibt es eine Abkürzung:

#codeRunner[
  ```ts
  for (let i = 0; i < 5; i++) {
    console.log("Hallo");
  }
  ```
]

`i++` bedeutet dasselbe wie `i = i + 1`.

= while-Schleife

Die `while`-Schleife wiederholt Code, *solange* eine Bedingung `true` ist.
Sie ist nützlich, wenn man *nicht vorher weiß*, wie oft sich etwas wiederholt.

#codeRunner[
  ```ts
  // Startbetrag in Euro
  let geld: number = 100;

  while (geld < 200) {
      console.log("Aktueller Kontostand: " + geld + " €");
      geld = geld * 1.1; // +10 % Zinsen pro Runde
  }
  ```
]

Ablauf:

1. Bedingung prüfen (`geld < 200`)
2. Wenn `true`: Code ausführen
3. Danach wieder zur Bedingung springen
4. Wenn `false`: Schleife endet

#highlight(icon: "warning")[
  *Achtung:* Wenn die Bedingung nie `false` wird, entsteht eine *Endlosschleife*.
]

= Übersicht

#table[
  Schleifentyp, Verwendung, Beispiel
  `for`, Wiederhole eine feste Anzahl an Schritten, `for (let i = 0; i < 10; i++) { ... }`
  `while`, Wiederhole\, solange eine Bedingung gilt, `while (x < 10) { ... }`
]
