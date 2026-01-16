# StudyNode

Digitale Unterrichtsplattform

---

## Installationsanleitung

- Installiere [https://bun.com/](Bun) in der Powershell

- Klone das Repository mit VS-Code und öffne das Projekt

- Führe über das Terminal in VS-Code `bun install` aus

- Um das Projekt lokal zu starten, schreibe ins Terminal `bun dev`

- Der Webserver kann im Terminal gestoppt werden mit der Tastenkombination `Strg + C`



---

## Inhalte erstellen

`base` enthält die grundlegenden Inhalte für ein Fach.

`courses` beschreibt die konkreten Inhalte, die aus Basis verwendet werden sollen und in welcher Reihenfolge. Dabei kann konfiguriert werden, welche konkreten Kapitel angezeigt werden und auch in welcher Reihenfolge diese angezeigt werden.

### Ordnerstruktur

```

content/
├─ groups-and-subjects.yml           # Definiert Fächer, Kursarten und Varianten
│
├─ base/                             # Basisinhalte (kursunabhängig, wiederverwendbar)
│  ├─ <subject>/                     # z. B. math, info
│  │  └─ <topic>/                    # z. B. vektorgeometrie, trigonometrie
│  │     ├─ chapters/
│  │     │  └─ <chapter>/            # z. B. 00-geraden, 01-geraden-lagebeziehung
│  │     │     ├─ slides/            # Folien (Marp)
│  │     │     ├─ worksheets/        # Arbeitsblätter
│  │     │     └─ overview.typ       # Zusammenfassung der Inhalte des Kapitels
│  │     │
│  │     ├─ images/                  # Abbildungen für Webseite & Materialien
│  │     └─ chapters.typ             # Titel und Stoffverteilungsplan des Themenblocks
│  │
│  └─ slides/                        # Fachübergreifende Präsentationen
│
├─ courses/                          # Konkrete Kurse (sichtbar für Schüler)
│  └─ <groupID>/                     # z. B. tg1-math-lk, bk1-info
│     ├─ course.yml                  # Kurs- und Themenkonfiguration
│     ├─ course-variations.yml       # Anpassungen gegenüber Base (z. B. alternative Arbeitsblätter)
│     └─ files/                      # Kursbezogene Zusatzdateien
│
└─ templates/                        # Vorlagen zum Kopieren
   ├─ base-topic/                    # Grundgerüst für Topic + Chapter
   └─ course-plans/                  # course-plan.yml-Vorlagen für Kursvarianten

```

---

## Begriffe

| Begriff | Bedeutung |
|----------|------------|
| **Kapitel (chapter)** | Didaktisch abgeschlossene Einheit mit 1–6 Unterrichtsstunden. |
| **Themenblock (topic)** | Übergeordnete thematische Einheit, meist entsprechend einer Bildungsplaneinheit und enthält ein oder mehrere Kapitel. |
| **Roadmap** | Fortschrittsübersicht über alle Themenblöcke und Kapitel eines Kurses. Zeigt aktuelle, abgeschlossene und kommende Themen. Wird über die Datei `course-plan.yml` pro Kurs gesteuert. |
| **Arbeitsblatt (worksheet)** | In `Typst` verfasste Übungsaufgaben. Arbeitsblätter werden abhängig vom Kurs automatisiert in PDF-Dateien oder interaktive Web-Seiten umgewandelt. |
| **Checkpoint** | Verständnisfragen mit sofortiger Rückmeldung (Check for Understanding). Dient der Selbstkontrolle und Lernstandserhebung. |
| **Aufgaben** | Pflichtaufgaben, die alle Schüler während des Unterrichts bearbeiten. Sie bildet das erwartete Mindestlernziel ab. |
| **Challenge** | Vertiefungs- oder Transferaufgabe für schnelle oder leistungsstarke Schüler. Fördert Anwendung und Transfer. |

© 2025 Christian Holst


## Typst-Dateien im Detail

### `chapters.typ`

Enthält:

* Titel des Themenblocks
* Lernziele der einzelnen Kapitel


### `overview.typ` (Kapitelübersicht)

Beinhaltet:

* Theoretische Erklärung
* Beispiele

### `worksheet.typ` (Arbeitsblatt)

Beinhaltet:

* Checkpoint
* Aufgaben
* Challenges

Wird automatisch zur Web- oder PDF-Version gebaut.

---

## YAML-Dateien

### `course.yaml`


### `definitions.yml`
