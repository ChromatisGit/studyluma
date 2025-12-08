## Variablen

Mit Variablen können wir Werte speichern.

### Variable deklarieren:

```ts
let meineVariable: string;
```

Mit `let` sagen wir dem Programm: Reserviere Speicherplatz für `meineVariable`.

### Variable Wert zuweisen:

Hier sagen wir dem Programm, welchen Wert `meineVariable` haben soll:

```ts
meineVariable = "Hii";
```

Wir können auch in einer Zeile eine Variable initialisieren und einen Wert zuweisen:

```ts
let meineZweiteVariable: string = "Heyy";
```

### Wert ausgeben

Wenn wir sehen wollen, welcher Wert eine Variable hat, geben wir den Wert mit `console.log()` aus.

<CodeExample>
let nachricht: string = "Hallo!";

console.log(nachricht);
</CodeExample>

## Datentypen

Jede Variable besitzt einen Datentyp, der beschreibt, was für eine Art Wert gespeichert wird.

### Primitive Datentypen

Die wichtigsten primitiven Datentypen in TypeScript sind:

| Datentyp | Beispielwert     | Bedeutung                      |
|-----------|------------------|--------------------------------|
| string    | `"Hallo"`        | Text                           |
| number    | `12`, `2.4`      | Zahlen (Ganze oder Kommazahlen) |
| boolean   | `true`, `false`  | Wahr oder Falsch               |

Außerdem gibt es noch `undefined`, wenn eine Variable zwar existiert, aber noch keinen Wert hat.

### undefined

TypeScript vergibt den Datentyp `undefined` automatisch, wenn eine Variable zwar deklariert, aber noch kein Wert zugewiesen wurde.

<CodeExample>
let eineVariable: number;

console.log(eineVariable);

eineVariable = 16;
</CodeExample>

Tipp
Versuche undefined zu vermeiden, indem du Variablen früh mit sinnvollen Startwerten belegst.

## Konstanten

Wenn der Wert sich nicht verändern soll, deklarieren wir die Variable mit `const` statt mit `let`.

<CodeExample>
const meineLieblingszahl: number = 64;

meineLieblingszahl = 67;
</CodeExample>

Wenn wir versuchen eine Konstante zu verändern, bekommen wir einen Fehler.

## Kommentare

Mit Kommentaren können wir Dinge schreiben, die das Programm ignoriert, aber andere Programmierer und dein zukünftiges Ich lesen können:

<CodeExample>
console.log("Hi");
// console.log("Hallo");
// Der Code in den Kommentaren wird nicht ausgeführt
</CodeExample>

Damit können wir kurze Erklärungen direkt in das Programm schreiben.
