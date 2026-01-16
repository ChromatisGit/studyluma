#import "/src/typst-style/overview-style.typ": *
#show: overview-style

#title[Objekte]

Mit *Objekten* können wir *mehrere zusammengehörige Werte* in *einer Variablen* speichern.
Ein Objekt beschreibt also eine Sache mit ihren Eigenschaften.

= Objekt anlegen

Ein Objekt wird mit geschweiften Klammern `{}` erstellt.
Jede Eigenschaft hat einen *Namen*, und einen *Wert*.
Wir geben außerdem den *Typ* der Eigenschaften an.

#codeRunner[
  ```ts
  const person: { name: string; alter: number; } = {
    name: "Lara",
    alter: 17
  }

  console.log(person);
  ```
]

Hier speichern wir mehrere Informationen über eine Person in einer einzigen Variablen.

= Auf Werte zugreifen

Auf einzelne Werte im Objekt greifen wir mit einem Punkt `.` zu:

#codeRunner[
  ```ts
  const person: { name: string; alter: number; } = {
    name: "Lara",
    alter: 17
  };

  console.log(person.name);
  ```
]

Oder mit eckigen Klammern `["..."]`:

#codeRunner[
  ```ts
  const person: { name: string; alter: number; } = {
    name: "Lara",
    alter: 17
  };

  console.log(person["name"]);
  ```
]


= Werte verändern

Wir können Eigenschaften auch *ändern oder neue hinzufügen*:

#codeRunner[
  ```ts
  const person: { name: string; alter: number; } = {
    name: "Lara",
    alter: 17
  };

  person.alter = 18;
  person.haustier = "Hund";
  console.log(person);
  ```
]

#highlight[
  Objekte fassen mehrere Werte zusammen, die *logisch zusammengehören* z. B. alle Informationen über eine Person, ein Auto oder ein Webseitenelement.
]