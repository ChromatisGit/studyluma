import { ArrowRight } from "lucide-react";
import { Button } from "@components/Button";
import { PageHeader } from "@components/PageHeader";
import { Roadmap } from "@components/Roadmap";
import { WorksheetCards } from "@components/WorksheetCards";
import type { ProgressTopicDTO } from "@schema/courseTypes";
import styles from "./Coursepage.module.css";
import COURSE_TEXT from "./coursepage.de.json";

type CoursepageModel = {
  label: string;
  description: string;
  courseId: string;
  roadmap: ProgressTopicDTO[];
};

type CoursepagePageProps = {
  model: CoursepageModel;
};

export function CoursepagePage({ model }: CoursepagePageProps) {
  const { label, description, roadmap } = model;

  // Find the current topic and chapter to show a prominent "continue" CTA
  const currentTopic = roadmap.find((t) => t.status === "current") ?? roadmap[0];
  const currentChapter =
    currentTopic?.chapters.find((c) => c.status === "current") ??
    currentTopic?.chapters.find((c) => c.status !== "locked");

  const continueHref = currentChapter?.href ?? currentTopic?.href;
  const worksheets = currentChapter?.worksheets ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <PageHeader
          title={`${label} ${COURSE_TEXT.intro.titleSuffix}`}
          subtitle={description}
        />

        {/* Current topic / continue CTA */}
        {currentTopic && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{COURSE_TEXT.currentTopic.heading}</h2>
            <div className={styles.continueCard}>
              <div className={styles.continueInfo}>
                <p className={styles.topicName}>{currentTopic.label}</p>
                {currentChapter && (
                  <p className={styles.chapterName}>{currentChapter.label}</p>
                )}
              </div>
              {continueHref && (
                <Button href={continueHref} variant="primary" size="md">
                  Weiter
                  <ArrowRight size={15} aria-hidden />
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Current worksheets */}
        {worksheets.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{COURSE_TEXT.currentWorksheets.heading}</h2>
            <WorksheetCards worksheets={worksheets} />
          </section>
        )}

        {/* Roadmap */}
        {roadmap.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{COURSE_TEXT.roadmap.heading}</h2>
            <Roadmap roadmap={roadmap} />
          </section>
        )}
      </div>
    </div>
  );
}
