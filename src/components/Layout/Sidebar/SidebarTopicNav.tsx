"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { AppLink } from "@components/AppLink";
import type { CourseOverviewTopic } from "@domain/overview";
import styles from "./Sidebar.module.css";

type SidebarTopicNavProps = {
  topics: CourseOverviewTopic[];
  currentTopic?: string;
  currentChapter?: string;
  roadmapCurrentTopic?: string;
  roadmapCurrentChapter?: string;
  buildTopicUrl: (topicId: string) => string;
  buildChapterUrl: (topicId: string, chapterId: string) => string;
  onLinkClick: () => void;
  onTopicClick: (event: React.MouseEvent) => void;
};

export function SidebarTopicNav({
  topics,
  currentTopic,
  currentChapter,
  roadmapCurrentTopic,
  roadmapCurrentChapter,
  buildTopicUrl,
  buildChapterUrl,
  onLinkClick,
  onTopicClick,
}: SidebarTopicNavProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    if (currentTopic) {
      next.add(currentTopic);
    }
    if (roadmapCurrentTopic) {
      next.add(roadmapCurrentTopic);
    }
    if (next.size > 0) {
      setExpandedTopics(next);
    }
  }, [currentTopic, roadmapCurrentTopic]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const isActiveTopic = (topicId: string): boolean => {
    return currentTopic === topicId && !currentChapter;
  };

  const isActiveChapter = (topicId: string, chapterId: string): boolean => {
    return currentTopic === topicId && currentChapter === chapterId;
  };

  return (
    <nav className={styles.nav}>
      {topics.map((topic) => {
        const isExpanded = expandedTopics.has(topic.id);
        const isActive = isActiveTopic(topic.id);

        return (
          <div key={topic.id} className={styles.topicGroup}>
            <div className={styles.topicHeader}>
              <AppLink
                href={buildTopicUrl(topic.id)}
                className={`${styles.topicLink} ${isActive ? styles.topicLinkActive : ""}`.trim()}
                onClick={onTopicClick}
              >
                <h4>{topic.title}</h4>
              </AppLink>
              <button
                className={styles.topicToggle}
                onClick={() => toggleTopic(topic.id)}
                aria-expanded={isExpanded}
                aria-label={`Toggle ${topic.title}`}
              >
                <ChevronRight
                  size={20}
                  className={`${styles.topicChevron} ${
                    isExpanded ? styles.topicChevronExpanded : ""
                  }`.trim()}
                />
              </button>
            </div>

            {isExpanded && topic.chapters.length > 0 ? (
              <ul className={styles.chapterList}>
                {topic.chapters.map((chapter) => {
                  const isChapterActive = isActiveChapter(topic.id, chapter.id);
                  const isRoadmapCurrent =
                    roadmapCurrentTopic === topic.id &&
                    roadmapCurrentChapter === chapter.id;

                  return (
                    <li key={chapter.id} className={styles.chapterItem}>
                      <AppLink
                        href={buildChapterUrl(topic.id, chapter.id)}
                        className={`${styles.chapterLink} ${
                          isChapterActive ? styles.chapterLinkActive : ""
                        } ${isRoadmapCurrent ? styles.chapterLinkRoadmapCurrent : ""}`.trim()}
                        onClick={onLinkClick}
                      >
                        {isRoadmapCurrent ? (
                          <span className={styles.roadmapMarker} aria-hidden="true" />
                        ) : null}
                        {chapter.title}
                      </AppLink>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
