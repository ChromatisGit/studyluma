import type { CoursePlan } from "@schema/coursePlan";
import type { OverviewModel, RoadmapTopic } from "@schema/overview";

export function renderOverview(model: OverviewModel): string {
  const mdx = [
    frontMatter(model.title),
    imports(),
    intro(model.title, model.label),
    currentTopicSection(model.current),
    worksheetsSection(model.worksheets),
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
    sidebar_position: 1
    sidebar_label: "Übersicht"
    ---
  `;
}

function imports() {
  return `
    import DocCard from '@site/src/components/DocCard';
    import Roadmap from '@site/src/components/Roadmap';
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

function worksheetsSection(worksheets: CoursePlan["current_worksheets"]) {
  if (worksheets.length === 0) return "";

  const cards = worksheets
    .map(
      (worksheet) => `
      <DocCard
        href="${worksheet}"
        label="Placeholder"
        description="Placeholder"
      />`
    )
    .join("\n");

  return `
    <div className="row">
      ${cards}
    </div>
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