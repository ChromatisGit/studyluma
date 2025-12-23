Wir haben gelernt, dass wir bei **Arrays** und **Objekten** den Inhalt verändern können, auch wenn sie mit `const` deklariert wurden. Der Grund dafür ist: Sie gehören zu den **Referenzdatentypen**. 

Bei Referenzdatentypen speichert eine Variable **nicht den Wert selbst**, sondern nur eine **Referenz**, also einen **Verweis auf den Speicherort**.

<Abbildung Referenzdatentyp/>

`number`, `string` und `boolean` gehören zu den **Wertdatentypen**. Bei ihnen speichert die Variable **den Wert direkt**.

<Abbildung Wertdatentyp/>

## Referenzdatentypen speichern Referenzen

### Bei `const`

`const` schützt nur die Referenz, nicht den Inhalt, auf den sie zeigt.

<CodeExample>
const zahlen: number[] = [1, 2];
zahlen.push(3);
// Wert wird verändert => erlaubt
</CodeExample>

<CodeExample>
const zahlen: number[] = [1, 2];
zahlen = [1, 2, 3];
// Referenz wird verändert => const verbietet das
</CodeExample>

### Zuweisen von Variablen

Wenn wir eine Variable mit einem **Wertdatentyp** zuweisen, wird der Wert kopiert. Die neue Variable ist **unabhängig** vom Original.

<CodeExample>
let name: string = "Lara";
let neuerName: string = name;

neuerName = "Tom";

console.log(name); // Lara
console.log(neuerName); // Tom
</CodeExample>

`neuerName` ist eine **Kopie** des Wertes `name`.
Wenn wir `neuerName` ändern, bleibt `name` unverändert.

Bei **Referenzdatentypen** wird nicht der Inhalt kopiert, sondern die Referenz übernommen.

<CodeExample>
const namen = ["Lara", "Tom"];
const neueNamen = namen;

neueNamen.push("Alex");

console.log(namen);
</CodeExample>

Beide Variablen zeigen auf **denselben Speicherort**.
Wenn wir also `neueNamen` verändern, ändert sich auch `namen`.

### In Funktionen

Beim Funktionsaufruf wird wie bei der Zuweisung ein **Wert übergeben**:
- bei Wertdatentypen: **der Wert selbst**
- bei Referenzdatentypen: **die Referenz auf den Speicherort**

Das bedeutet:
Wenn eine Funktion ein **Array** oder **Objekt** verändert,
verändert sie **den Inhalt des Originals**.

<CodeExample>
function fuegeNamenHinzu(liste: string[]) {
  liste.push("Alex");
}

const namen = ["Lara", "Tom"];
fuegeNamenHinzu(namen);

console.log(namen); // ["Lara", "Tom", "Alex"]
</CodeExample>

## Kopie erstellen

Wenn das Original **nicht verändert** werden soll, musst du ein **neues Array** oder **neues Objekt** erstellen.

<CodeExample>
function fuegeNamenHinzu(liste: string[]) {
  const neueListe = [...liste];
  neueListe.push("Alex");
  return neueListe;
}

const namen = ["Lara", "Tom"];
const neueNamen = fuegeNamenHinzu(namen);

console.log(namen);
console.log(neueNamen);
</CodeExample>

> **Merke:** Bei Referenzdatentypen zeigt die Variable auf einen **Ort im Speicher**.
> Wenn du das Original nicht verändern willst, erstelle es neu (`[...array]` oder `{...objekt}`).

> Hinweis: `[...array]` und `{...objekt}` erstellen eine flache Kopie. Enthält ein Objekt weitere Objekte oder Arrays, bleiben diese Referenzen erhalten.


