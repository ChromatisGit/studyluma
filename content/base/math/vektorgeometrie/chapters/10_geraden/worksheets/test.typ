#import "worksheet-style.typ": *
#show: worksheetStyle

#title[Arbeitsblatt 1]

= Info

Ein Info-Chapter, das sogar ein Codebeispiel enthält:

```ts
let a = 1
```

= Checkpoint

#group[
  Zum Beispiel mit Multiple Choice Fragen:

  #mcq[
    Macht dieser Code etwas?
    ```ts
    console.log("test")
    ```

    - [x] Ja
    - [x] Definitiv
    - [ ] Nein
  ]

  #mcq[
    Müssen mehrere Antworten richtig sein?
    - [x] Nein
    - [ ] Doch
    - [ ] Ohh!
  ]
]

#group[
  `#mcq(single: true)` bedeutet: *Immer nur eine Antwort ist korrekt.*
  #mcq(single: true)[
    Eine Quizfrage
    - [x] richtig
    - [ ] falsch
    - [ ] auch falsch
  ]
  #mcq(single: true)[
    Zweite Quizfrage
    - [x] richtig
    - [ ] falsch
    - [ ] ganz falsch
  ]
]

= Aufgaben
#group[
  #gap(empty: true)[
    Der `#gap`-Command erzeugt *Lückentexte*, bei denen Schüler Wörter einsetzen.

    Ich kann eine {{Lücke}} platzieren. Hier ist eine Lücke mit mehreren richtigen {{Lösungen|Antworten}}!

    Funktioniert auch in Code:
    ```ts
    let counter: {{number}};

    counter {{=}} 1;
    ```
  ]

  #gap[
    Ich kann auch einen Lückentext mit Dropdown für die Antworten haben.
    Nur die erste {{Antwort|Frage|Bild}} ist richtig.
  ]
]

= Challenge

#textTask[
  Eine offene Textaufgabe.
  #hint[
    Gib einen hilfreichen Hinweis.
  ]
  #solution[
    Eine beispielhafte Antwort.
  ]
]

#mathTask[
  Eine Matheaufgabe.
  #hint[
    Rechne!
  ]
  #solution[
    Ergebnis
  ]

]

#info("Info-Box")[
  Eine Info-Box in der Category, weil diese Erklärung für die nächste Aufgabe interessant sein könnte.
]

#codeTask[
  Eine Codingaufgabe:

  Setze `counter` auf 2.

  #starter[
    ```ts
    let counter: number
    ```
  ]
  #hint[
    Welches Symbol setzt einen Wert?
  ]
  #solution[
    ```ts
    let counter: number = 2;
    ```
  ]
  #validation[
    ```ts
    counter === 2
    ```
  ]
]

#mcq(single: true)[
  Eine Frage kann auch eine eigene Aufgabe sein und nicht nur ein Subtask
  - [x] richtig
  - [ ] falsch
  - [ ] auch falsch
]
