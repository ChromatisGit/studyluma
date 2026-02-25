import { SectionShell } from "@components/SectionShell";
import { PageHeader } from "@components/PageHeader/PageHeader";
import type { ProgressTopicDTO, ProgressChapterDTO } from "@schema/courseTypes";
import { Roadmap } from "@components/Roadmap";
import { WorksheetCards } from "@components/WorksheetCards";
import styles from "./CoursepageLayout.module.css";
import COURSEPAGE_TEXT from "@coursepage/coursepage.de.json";

function findCurrentChapter(roadmap: ProgressTopicDTO[]): ProgressChapterDTO | undefined {
  for (const topic of roadmap) {
    const currentChapter = topic.chapters.find(ch => ch.status === "current");
    if (currentChapter) return currentChapter;
  }
  return undefined;
}

type CoursepageModel = {
  title: string;
  label: string;
  roadmap: ProgressTopicDTO[];
};

interface CoursepagePageProps {
  model: CoursepageModel;
}

export function CoursepagePage({ model }: CoursepagePageProps) {
  const { title, label, roadmap } = model;

  const currentChapter = findCurrentChapter(roadmap);
  const pageTitle = `${title} - ${COURSEPAGE_TEXT.intro.titleSuffix}`;
  const welcomeText = COURSEPAGE_TEXT.intro.welcome.replace("{label}", label);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <PageHeader title={pageTitle} />
      </header>

      <p className={styles.pageWelcome}>{welcomeText}</p>
      <p className={styles.pageDescription}>{COURSEPAGE_TEXT.intro.description}</p>

      {currentChapter ? (
        <SectionShell title={COURSEPAGE_TEXT.currentTopic.heading} className={styles.courseSection}>
          <h3 className={styles.currentTopicTitle}>{currentChapter.label}</h3>
          {currentChapter.worksheets && currentChapter.worksheets.length > 0 ? (
            <>
              <h2 className={styles.worksheetsTitle}>{COURSEPAGE_TEXT.worksheets.title}</h2>
              <WorksheetCards worksheets={currentChapter.worksheets} />
            </>
          ) : null}
        </SectionShell>
      ) : null}


      {roadmap && roadmap.length > 0 ? (
        <SectionShell title={COURSEPAGE_TEXT.roadmap.heading} className={styles.courseSection}>
          <Roadmap roadmap={roadmap} />
        </SectionShell>
      ) : null}
    </main>
  );
}
