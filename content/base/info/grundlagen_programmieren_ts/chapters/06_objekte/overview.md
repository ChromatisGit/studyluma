
Mit **Objekten** können wir **mehrere zusammengehörige Werte** in **einer Variablen** speichern.
Ein Objekt beschreibt also eine Sache mit ihren Eigenschaften.

### Objekt anlegen

Ein Objekt wird mit geschweiften Klammern `{}` erstellt.
Jede Eigenschaft hat einen **Namen**, und einen **Wert**.
Wir geben außerdem den **Typ** der Eigenschaften an.

<CodeExample>
const person: { name: string; alter: number; } = {
  name: "Lara",
  alter: 17
};

console.log(person);
</CodeExample>

Hier speichern wir mehrere Informationen über eine Person in einer einzigen Variablen.

### Auf Werte zugreifen

Auf einzelne Werte im Objekt greifen wir mit einem Punkt `.` zu:

<CodeExample>
const person: { name: string; alter: number; } = {
  name: "Lara",
  alter: 17
};

console.log(person.name);
</CodeExample>

Oder mit eckigen Klammern `["..."]`:

<CodeExample>
const person: { name: string; alter: number; } = {
  name: "Lara",
  alter: 17
};

console.log(person["name"]);
</CodeExample>

### Werte verändern

Wir können Eigenschaften auch **ändern oder neue hinzufügen**:

<CodeExample>
const person: { name: string; alter: number; } = {
  name: "Lara",
  alter: 17
};

person.alter = 18;
person.haustier = "Hund";
console.log(person);
</CodeExample>

> **Merke:** Objekte fassen mehrere Werte zusammen, die **logisch zusammengehören** z. B. alle Informationen über eine Person, ein Auto oder ein Webseitenelement.
