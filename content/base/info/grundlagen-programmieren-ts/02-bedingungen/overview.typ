#import "/src/typst-style/overview-style.typ": *
#show: overview-style

#title[Bedingungen]

Mit *Bedingungen* kann ein Programm *Entscheidungen treffen*.
So wird bestimmter Code nur ausgeführt, wenn eine Variable *wahr* (`true`) ist.

#codeRunner[
  ```ts
  let istVolljaehrig: boolean = true;

  if (istVolljaehrig) {
    console.log("Du darfst Auto fahren!");
  }
  ```
]

Der Code im Block `{ ... }` wird nur ausgeführt, wenn die Bedingung in `( ... )` `true` ist.
Ist sie `false`, wird er übersprungen.

= Bedingungen mit Vergleichsoperatoren

Im Kapitel *Operatoren* haben wir gelernt:
Vergleichsoperatoren (`===`, `>`, `<` …) geben immer einen *boolean* zurück - also `true` oder `false`.

Diese Operatoren können wir direkt in Bedingungen verwenden.

#codeRunner[
  ```ts
  let note: number = 1;

  if (note === 1) {
    console.log("Sehr gut!");
  }
  ```
]

Der Ausdruck `note === 1` liefert `true`, wenn `note` gleich 1 ist.
Damit wird der Code im `if`-Block ausgeführt.

== Logische Operatoren

Mehrere Bedingungen lassen sich mit *logischen Operatoren* kombinieren:

#table[
  Operator, Bedeutung, Beispiel, Ergebnis
  `&&`, und, `true && false`, `false`
  `||`, oder, `true || false`, `true`
  `!`, nicht, `!true`, `false`
]

#codeRunner[
  ```ts
  let alter: number = 17;
  let elternZustimmung: boolean = true;

  if (alter >= 18 || elternZustimmung) {
  console.log("Du darfst teilnehmen!");
  }
  ```
]

Hier ergibt `alter >= 18` zunächst einen *boolean*, der dann mit `elternZustimmung` kombiniert wird.

= Gültigkeit von Variablen

Variablen, die *innerhalb eines Blocks* (z. B. einer `if`-Abfrage) deklariert werden, gelten nur *innerhalb dieses Blocks*.

#codeRunner[
  ```ts
  let zahl: number = 10;

  if (zahl > 5) {
  let text: string = "Groß!";
  console.log(text);
  }

  console.log(text); // Fehler: text existiert hier nicht
  ```
]


= else

Mit `else` legst du fest, was passiert, wenn die Bedingung *nicht* erfüllt ist.

#codeRunner[
  ```ts
  let istVolljaehrig: boolean = false;

  if (istVolljaehrig) {
  console.log("Willkommen!");
  } else {
  console.log("Du bist noch zu jung!");
  }
  ```
]

== else if

Mehrere Fälle kannst du mit `else if` prüfen.

#codeRunner[
  ```ts
  let note: number = 3;

  if (note === 1) {
  console.log("Sehr gut");
  } else if (note === 2) {
  console.log("Gut");
  } else {
  console.log("Verbesserung nötig");
  }
  ```
]
