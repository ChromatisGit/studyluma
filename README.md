# StudyNode – Meilenstein-Roadmap

## Meilenstein 1: Docusaurus Public

Ziele:

* Ersten Prototyp erstellen (Proof of Concept)
* Feedback in Informatik Didaktik erhalten

---

## Meilenstein 2: Next.js Rewrite

Ziele:

* Ablösung der Docusaurus-Version
* Entwicklung einer stabilen und vorzeigbaren Plattform auf Basis von Next.js

Inhaltlicher Umfang:

* Fertige und stabile öffentliche Next.js-Version
* Trennung von Code- und Inhaltsrepository
* Hostwechsel von Cloudflare zu Vercel
* Datenbank einrichten

---

## Meilenstein 3: Kollaboration und PDF

**Hier bin ich**

Ziele:

* Externe Mitarbeit an Inhalten ermöglichen
* Unterrichtsmaterialien generieren, die in der Praxis einsetzbar sind

Inhaltlicher Umfang:

* Dev Modus ohne Datenbank
* Finalisierung des Typst-PDF-Formats zur Preview
* Dokumentation der Installationsschritte
* Anleitung zur Inhaltserstellung
* Externer Test: Eine Kommilitonin erstellt einen Arbeitsbogen komplett mit StudyNode

---

## Meilenstein 4: Slides

Ziele:

* Durchführung des Unterrichts direkt aus StudyNode heraus ermöglichen

Inhaltlicher Umfang:

* Slides für das Praktikum
* Nutzung eigener Komponenten (Code, Notizen, Bilder)
* Präsentationsmodus für Beamer und Vollbild
* Bedienung über Tastatursteuerung

---

## Meilenstein 5: Accounts und Datenbank

Ziele:

* Personalisierte Nutzung und persistente Datenhaltung ermöglichen

Inhaltlicher Umfang:

* Service Layer in Postgres integrieren
* Speicherung des Lernfortschritts
* Verwaltung von Kursmitgliedschaften
* Einbinden von Kursübergreifenden Prinzipien und Regeln

---

## Meilenstein 6: Instanz und Plattform Splitting

Ziele:

* Plattform von eigener Instanz splitten, sodass andere Lehrer eigene Instanz hosten können

Inhaltlicher Umfang:

* Homepage Elemente trennen
* site.yml hinzufügen als allgemeine Config
* Anleitung wie eigene Instanz auf Vercel gehostet werden kann

---

## Meilenstein 7+

Mögliche Inhalte:

* Aufgabenmacros erweitern (Erklärungen für weitere Aufgabentypen, Bilder in Aufgaben, weitere Aufgabentypen)

* Vollwertige Mathematik-Module
  * Freie Antwortfelder für Tablet unterstützen (#inkTask)
  * Mathe Felder um Ergebnis zu vergleichen
  * Möglichkeit Arbeitsblätter im PDF Format anzubieten

* Practice Nodes (Wiederholung mit zeitlicher Verteilung)

* Klausuren erstellen

* Selbstevaluation der Lernenden:

  * Einschätzung des eigenen Kenntnisstands
  * Identifikation von Schwierigkeiten
  * Definition persönlicher Übungsziele

* StudyNode Mailserver einrichten

* Code Quality

  * Unit Tests und weitere Tests erstellen
  * Performance Check

* Einmalige von Base abweichende Kursinhalte hinzufügen (PDF mit besonderen Infos, AB von Vertretungsstunde)

* Eingebautes Kahoot

* Weboberfläche zum Designen von ABs (generiert Typst Syntax)
