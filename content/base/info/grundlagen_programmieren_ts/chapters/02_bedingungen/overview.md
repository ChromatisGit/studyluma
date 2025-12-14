# Bedingungen

Mit **Bedingungen** kann ein Programm **Entscheidungen treffen**.
So wird bestimmter Code nur ausgeführt, wenn eine Variable *wahr* (`true`) ist.

<CodeExample>
let istVolljaehrig: boolean = true;

if (istVolljaehrig) {
console.log("Du darfst Auto fahren!");
} 
</CodeExample>

Der Code im Block `{ ... }` wird nur ausgeführt, wenn die Bedingung in `()` `true` ist.
Ist sie `false`, wird er übersprungen.

---

## Verbindung zu Vergleichsoperatoren

Im Kapitel **Operatoren** hast du gelernt:
Vergleichsoperatoren (`===`, `>`, `<` …) geben immer einen **boolean** zurück - also `true` oder `false`.
Diese Operatoren können wir direkt in Bedingungen verwenden.

<CodeExample>
let note: number = 1;

if (note === 1) {
console.log("Sehr gut!");
} 
</CodeExample>

Der Ausdruck `note === 1` liefert `true`, wenn `note` gleich 1 ist.
Damit wird der Code im `if`-Block ausgeführt.

---

## if – else

Mit `else` legst du fest, was passiert, wenn die Bedingung *nicht* erfüllt ist.

<CodeExample>
let istVolljaehrig: boolean = false;

if (istVolljaehrig) {
console.log("Willkommen!");
} else {
console.log("Du bist noch zu jung!");
} 
</CodeExample>


## if – else if – else

Mehrere Fälle kannst du mit `else if` prüfen.

<CodeExample>
let note: number = 3;

if (note === 1) {
console.log("Sehr gut");
} else if (note === 2) {
console.log("Gut");
} else {
console.log("Verbesserung nötig");
} 
</CodeExample>


## Logische Operatoren

Mehrere Bedingungen lassen sich mit **logischen Operatoren** kombinieren:

| Operator | Bedeutung | Beispiel          | Ergebnis |
| -------- | --------- | ----------------- | -------- |
| `&&`     | und       | `true && false`   | `false`  |
| `|\|`   | oder      | `true \|\| false` | `true`   |
| `!`      | nicht     | `!true`           | `false`  |

<CodeExample>
let alter: number = 17;
let elternZustimmung: boolean = true;

if (alter >= 18 || elternZustimmung) {
console.log("Du darfst teilnehmen!");
} 
</CodeExample>

Hier ergibt `alter >= 18` zunächst einen **boolean**, der dann mit `elternZustimmung` kombiniert wird.
