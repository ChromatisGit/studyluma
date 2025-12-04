# StudyNode

Digitale Unterrichtsplattform auf Basis von **Docusaurus**.

---

## Ordnerstruktur

### Content

```

content/
├─ groupsAndSubjects.yml             # Definiert Fächer, Kursarten und Varianten
│
├─ base/                             # Basisinhalte (kursunabhängig, wiederverwendbar)
│  ├─ <subject>/                     # z. B. math, info
│  │  └─ <topic>/                    # z. B. vektorgeometrie, trigonometrie
│  │     ├─ chapters/
│  │     │  └─ <chapter>/            # z. B. 00_geraden, 01_geraden_lagebeziehung
│  │     │     ├─ slides/            # Folien (Marp)
│  │     │     ├─ worksheets/        # Arbeitsblätter
│  │     │     ├─ preview.md         # Vorschauseite (vor/während der Behandlung)
│  │     │     └─ overview.md        # Übersichtsseite (nach Abschluss)
│  │     │
│  │     ├─ images/                  # Abbildungen für Webseite & Materialien
│  │     ├─ notes.md                 # Interne Notizen für die Lehrperson
│  │     ├─ preview.md               # Vorschauseite zum Themenblock
│  │     ├─ overview.md              # Übersichtsseite zum Themenblock
│  │     └─ topicPlan.yml            # Stoffverteilungsplan des Themenblocks (Lernziele & Kapitel)
│  │
│  └─ slides/                        # Übergreifende Präsentationen
│
├─ courses/                          # Konkrete Kurse (sichtbar für Schüler)
│  └─ <group>/                       # z. B. tg2, bk1
│     ├─ group_info.md               # Kursbezogene Informationen & Leitsätze
│     │
│     └─ <subject_variant>/          # z. B. math-lk, info-tgm
│        ├─ coursePlan.yml           # Themenübersicht & aktueller Fortschritt
│        ├─ courseVariations.yml     # Anpassungen gegenüber Base (z. B. alternative Arbeitsblätter)
│        └─ files/                   # Kursbezogene Zusatzdateien
│
└─ templates/                        # Vorlagen zum Kopieren
   ├─ baseTopic/                     # Grundgerüst für Topic + Chapter
   └─ coursePlans/                   # coursePlan.yml-Vorlagen für Kursvarianten

```

### Source (Quellcode)
```
src/
│
├─ builder/                          # Node-basierte Buildtools
│  └─ main.ts                        # Generiert .generated/*
│
├─ dev/                              # Entwicklungswerkzeuge
│  └─ export-schema.ts               # Erzeugt YAML-Schemas für IntelliSense in VSCode
│
├─ schema/                           # Zod-Schemas (Typdefinitionen)
│
├─ worksheet/                        # Generiert Arbeitsbögen in pdf oder Webformat
│
└─ marp-styling/                     # CSS-Themes für Marp-Präsentationen
```

### Weitere

```
website/                             # Docusaurus-Website
│
├─ src/                              # Darstellung & Interaktion mit der Webseite
└─ .generated/                       # Vom Builder generierte Webseite

```

.vscode/
│
├─ settings.json                     # YAML Schema-Zuweisungen
│
└─ .schemas/                         # Generierte JSON-Schemas (für IntelliSense)
---

## Begriffe

| Begriff | Bedeutung |
|----------|------------|
| **Kapitel (chapter)** | Didaktisch abgeschlossene Einheit mit 1–6 Unterrichtsstunden. |
| **Themenblock (topic)** | Übergeordnete thematische Einheit, meist entsprechend einer Bildungsplaneinheit. Umfasst mehrere Kapitel oder steht als Einzelthema ohne Unterkapitel. |
| **Roadmap** | Fortschrittsübersicht über alle Themenblöcke und Kapitel eines Kurses. Zeigt aktuelle, abgeschlossene und kommende Themen. Wird über die Datei `coursePlan.yml` pro Kurs gesteuert. |
| **Arbeitsblatt (worksheet)** | In `Typst` verfasste Übungsaufgaben. Arbeitsblätter werden abhängig vom Kurs automatisiert in PDF-Dateien oder interaktive Web-Seiten umgewandelt. |
| **Checkpoint** | Verständnisfragen mit sofortiger Rückmeldung (Check for Understanding). Dient der Selbstkontrolle und Lernstandserhebung. |
| **Aufgaben** | Pflichtaufgaben, die alle Schüler während der Stunde bearbeiten. Sie bildet das erwartete Mindestlernziel ab. |
| **Challenge** | Vertiefungs- oder Transferaufgabe für schnelle oder leistungsstarke Schüler. Fördert Anwendung und Transfer. |

---

## ToDo Liste

- Warnung wenn Lernelemente die bereits veröffentlicht sind bearbeitet werden (Willst du das nicht lieber in einem neuen Branch machen?)

© 2025 Christian Holst
