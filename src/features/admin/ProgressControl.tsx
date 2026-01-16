"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Topic } from "@/domain/courseContent";
import type { CourseId } from "@/server/data/courses";
import { setProgressAction } from "@/server/admin/progressActions";
import { Button } from "@components/Button";
import styles from "./ProgressControl.module.css";

type ProgressControlProps = {
  courseId: CourseId;
  currentTopicId?: string;
  currentChapterId?: string;
  topics: Topic[];
};

export function ProgressControl({
  courseId,
  currentTopicId,
  currentChapterId,
  topics,
}: ProgressControlProps) {
  const [selectedTopicId, setSelectedTopicId] = useState(currentTopicId || topics[0]?.topicId || "");
  const [selectedChapterId, setSelectedChapterId] = useState(currentChapterId || "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedTopic = topics.find((t) => t.topicId === selectedTopicId);
  const chapters = selectedTopic?.chapters || [];

  // Auto-select first chapter when topic changes
  const handleTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId);
    const topic = topics.find((t) => t.topicId === topicId);
    const firstChapter = topic?.chapters[0];
    if (firstChapter) {
      setSelectedChapterId(firstChapter.chapterId);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTopicId || !selectedChapterId) {
      toast.error("Please select both a topic and chapter");
      return;
    }

    startTransition(async () => {
      const result = await setProgressAction(courseId, selectedTopicId, selectedChapterId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Progress updated successfully");
      router.refresh(); // Reload page data
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.grid}>
        {/* Current Progress Display */}
        <div className={styles.currentCard}>
          <p className={styles.currentLabel}>Current Progress:</p>
          <p className={styles.currentValue}>
            {currentTopicId && currentChapterId
              ? `${topics.find((t) => t.topicId === currentTopicId)?.label || "Unknown"} → ${
                  topics
                    .find((t) => t.topicId === currentTopicId)
                    ?.chapters.find((c) => c.chapterId === currentChapterId)?.label || "Unknown"
                }`
              : "Not set"}
          </p>
        </div>

        {/* Topic Selection */}
        <div className={styles.field}>
          <label htmlFor="topic" className={styles.label}>
            Select Topic
          </label>
          <select
            id="topic"
            value={selectedTopicId}
            onChange={(e) => handleTopicChange(e.target.value)}
            disabled={isPending}
            className={styles.select}
          >
            {topics.map((topic) => (
              <option key={topic.topicId} value={topic.topicId}>
                {topic.label}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Selection */}
        <div className={styles.field}>
          <label htmlFor="chapter" className={styles.label}>
            Select Chapter
          </label>
          <select
            id="chapter"
            value={selectedChapterId}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            disabled={isPending || chapters.length === 0}
            className={styles.select}
          >
            {chapters.length === 0 ? (
              <option value="">No chapters available</option>
            ) : (
              chapters.map((chapter) => (
                <option key={chapter.chapterId} value={chapter.chapterId}>
                  {chapter.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending || !selectedTopicId || !selectedChapterId}
          variant="primary"
        >
          {isPending ? "Updating..." : "Update Progress"}
        </Button>
      </div>
    </form>
  );
}
