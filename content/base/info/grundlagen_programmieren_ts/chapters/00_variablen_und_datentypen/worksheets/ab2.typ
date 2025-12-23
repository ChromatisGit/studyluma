#import "/src/typst-style/worksheet-style.typ": *
#show: worksheet-style

#title[Übungen Variablen]

= Aufgaben

#group[
  Unten siehst du einen ein Ausschnitt eines Programms, das in mehrere kleine Abschnitte unterteilt wurde. Jeder Ausschnitt zeigt den nächsten Schritt des Programms. Markiere bei jedem Ausschnitt, was in diesen Zeilen passiert (mehrere Antworten können richtig sein).

  #mcq(wideLayout: true, shuffleSolutions: false)[
    ```ts
    const schulort: string = "Stuttgart";
    ```

    - [x] Deklariert die Variable `schulort`
    - [x] Weist der Variable `schulort` einen Wert zu
    - [ ] Gibt den Wert der Variable in der Konsolenausgabe aus
    - [ ] Der Code gibt eine Fehlermeldung
  ]

  #mcq(wideLayout: true, shuffleSolutions: false)[
    ```ts
    let wohnort: string;
    console.log(wohnort);
    ```

    - [x] Deklariert die Variable `wohnort`
    - [ ] Legt den Wert der Variable `wohnort` fest
    - [ ] Gibt den Wert der Variable in der Konsolenausgabe aus
    - [ ] Der Code gibt eine Fehlermeldung
  ]

  #mcq(wideLayout: true, shuffleSolutions: false)[
    ```ts
    let adresse: string;
    ```

    - [x] Deklariert die Variable `adresse`
    - [ ] Weist der Variable `adresse` einen Wert zu
    - [ ] Gibt den Wert der Variable in der Konsolenausgabe aus
    - [ ] Der Code gibt eine Fehlermeldung
  ]

  #mcq(wideLayout: true, shuffleSolutions: false)[
    ```ts
    adresse = "Hauptstraße 17";
    console.log(adresse);
    ```

    - [ ] Deklariert die Variable `adresse`
    - [x] Legt den Wert der Variable `adresse` fest
    - [x] Gibt den Wert der Variable in der Konsolenausgabe aus
    - [ ] Der Code gibt eine Fehlermeldung
  ]

  #mcq(wideLayout: true, shuffleSolutions: false)[
    ```ts
    const hausnummer: number = "17a";
    ```

    - [ ] Deklariert die Variable `hausnummer`
    - [ ] Legt den Wert der Variable `hausnummer` fest
    - [ ] Gibt den Wert der Variable in der Konsolenausgabe aus
    - [x] Der Code gibt eine Fehlermeldung
  ]
]

#group[
  In den untenstehenden Code haben sich Fehler eingeschlichen.
  Korrigiere die Fehler!

  #codeTask[
    Die Schul-App soll speichern, ob das Schülerkonto aktiviert ist.

    #starter[
      ```ts
      istAktiv = true;
      console.log(istAktiv);
      ```
    ]

    #hint[
      Deklariere zuerst die Variable mit einem passenden Datentyp. Danach kannst du den Wert zuweisen.
    ]

    #solution[
      ```ts
      let istAktiv: boolean = true;
      console.log(istAktiv);
      ```
    ]

    #validation[
      ```ts
      istAktiv === true
      ```
    ]
  ]

  #codeTask[
    In der Schul-App soll eine feste maximale Anzahl von Kursen gespeichert werden. `maxKurse` soll eine Konstante sein.

    #starter[
      ```ts
      const maxKurse: number;
      maxKurse = 15;
      console.log(maxKurse);
      ```
    ]

    #hint[
      Bei `const` musst du den Wert direkt bei der Deklaration festlegen.
    ]

    #solution[
      ```ts
      const maxKurse: number = 15;
      console.log(maxKurse);
      ```
    ]

    #validation[
      ```ts
      maxKurse === 15
      ```
    ]
  ]
]

= Challenge

#textTask[
  In der Schul-App für Schüler sind einige Variablen mit unpassenden Datentypen deklariert.
  Erkläre für jeder Zeile kurz, welcher besser geeignet wäre oder warum der Datentyp korrekt ist.

    ```ts
    let unterrichtsstundenHeute: string = 6;
    let hatParkplatzGebucht: string = "true";
    let appFarbe: number = "Blau";
    const appVersion: number = 1.0;
    ```

  #hint[
    Achte darauf, ob der Datentyp zum Wert passt. Werte in Anführungszeichen sind immer Text (string).
  ]

  #solution[
    unterrichtsstundenHeute falsch
    Varriable ist eine Zahl -> besser: number

    hatParkplatzGebucht: string falsch
    Wahr/Falsch-Angabe -> boolean

    appFarbe: number falsch
    Farbe ist Text -> string

    appVersion: number richtig
    Versionsnummer als Zahl, const sinnvoll da fest
  ]

]

#codeTask[
  Überlege bei den folgenden Variablen, ob es sinvoller ist, sie mit `const` oder mit `let` zu deklarieren.
  Füge Kommentare hinzu, um deine Entscheidung zu begründen.

  #starter[
    ```ts
    schulName: string = "Willhelm-Maybach-Schule";

    aktuelleWoche: number = 48;

    istPause: boolean = false;

    maxFehltage: number = 20;
    ```
  ]

  #hint[
    Werte, die sich im Programmverlauf nie ändern sollen -> const
    Werte, die sich ändern können -> let
  ]

  #solution[
    ```ts
    const schulName: string = "Willhelm-Maybach-Schule";
    // Schulname bleibt immer gleich -> const

    let aktuelleWoche: number = 48;
    // Ändert sich jede Woche -> let besser

    let istPause: boolean = false;
    // Ändert sich mehrmals pro Tag -> let

    const maxFehltage: number = 20;
    // Fixer Wert, bleibt gleich -> const
    ```
  ]
]

#codeTask[
  Die Schul-App soll Informationen über eine Klasse speichern. Lege sinnvolle Variablen mit passenden Datentypen an.

Verwende dabei mindestens:
- eine Text-Variable (string)
- eine Zahlen-Variable (number)
- eine Wahr/Falsch-Variable (boolean)

Gib anschließend alle Werte in der Konsole aus.

  #starter[
    ```ts
    // Ergänze sinnvolle Profil-Informationen
    ```
  ]

  #hint[
    Überlege, welche Daten in einer echten Schul-App vorkommen könnten. Wähle zu jedem Wert den passenden Datentyp.
  ]

  #solution[
    ```ts
    // Name des Klassenlehrers
    let lehrkraft: string = "Herr Holst";

    // Anzahl der Schüler in der Klasse
    let anzahlSchueler: number = 20;

    // Ob die Klasse ihre Tablets erhalten hat
    let hatTablet: boolean = true;

    console.log(lehrkraft);
    console.log(anzahlSchueler);
    console.log(hatTablet);
    ```
  ]
]