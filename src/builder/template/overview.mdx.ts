import type { CoursePlan } from "@schema/course-plan";
import type { OverviewModel, Topic } from "../types/overview";

export function renderOverview(model: OverviewModel): string {
  const mdx = [
    frontMatter(model.title),
    imports(),
    intro(model.title, model.label),
    currentTopicSection(model.inProgress),
    worksheetsSection(model.worksheets),
    roadmapSection(model.finished, model.inProgress, model.planned),
  ]
    .filter(Boolean)
    .map((str) => dedent(str))
    .join("\n\n");

  return mdx;
}

function frontMatter(title: string) {
  return `
    ---
    sidebar_position: 1
    sidebar_label: "Übersicht"
    title: "${title}"
    ---
  `;
}

function imports() {
  return `
    import DocCard from '@site/src/components/DocCard';
  `;
}

function intro(title: string, label: string) {
  return `
    # ${title} - Übersicht

    Willkommen im Kurs **${label}**!

    Hier findest du alle Materialien, Erklärungen und Übungen zu den Themen des Schuljahres.
  `;
}

function currentTopicSection(inProgress?: Topic) {
  if (!inProgress) return "";

  return `
    ## Aktuelles Thema

    ### ${inProgress.topic}
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

function roadmapSection(
  finished: Topic[],
  inProgress: Topic | undefined,
  planned: Topic[]
) {
  // TODO: implement roadmap component
  return "";
}

function dedent(str: string): string {
  return str
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}