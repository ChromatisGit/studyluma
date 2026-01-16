#import "/src/typst-style/overview-style.typ": *
#show: overview-style

#title[Arrays]

Mit *Arrays* können wir *mehrere Werte* in *einer Variablen* speichern.
Sie sind eine geordnete Liste von Elementen z. B. mehrere Zahlen oder Texte.

= Array anlegen

Ein Array wird mit eckigen Klammern `[]` erstellt.

#codeRunner[
  ```ts
  const namen: string[] = ["Lara", "Tom", "Alex"];
  const zahlen: number[] = [3, 7, 12];
  ```
]

#highlight[
  Hinter dem Typ steht `[]`, um anzuzeigen, dass es *mehrere Werte* dieses Typs sind.
]

= Auf einzelne Werte zugreifen

Jedes Element im Array hat eine *Position* (Index), beginnend bei `0`.

#codeRunner[
  ```ts
  const namen: string[] = ["Lara", "Tom", "Alex"];

  console.log(namen[0]);
  console.log(namen[2]);
  ```
]

Die Anzahl der Elemente im Array erhalten wir mit `.length`:

#codeRunner[
  ```ts
  const namen: string[] = ["Lara", "Tom", "Alex"];
  console.log(namen.length); // 3
  ```
]

= Werte verändern

Wir können Elemente über ihren Index *verändern*.

#codeRunner[
  ```ts
  const zahlen: number[] = [2, 4, 5];
  zahlen[2] = 6; // ersetzt das dritte Element
  console.log(zahlen);
  ```
]

#highlight[
  Die Werte können trotz `const` verändert werden, weil wir das *gleiche Array* weiterverwenden und nur seine *Inhalte* ändern.
]

Der folgende Code funktioniert nicht, weil hier ein *neues Array* erstellt wird:

#codeRunner[
  ```ts
  const zahlen: number[] = [2, 4, 5];
  zahlen = [2, 4, 6];
  ```
]

= Werte hinzufügen

Arrays besitzen viele eingebaute Funktionen (*Methoden*), mit denen wir sie bearbeiten können.
Mit `.push()` können wir einen Wert ans Ende des Arrays hinzufügen.

#codeRunner[
  ```ts
  const tiere: string[] = ["Hund", "Katze"];
  tiere.push("Vogel");
  console.log(tiere);
  ```
]

= Array durchlaufen

Mit `for...of` gehen wir direkt durch *alle Werte* im Array.

#codeRunner[
  ```ts
  const namen: string[] = ["Lara", "Tom", "Alex"];

  for (const name of namen) {
    console.log("Hallo, " + name + "!");
  }
  ```
]

#note[
  Es gibt auch `for...in`, womit man die *Positionen* (Indizes) durchlaufen kann. In der Praxis wird aber meist `for...of` verwendet.
]
