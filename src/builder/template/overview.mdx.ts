import type { OverviewModel, RoadmapTopic } from "@schema/overview";
import { worksheetCards } from "./worksheetCards";

export function renderOverview(model: OverviewModel): string {
  const mdx = [
    frontMatter(model.title),
    imports(),
    intro(model.title, model.label),
    currentTopicSection(model.current),
    worksheetCards(model.worksheets, "Unterrichtsaufgaben"),
    roadmapSection(model.roadmap),
  ]
    .filter(Boolean)
    .map((str) => dedent(str))
    .join("\n\n");

  return mdx;
}

function frontMatter(title: string) {
  return `
    ---
    title: "${title}"
    sidebar_label: "Übersicht"
    ---
  `;
}

function imports() {
  return `
    import Roadmap from '@site/src/features/overview/Roadmap';
  `;
}

function intro(title: string, label: string) {
  return `
    # ${title} - Übersicht

    Willkommen im Kurs **${label}**!

    Hier findest du alle Materialien, Erklärungen und Übungen zu den Themen des Schuljahres.
  `;
}

function currentTopicSection(current: OverviewModel["current"]) {
  if (!current) return "";

  return `
    ---

    ## Aktuelles Thema

    ### ${current}

  `;
}

function roadmapSection(roadmap: RoadmapTopic[]) {
  return `
  ---

  ## Roadmap

  <Roadmap roadmap={${JSON.stringify(roadmap)}} />
  `;
}

function dedent(str: string): string {
  return str
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}