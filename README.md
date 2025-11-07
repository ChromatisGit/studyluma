# StudySpace

Digitale Unterrichtsplattform für Mathematik und Informatik auf Basis von **Docusaurus**.

---

## Ordnerstruktur



### Content

```

content/
│
├─ base/                             # Allgemeine Unterrichtsinhalte (kursunabhängig)
│  ├─ math/                          # Mathematik
│  │  └─ <topic>/                    # z. B. vektorgeometrie, trigonometrie
│  │     ├─ chapters/
│  │     │  └─ <chapter>/            # z. B. 00_geraden, 01_geraden_lagebeziehung
│  │     │     ├─ slides/            # Foliensätze-Vorlagen
│  │     │     ├─ worksheets/        # Arbeitsbögen-Vorlagen
│  │     │     ├─ current.md         # Website während Bearbeitung
│  │     │     └─ summary.md         # Website nach Abschluss
│  │     │
│  │     ├─ resources/               # Wiederverwendbare Aufgaben, Texte, Checkpoints
│  │     ├─ images/                  # Abbildungen für Webseite und Arbeitsbögen
│  │     ├─ notes.md                 # Interne Notizen
│  │     └─ plan.yml                 # Lernziele + Kapitelreihenfolge (Systemdatei)
│  │
│  ├─ info/                          # Informatik (gleicher Aufbau wie Mathematik)
│  │
│  └─ slides/                        # Überfachliche Foliensätze
│
├─ courses/                          # Konkrete Kurse (sichtbar für Schüler)
│  └─ <group>/                       # z. B. tg2, bk1
│     ├─ group-info.md               # Leitsätze & Informationen für gesamte Gruppe
│     │
│     └─ <subject_variant>/          # z. B. math-lk, info-tm
│        ├─ course-plan.yml          # Themenliste + aktiver Fortschritt
│        │
│        └─ <topic>/                 # Kurs-spezifische Themen
│           └─ chapters/
│              └─ <chapter>/         # z.B. 10_geraden, 11_geraden_lagebeziehung
│                 ├─ slides/         # Generierte Kursfolien
│                 ├─ worksheets/     # Generierte Arbeitsbögen + Lösungen
│                 ├─ current.md      # (optional) überschreibt base/current.md
│                 └─ summary.md      # (optional) überschreibt base/summary.md
│
└─ templates/                        # Vorlagen zum Kopieren
   ├─ base_topic/                    # Topic + Chapter Skelett
   └─ course-plans/                  # course-plan.yml Vorlagen für Kursvarianten

```

### Src
```
src/
│
├─ builder/                          # Node-Buildtools
│  │  ├─ build-site-config.ts        # erzeugt .generated/*
│  │  ├─ io.ts                       # YAML lesen, Configs schreiben
│  │  ├─ transforms.ts               # reine Daten-Transformationen
│  │  └─ logger.ts                   # Logging
│  
│
├─ schemas/                          # Zod-Schemas (Quellcode)
│  └─ course-plan.ts              # Schema + Types für course-plan.yml
│  
│
└─ marp-styling/                     # CSS/Themes für Marp Foliensätze
```

### Weitere

```
website/                             # Docusaurus-Website
│
├─ src/                              # Darstellung & Interaktion der Webseite
├─ static/                           # Vom Builder abgelegte PDFs/Bilder
└─ .generated/                       # Vom Builder generiertes Layout
   ├─ ...
   ├─ navbar.config.json
   └─ courses.config.json
```

.vscode/
│
├─ settings.json                     # YAML Schema-Zuweisungen
│
└─ .schemas/                         # Generierte JSON-Schemas (für IntelliSense)
   └─ course-plan.schema.json
---

## Begriffe

| Begriff | Bedeutung |
|----------|------------|
| **Stunde** | Kleinste Unterrichtseinheit (Einzel- oder Doppelstunde). Eine Stunde behandelt einen klar abgegrenzten Teilaspekt des aktuellen Kapitels. |
| **Kapitel (chapter)** | Didaktisch abgeschlossene Einheit mit 1–6 Stunden. |
| **Themenblock (topic)** | Übergeordnete oder eigenständige thematische Einheit. Kann mehrere Kapitel zusammenfassen (z. B. *Vektorgeometrie*) oder als einzelnes Thema ohne Unterkapitel stehen. |
| **Roadmap** | Fortschrittsübersicht über alle Themenblöcke und Kapitel einer Klasse. Zeigt aktuelle, abgeschlossene und kommende Themen. Wird über die Datei `progress.yaml` pro Klasse gesteuert. |
| **Arbeitsblatt (worksheet)** | Besteht aus mehreren Lernelementen (z. B. Basisaufgaben, Checkpoints, Challenges, Infotexten) und kann als PDF oder interaktive Web-Seite vorliegen. |
| **Lernelement** | Kleinste Einheit innerhalb eines Arbeitsblatts. Lernelemente werden im Content-Pool gepflegt und zu Arbeitsblättern zusammengesetzt. |
| **Basisaufgabe (task)** | Aufgabe, die alle Schüler während der Stunde bearbeiten. Sie bildet das erwartete Mindestlernziel ab. |
| **Checkpoint** | Verständnisfrage mit sofortiger Rückmeldung (Check for Understanding). Dient der Selbstkontrolle und Lernstandserhebung. |
| **Challenge** | Vertiefungs- oder Transferaufgabe für schnelle oder besonders leistungsstarke Schüler. Fördert Anwendung und Transfer. |

---

## Ablauf einer Stunde

1. Vorbereitung
2. Einstiegsphase (Marp-Folien)
3. Erarbeitungsphase (`/aktuell/`)
4. Ergebnissicherung
5. Nachbereitung

---


## Arbeitsblatttypen

| Typ | Format |
|------|---------|
| PDF-AB | `.pdf` |
| Web-AB | `.mdx` |

---


## ToDo Liste

- Warnung wenn Lernelemente die bereits veröffentlicht sind bearbeitet werden (Willst du das nicht lieber in einem neuen Branch machen?)

© 2025 Christian Holst
