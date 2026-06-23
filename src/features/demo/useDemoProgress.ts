"use client";

import { useDemoOverrides } from "@ui/demo/DemoOverrideContext";
import type { ProgressDTO, ProgressStatus, ProgressTopicDTO } from "@schema/courseTypes";

// Mirrors update_course_progress.sql's status assignment so the demo's
// displayed "current" chapter matches what Progress Control shows, without
// touching the DB-unlocked state (the seed unlocks the whole topic so every
// chapter stays reachable regardless of what's cosmetically "current").
function patchTopics(
  topics: ProgressTopicDTO[],
  currentTopicId: string,
  currentChapterId: string,
): ProgressTopicDTO[] {
  const topicIdx = topics.findIndex((t) => t.topicId === currentTopicId);
  if (topicIdx === -1) return topics;
  const chapterIdx = topics[topicIdx].chapters.findIndex((c) => c.chapterId === currentChapterId);

  const topicStatus = (i: number): ProgressStatus =>
    i < topicIdx ? "finished" : i === topicIdx ? "current" : i === topicIdx + 1 ? "planned" : "locked";

  const chapterStatus = (topicI: number, chapterJ: number): ProgressStatus => {
    if (topicI < topicIdx) return "finished";
    if (topicI !== topicIdx) return "locked";
    if (chapterJ === chapterIdx) return "current";
    return chapterJ < chapterIdx ? "finished" : "locked";
  };

  return topics.map((topic, i) => ({
    ...topic,
    status: topicStatus(i),
    chapters: topic.chapters.map((chapter, j) => ({ ...chapter, status: chapterStatus(i, j) })),
  }));
}

/** Patches a topics/roadmap array with the demo override's current chapter. No-op outside demo mode. */
export function useDemoTopics(courseId: string, topics: ProgressTopicDTO[]): ProgressTopicDTO[] {
  const { isDemoMode, getOverride } = useDemoOverrides();
  if (!isDemoMode) return topics;

  const override = getOverride(courseId);
  if (!override.currentTopicId || !override.currentChapterId) return topics;

  return patchTopics(topics, override.currentTopicId, override.currentChapterId);
}

/** Patches a full ProgressDTO with the demo override's current chapter. No-op outside demo mode. */
export function useDemoProgress<T extends ProgressDTO | undefined>(courseId: string, progress: T): T {
  const { isDemoMode, getOverride } = useDemoOverrides();
  const topics = useDemoTopics(courseId, progress?.topics ?? []);
  if (!isDemoMode || !progress) return progress;

  const override = getOverride(courseId);
  return {
    ...progress,
    currentTopicId: override.currentTopicId ?? progress.currentTopicId,
    currentChapterId: override.currentChapterId ?? progress.currentChapterId,
    topics,
  };
}
