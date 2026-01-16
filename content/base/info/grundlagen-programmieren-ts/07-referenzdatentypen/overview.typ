#import "/src/typst-style/overview-style.typ": *
#show: overview-style

#title[Referenzdatentypen]

Wir haben gelernt, dass wir bei *Arrays* und *Objekten* den Inhalt verändern können, auch wenn sie mit `const` deklariert wurden. Der Grund dafür ist: Sie gehören zu den *Referenzdatentypen*.

Bei Referenzdatentypen speichert eine Variable *nicht den Wert selbst*, sondern nur eine *Referenz*, also einen *Verweis auf den Speicherort*.

#image(source: "referenzdatentyp.png")

`number`, `string` und `boolean` gehören zu den *Wertdatentypen*. Bei ihnen speichert die Variable *den Wert direkt*.

#image(source: "wertdatentyp.png")

= Referenzdatentypen speichern Referenzen

== Umgang mit `const`

`const` schützt nur die Referenz, nicht den Inhalt, auf den sie zeigt.

#codeRunner[
  ```ts
  const zahlen: number[] = [1, 2];
  zahlen.push(3);
  // Wert wird verändert => erlaubt
  ```
]

#codeRunner[
  ```ts
  const zahlen: number[] = [1, 2];
  zahlen = [1, 2, 3];
  // Referenz wird verändert => const verbietet das
  ```
]

== Zuweisen von Variablen

Wenn wir eine Variable mit einem *Wertdatentyp* zuweisen, wird der Wert kopiert. Die neue Variable ist *unabhängig* vom Original.

#codeRunner[
  ```ts
  let name: string = "Lara";
  let neuerName: string = name;

  neuerName = "Tom";

  console.log(name); // Lara
  console.log(neuerName); // Tom
  ```
]

`neuerName` ist eine *Kopie* des Wertes `name`.
Wenn wir `neuerName` ändern, bleibt `name` unverändert.

Bei *Referenzdatentypen* wird nicht der Inhalt kopiert, sondern die Referenz übernommen.

#codeRunner[
  ```ts
  const namen = ["Lara", "Tom"];
  const neueNamen = namen;

  neueNamen.push("Alex");

  console.log(namen);
  ```
]

Beide Variablen zeigen auf *denselben Speicherort*.
Wenn wir also `neueNamen` verändern, ändert sich auch `namen`.

== In Funktionen

Beim Funktionsaufruf wird wie bei der Zuweisung ein *Wert übergeben*:
- bei Wertdatentypen: *der Wert selbst*
- bei Referenzdatentypen: *die Referenz auf den Speicherort*

Das bedeutet:
Wenn eine Funktion ein *Array* oder *Objekt* verändert,
verändert sie *den Inhalt des Originals*.

#codeRunner[
  ```ts
  function fuegeNamenHinzu(liste: string[]) {
    liste.push("Alex");
  }

  const namen = ["Lara", "Tom"];
  fuegeNamenHinzu(namen);

  console.log(namen); // ["Lara", "Tom", "Alex"]
  ```
]

= Kopie erstellen

Wenn das Original *nicht verändert* werden soll, musst du ein *neues Array* oder *neues Objekt* erstellen.

#codeRunner[
  ```ts
  function fuegeNamenHinzu(liste: string[]) {
    const neueListe = [...liste];
    neueListe.push("Alex");
    return neueListe;
  }

  const namen = ["Lara", "Tom"];
  const neueNamen = fuegeNamenHinzu(namen);

  console.log(namen);
  console.log(neueNamen);
  ```
]


#note[
  `[...arrayName]` und `{...objektName}` kopieren nur das Äußere.

  Enthält ein Array oder Objekt weitere Arrays oder Objekte, werden die Referenzen übernommen. Sie werden **nicht neu erstellt**!
]

