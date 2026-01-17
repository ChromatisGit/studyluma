"use client";

import { AppLink } from "@components/AppLink";
import type { ProgressTopicDTO } from "@domain/progressDTO";
import styles from "./Sidebar.module.css";

type SidebarTopicNavProps = {
  topics: ProgressTopicDTO[];
  currentTopic?: string;
  currentChapter?: string;
  progressCurrentTopicId: string;
  progressCurrentChapterId: string;
  onLinkClick: () => void;
};

export function SidebarTopicNav({
  topics,
  currentTopic,
  currentChapter,
  progressCurrentTopicId,
  progressCurrentChapterId,
  onLinkClick,
}: SidebarTopicNavProps) {
  // Find the current topic from the list
  const topic = topics.find((t) => t.topicId === currentTopic);

  if (!topic) {
    return null;
  }

  const isActiveTopic = !currentChapter;

  const isActiveChapter = (chapterId: string): boolean => {
    return currentChapter === chapterId;
  };

  const visibleChapters = topic.chapters.filter((chapter) => chapter.status !== "locked");

  return (
    <nav className={styles.nav}>
      <div className={styles.topicGroup}>
        <div className={styles.topicHeader}>
          <AppLink
            href={topic.href}
            className={`${styles.topicLink} ${isActiveTopic ? styles.topicLinkActive : ""}`.trim()}
            onClick={onLinkClick}
          >
            <h4>{topic.label}</h4>
          </AppLink>
        </div>

        {visibleChapters.length > 0 ? (
          <ul className={styles.chapterList}>
            {visibleChapters.map((chapter) => {
              const isChapterActive = isActiveChapter(chapter.chapterId);
              const isRoadmapCurrent =
                progressCurrentTopicId === topic.topicId &&
                progressCurrentChapterId === chapter.chapterId;

              return (
                <li key={chapter.chapterId} className={styles.chapterItem}>
                  <AppLink
                    href={chapter.href}
                    className={`${styles.chapterLink} ${
                      isChapterActive ? styles.chapterLinkActive : ""
                    } ${isRoadmapCurrent ? styles.chapterLinkRoadmapCurrent : ""}`.trim()}
                    onClick={onLinkClick}
                  >
                    {isRoadmapCurrent ? (
                      <span className={styles.roadmapMarker} aria-hidden="true" />
                    ) : null}
                    {chapter.label}
                  </AppLink>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}
