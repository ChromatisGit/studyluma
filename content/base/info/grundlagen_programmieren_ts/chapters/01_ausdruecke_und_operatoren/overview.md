
Operatoren sind **Symbole**, mit denen wir Werte **verändern oder verknüpfen** können.

```ts
let x: number = 2;
x = x + 5;
console.log(x); // Ausgabe: 7
```

Hier wird die Zahl `5` zu `x` addiert und das Ergebnis wieder in `x` gespeichert.
→ `x = x + 5` bedeutet also: „Erhöhe den alten Wert von `x` um 5“.

### Arithmetische Operatoren

Wir haben in TypeScript die Grundrechenarten aus der Mathematik:

| Operator | Bedeutung      | Beispiel | Ergebnis |
| -------- | -------------- | -------- | -------- |
| `+`      | Addition       | `5 + 3`  | `8`      |
| `-`      | Subtraktion    | `5 - 3`  | `2`      |
| `*`      | Multiplikation | `5 * 3`  | `15`     |
| `/`      | Division       | `6 / 3`  | `2`      |

#### Operator + mit Text (Strings)

Mit dem `+`-Operator können wir nicht nur Zahlen, sondern auch **Texte (Strings)** verbinden.

```ts
let nachricht: string = "Hallo ";
nachricht = nachricht + "Welt!";
console.log(nachricht); // Ausgabe: Hallo Welt!
```

> Merke:
> Wenn mindestens einer der beiden Werte ein String ist, **verbindet `+` die Texte** anstatt sie zu addieren.

#### Kurzschreibweise

Alle arithmetische Operatoren können auch in Kurzschreibweise geschrieben werden

```ts
x -= 5; // Das Gleiche wie: x = x - 5
```


### Vergleichsoperatoren

Vergleichsoperatoren prüfen, **wie  das Verhältnis von zwei Werte zueinander ist.** Zum Beispiel, ob sie gleich, ungleich, größer oder kleiner sind.
Das Ergebnis eines Vergleichs ist **immer** ein Wahrheitswert (`true` oder `false`).

#### Beispiele

| Operator | Bedeutung                                       | Beispiel  | Ergebnis |
| -------- | ----------------------------------------------- | --------- | -------- |
| `===`    | gleich (gleicher Wert **und** Datentyp)         | `5 === 5` | `true`   |
| `!==`    | ungleich (Wert **oder** Datentyp unterscheiden sich) | `5 !== 3` | `true`   |
| `>`      | größer als                                      | `5 > 3`   | `true`   |
| `<`      | kleiner als                                     | `2 < 5`   | `true`   |
| `>=`     | größer oder gleich                              | `5 >= 5`  | `true`   |
| `<=`     | kleiner oder gleich                             | `3 <= 5`  | `true`   |


#### Beispiel im Code

```ts
let a: number = 10;
let b: number = 5;

console.log(a > b);   // true
console.log(a === b); // false
```
#### Warum `===` statt `==`?

In TypeScript gibt es auch `==`, aber das wandelt Werte **automatisch** in einen gemeinsamen Typ um.
Das kann zu **unerwarteten Ergebnissen** führen:

```ts
console.log("5" == 5);  // true
console.log("5" === 5); // false
```

> Merke:
> In TypeScript verwenden wir **immer `===` und `!==`**,
> damit wir sicher sein können, dass **Wert und Typ** wirklich übereinstimmen.

---

#### **Typischer Fehler**

```ts
let zahl = 5;

if (zahl = 10) {
  console.log("Zahl ist 10");
}
```

Hier wurde **=** (Zuweisung) statt **===** (Vergleich) verwendet.
Dadurch wird `zahl` den Wert `10` bekommen, und die Bedingung ist **immer true**!

> **Tipp:**
> Verwende bei Vergleichen **immer `===`** und **niemals nur ein Gleichzeichen.**