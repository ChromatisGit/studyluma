#import "/src/typst-style/overview-style.typ": *
#show: overview-style

#title[Funktionen]

Funktionen sind kleine Programme *im Programm*.

Sie fassen wiederkehrende Aufgaben zusammen und können *Parameter* verarbeiten und *Rückgabewerte* liefern.

= Funktion definieren und ausführen

Mit dem Schlüsselwort `function` definieren wir eine Funktion:

```ts
function sagHallo() {
  console.log("Hallo!");
}
```

Hier passiert noch nichts, die Funktion ist *nur definiert*.

Um sie auszuführen, müssen wir sie *aufrufen*:

```ts
sagHallo();
```

#codeRunner[
  ```ts
  function sagHallo() {
    console.log("Hallo!");
  }

  sagHallo();
  ```
]

= Funktionen mit Parametern

Parameter sind Werte, die wir der Funktion mitgeben. Die können wir als Variablen innerhalb der Funktion verwenden.

#codeRunner[
  ```ts
  function begruesse(name: string) {
    console.log("Hallo, " + name + "!");
  }

  begruesse("Lea");
  begruesse("Tom");
  ```
]

Hier bekommt `begruesse` jedes Mal einen anderen Namen übergeben.

= Rückgabewerte

Auch wie bei `if`-Bedingungen oder `for`-Schleifen existieren die Variablen auch nur innerhalb ihres Blocks. Wenn wir einen Wert außerhalb der Funktion weiterverwenden möchten, können wir ihn mit `return` *zurückgeben*.

#codeRunner[
  ```ts
  function addiere(a: number, b: number): number {
    return a + b;
  }

  let ergebnis: number = addiere(3, 5);
  console.log(ergebnis);
  ```
]

#highlight[
  Der Typ hinter dem Doppelpunkt (`: number`) gibt an, welchen Datentyp die Funktion zurückgibt.
]

= Funktionen in Funktionen

Wir können Funktionen auch *ineinander verwenden*.

#codeRunner[
  ```ts
  function begruesse(name: string) {
    console.log("Hallo, " + name + "!");
  }

  function begruesseMehrmals(person: string, anzahl: number) {
    for (let i = 0; i < anzahl; i++) {
      begruesse(person);
    }
  }

  begruesseMehrmals("Lara", 3);
  ```
]

Wir können die Parameter unterschiedlich nennen, weil jede Funktion ihre eigenen Namen verwendet. Der Wert von `person` wird beim Aufruf einfach an `name` übergeben.
