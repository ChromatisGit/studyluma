
Operatoren sind **Symbole**, mit denen wir Werte **verändern oder verknüpfen** können.

<CodeExample>
let x: number = 2;
x = x + 5;
console.log(x);
</CodeExample>

Hier wird die Zahl `5` zu `x` addiert und das Ergebnis wieder in `x` gespeichert.

→ `x = x + 5` bedeutet also: "Erhöhe den alten Wert von `x` um 5".

## Arithmetische Operatoren

Wir haben in TypeScript die Grundrechenarten aus der Mathematik:

| Operator | Bedeutung      | Beispiel | Ergebnis |
| -------- | -------------- | -------- | -------- |
| `+`      | Addition       | `5 + 2`  | `7`      |
| `-`      | Subtraktion    | `5 - 2`  | `3`      |
| `*`      | Multiplikation | `5 * 2`  | `10`     |
| `/`      | Division       | `5 / 2`  | `2.5`    |
| `%`      | Modulo (Rest bei Division)| `5 % 2`  | `1`    |

### Operator + mit string

Mit dem `+`-Operator können wir nicht nur Zahlen, sondern auch Texte (Strings) verbinden.

<CodeExample>
let nachricht: string = "Hallo ";
nachricht = nachricht + "Welt!";
console.log(nachricht);
</CodeExample>

> **Merke:** Wenn mindestens einer der beiden Werte ein String ist, verbindet `+` die Texte anstatt sie zu addieren.

### Kurzschreibweise

Alle arithmetische Operatoren können auch in Kurzschreibweise geschrieben werden

<CodeExample>
// Das Gleiche wie: x = x - 5;
x -= 5;
</CodeExample>


## Vergleichsoperatoren

Vergleichsoperatoren prüfen, wie das Verhältnis von zwei Werte zueinander ist.
Das Ergebnis eines Vergleichs ist immer ein Wahrheitswert (`true` oder `false`).

### Übersicht

| Operator | Bedeutung                                       | Beispiel  | Ergebnis |
| -------- | ----------------------------------------------- | --------- | -------- |
| `===`    | gleich (gleicher Wert **und** Datentyp)         | `5 === 5` | `true`   |
| `!==`    | ungleich (Wert **oder** Datentyp unterscheiden sich) | `5 !== 3` | `true`   |
| `>`      | größer als                                      | `5 > 3`   | `true`   |
| `<`      | kleiner als                                     | `2 < 5`   | `true`   |
| `>=`     | größer oder gleich                              | `5 >= 5`  | `true`   |
| `<=`     | kleiner oder gleich                             | `3 <= 5`  | `true`   |


### Beispiel im Code

```ts
let a: number = 10;
let b: number = 5;

console.log(a > b);   // true
console.log(a === b); // false
```

### Warum `===` statt `==`?

In TypeScript gibt es auch `==`, aber das wandelt Werte **automatisch** in einen gemeinsamen Typ um.
Das kann zu **unerwarteten Ergebnissen** führen:

```ts
console.log("5" == 5);  // true
console.log("5" === 5); // false
```

> **Merke:** In TypeScript verwenden wir **immer `===` und `!==`**, damit wir sicher sein können, dass Wert und Typ verglichen werden.
