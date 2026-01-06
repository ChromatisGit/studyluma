import { SectionShell } from "@components/SectionShell";
import type { CoursepageModel } from "@client/viewModel/roadmap";
import Roadmap from "./components/Roadmap/Roadmap";
import { WorksheetCards } from "./components/WorksheetCard/WorksheetCards";
import styles from "./layout/CoursepageLayout.module.css";
import COURSEPAGE_TEXT from "@coursepage/coursepage.de.json";


interface CoursepagePageProps {
  model: CoursepageModel;
}

export function CoursepagePage({ model }: CoursepagePageProps) {
  const { title, label, current, worksheets, roadmap } = model;


  const pageTitle = `${title} - ${COURSEPAGE_TEXT.intro.titleSuffix}`;
  const welcomeText = COURSEPAGE_TEXT.intro.welcome.replace("{label}", label);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        <p className={styles.pageWelcome}>{welcomeText}</p>
        <p className={styles.pageDescription}>{COURSEPAGE_TEXT.intro.description}</p>
      </header>

      {current ? (
        <SectionShell title={COURSEPAGE_TEXT.currentTopic.heading} className={styles.courseSection}>
          <h3 className={styles.currentTopicTitle}>{current}</h3>
        </SectionShell>
      ) : null}

      {worksheets && worksheets.length > 0 ? (
        <SectionShell title={COURSEPAGE_TEXT.worksheets.title} className={styles.courseSection}>
          <WorksheetCards worksheets={worksheets} />
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
