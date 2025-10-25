# StudySpace

Digitale Unterrichtsplattform für Mathematik und Informatik auf Basis von **Docusaurus**.

---

## Ordnerstruktur

```

base/                          # Allgemeine Unterrichtsinhalte (unabhängig von Kursen)
├─ math/                       # Mathematik
│  ├─ <topic>/                 # z. B. vektorgeometrie, trigonometrie, stochastik
│  │  ├─ chapters/             # Kapitel des Themenblocks
│  │  │  ├─ <chapter>/         # z. B. 00_geraden, 01_geraden_lagebeziehung
│  │  │  │  ├─ presentations/  # Foliensätze-Vorlagen
│  │  │  │  ├─ worksheets/     # Arbeitsbögen-Vorlagen
│  │  │  │  ├─ current.md      # (optional) Webseite während das Kapitel bearbeitet wird
│  │  │  │  └─ summary.md      # Zusammenfassung auf Website nach Abschluss des Kapitels
│  │  │  └─ ...
│  │  │
│  │  ├─ content-pool/         # Wiederverwendbare Lernelemente (Aufgaben, Texte, Checkpoints)
│  │  ├─ images/               # Abbildungen für diesen Themenblock
│  │  ├─ notes.md              # Interne Lehrernotizen
│  │  └─ topic.yaml            # Interne Planungsstruktur, Lernziele, Kapitelreihenfolge
│  └─ ...
│
└─ info/                       # Informatik (gleicher Aufbau wie Mathematik)
│  └─ ...
│
└─ presentations/              # Überfachliche Foliensätze (z. B. Einführung, Organisation)

courses/                       # Kursspezifische Inhalte
├─ <coursename>/               # z. B. bg2_gk, tgtm3, bk1
│  ├─ math/                    # Mathematik
│  │  ├─ <topic>/              # z. B. vektorgeometrie
│  │  │  └─ chapters/
│  │  │     ├─ <chapter>/         # z. B. 10_geraden, 11_geraden_lagebeziehung
│  │  │     │  ├─ presentations/  # Kursfolien
│  │  │     │  ├─ worksheets/     # Arbeitsbögen und Lösungen
│  │  │     │  ├─ current.md      # (optional) Überschreibt base/current.md
│  │  │     │  └─ summary.md      # (optional) Überschreibt base/summary.md
│  │  │     └─ ...
│  │  │
│  │  └─ progress.yaml         # Themenliste und Fortschritt des Kurses
│  │
│  ├─ info/                    # Informatik (gleicher Aufbau wie Mathematik)
│  │  ├─ <topic>/
│  │  └─ progress.yaml
│  │
│  └─ website.md               # Startseite des Kurses
│
└─ ...

shared/                        # Globale Ressourcen
├─ styles/                     # CSS, Marp, Website-Themes
├─ tools/                      # Skripte, Generatoren, Parser
└─ templates/                  # Vorlagen (progress.yml für verschiedene Stufen, Themenblöcke etc.)

website/                       # Docusaurus Website mit eigenen Komponenten

```

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

**Sprachlicher Hinweis**
Auf dieser Seite wird bewusst auf Genderzeichen wie den Doppelpunkt oder Doppelnennungen verzichtet, da sie sprachlich eine Trennung der Geschlechter betonen. Stattdessen werden substantivierte Adjektive oder das generische Maskulinum verwendet, um eine flüssige, verständliche und zugleich inklusive Sprache zu fördern.

© 2025 Christian Holst
