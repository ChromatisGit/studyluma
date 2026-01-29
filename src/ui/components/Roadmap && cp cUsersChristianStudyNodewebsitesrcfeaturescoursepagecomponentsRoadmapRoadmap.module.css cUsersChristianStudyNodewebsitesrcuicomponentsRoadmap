"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  LockKeyhole,
  LockKeyholeOpen,
} from "lucide-react";

import type { ProgressStatus, ProgressTopicDTO, ProgressChapterDTO } from "@schema/progressDTO";
import styles from "./Roadmap.module.css";

type RoadmapProps = {
  roadmap: ProgressTopicDTO[];
  isAdmin?: boolean;
  showIcons?: boolean;
  /** When provided, clicking chapters calls this instead of navigating */
  onChapterSelect?: (topicId: string, chapterId: string) => void;
  /** The currently selected chapter (for highlighting in selection mode) */
  selectedTopicId?: string;
  selectedChapterId?: string;
};

export default function Roadmap({
  roadmap,
  isAdmin = false,
  showIcons: showIconsProp,
  onChapterSelect,
  selectedTopicId,
  selectedChapterId,
}: RoadmapProps) {
  const isSelectionMode = Boolean(onChapterSelect);
  const showIcons = showIconsProp ?? roadmap.length > 1;

  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(() => {
    const initial = roadmap.findIndex((topic) => topic.status === "current");
    return initial >= 0 ? new Set([initial]) : new Set();
  });

  const toggleTopic = (index: number) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={styles.container}>
      {roadmap.map((topic, index) => {
        const isLast = index === roadmap.length - 1;
        // Segment color: finished topics get accent, current and below get muted
        const segmentIsFinished = topic.status === "finished";

        return (
          <RoadmapTopic
            key={topic.topicId}
            topic={topic}
            index={index}
            isLast={isLast}
            isExpanded={expandedTopics.has(index)}
            onToggle={() => toggleTopic(index)}
            showIcons={showIcons}
            showSegment={showIcons && !isLast}
            segmentIsFinished={segmentIsFinished}
            isAdmin={isAdmin}
            isSelectionMode={isSelectionMode}
            onChapterSelect={onChapterSelect}
            isSelectedTopic={selectedTopicId === topic.topicId}
            selectedChapterId={selectedTopicId === topic.topicId ? selectedChapterId : undefined}
          />
        );
      })}
    </div>
  );
}

// --- Sub-components ---

type RoadmapTopicProps = {
  topic: ProgressTopicDTO;
  index: number;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  showIcons: boolean;
  showSegment: boolean;
  segmentIsFinished: boolean;
  isAdmin: boolean;
  isSelectionMode: boolean;
  onChapterSelect?: (topicId: string, chapterId: string) => void;
  isSelectedTopic: boolean;
  selectedChapterId?: string;
};

function RoadmapTopic({
  topic,
  index,
  isLast,
  isExpanded,
  onToggle,
  showIcons,
  showSegment,
  segmentIsFinished,
  isAdmin,
  isSelectionMode,
  onChapterSelect,
  isSelectedTopic,
  selectedChapterId,
}: RoadmapTopicProps) {
  const { status, label, href, chapters } = topic;
  const panelId = `roadmap-topic-${index}-panel`;
  const isLocked = status === "locked";
  const isClickable = (isAdmin || !isLocked) && Boolean(href);

  const statusClass = styles[`topic${capitalize(status)}`] || "";

  return (
    <div className={`${styles.topicItem} ${isLast ? "" : styles.topicItemSpaced}`}>
      {/* Segment line - extends full height of this topic item */}
      {showSegment && (
        <div
          className={`${styles.segment} ${
            segmentIsFinished ? styles.segmentFinished : styles.segmentPlanned
          }`}
        />
      )}

      <div className={styles.topicRow} style={{ gap: showIcons ? "12px" : 0 }}>
        {showIcons && (
          <div className={styles.bulletWrapper}>
            <RoadmapBullet status={status} />
          </div>
        )}

        <div className={styles.topicContent}>
          {isClickable ? (
            <Link href={href} className={`${styles.topicLabel} ${statusClass}`}>
              {label}
            </Link>
          ) : (
            <span className={`${styles.topicLabel} ${statusClass}`}>
              {label}
            </span>
          )}

          {chapters.length > 0 && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className={styles.chevronButton}
            >
              {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
            </button>
          )}
        </div>
      </div>

      {chapters.length > 0 && (
        <div
          className={`${styles.chaptersContent} ${isExpanded ? styles.chaptersContentExpanded : ""}`}
          style={{ paddingLeft: showIcons ? "42px" : 0 }}
        >
          <div id={panelId} role="region" aria-label={`Chapters for ${label}`}>
            {chapters.map((chapter) => (
              <RoadmapChapter
                key={chapter.chapterId}
                chapter={chapter}
                topicId={topic.topicId}
                isAdmin={isAdmin}
                isSelectionMode={isSelectionMode}
                onChapterSelect={onChapterSelect}
                isSelected={isSelectedTopic && selectedChapterId === chapter.chapterId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type RoadmapBulletProps = {
  status: ProgressStatus;
};

function RoadmapBullet({ status }: RoadmapBulletProps) {
  const bulletClass = styles[`bullet${capitalize(status)}`] || styles.bulletPlanned;

  return (
    <div className={`${styles.bullet} ${bulletClass}`}>
      {status === "finished" && (
        <Check size={20} className={styles.bulletIconFinished} strokeWidth={4} />
      )}
      {status === "current" && (
        <Circle size={18} className={styles.bulletIconCurrent} />
      )}
      {status === "planned" && (
        <LockKeyholeOpen size={20} className={styles.bulletIconMuted} strokeWidth={2} />
      )}
      {status === "locked" && (
        <LockKeyhole size={20} className={styles.bulletIconMuted} strokeWidth={2} />
      )}
    </div>
  );
}

type RoadmapChapterProps = {
  chapter: ProgressChapterDTO;
  topicId: string;
  isAdmin: boolean;
  isSelectionMode: boolean;
  onChapterSelect?: (topicId: string, chapterId: string) => void;
  isSelected: boolean;
};

function RoadmapChapter({
  chapter,
  topicId,
  isAdmin,
  isSelectionMode,
  onChapterSelect,
  isSelected,
}: RoadmapChapterProps) {
  const { status, label, href, chapterId } = chapter;
  const isLocked = status === "locked";

  const statusClass = styles[`chapter${capitalize(status)}`] || "";
  const selectedClass = isSelected ? styles.chapterSelected : "";

  // In selection mode, render as a button instead of a link
  if (isSelectionMode) {
    return (
      <button
        type="button"
        onClick={() => onChapterSelect?.(topicId, chapterId)}
        className={`${styles.chapterLabel} ${styles.chapterSelectable} ${statusClass} ${selectedClass}`.trim()}
      >
        {label}
      </button>
    );
  }

  const isClickable = (isAdmin || !isLocked) && Boolean(href);

  if (isClickable) {
    return (
      <Link href={href} className={`${styles.chapterLabel} ${statusClass}`}>
        {label}
      </Link>
    );
  }

  return (
    <span className={`${styles.chapterLabel} ${statusClass}`}>
      {label}
    </span>
  );
}

// Helper
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
