


const overviewMdx = ({ label, subject, group, chapterTitle, docCards }: {label: string, subject: string, group:string, chapterTitle:string}) => `---
sidebar_position: 1
sidebar_label: "${label}"
title: "${label}"
---

import DocCardLink from '@site/src/components/DocCardLink';

# Übersicht

Willkommen im Kurs **${label}** der ${group.toUpperCase()} 👋
Hier findest du alle Materialien, Zusammenfassungen und Übungen zu den Themen des Schuljahres!

---

## Aktuelles Thema

### ${chapterTitle}

${docCards}

---

## Roadmap

`;

