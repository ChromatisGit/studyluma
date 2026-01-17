"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProgressTopicDTO } from "@/domain/progressDTO";
import type { CourseId } from "@/server/data/courses";
import { setProgressAction } from "@/server/admin/progressActions";
import { Button } from "@components/Button";
import Roadmap from "@/features/coursepage/components/Roadmap/Roadmap";
import styles from "./ProgressControl.module.css";

type ProgressControlProps = {
  courseId: CourseId;
  currentTopicId: string;
  currentChapterId: string;
  topics: ProgressTopicDTO[];
};

export function ProgressControl({
  courseId,
  currentTopicId,
  currentChapterId,
  topics,
}: ProgressControlProps) {
  const [selectedTopicId, setSelectedTopicId] = useState(currentTopicId);
  const [selectedChapterId, setSelectedChapterId] = useState(currentChapterId);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasChanges =
    selectedTopicId !== currentTopicId || selectedChapterId !== currentChapterId;

  const handleChapterSelect = (topicId: string, chapterId: string) => {
    setSelectedTopicId(topicId);
    setSelectedChapterId(chapterId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTopicId || !selectedChapterId) {
      toast.error("Please select a chapter");
      return;
    }

    startTransition(async () => {
      const result = await setProgressAction(courseId, selectedTopicId, selectedChapterId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Progress updated successfully");
      router.refresh();
    });
  };

  const selectedTopic = topics.find((t) => t.topicId === selectedTopicId);
  const selectedChapter = selectedTopic?.chapters.find(
    (c) => c.chapterId === selectedChapterId
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.roadmapContainer}>
        <Roadmap
          roadmap={topics}
          isAdmin
          onChapterSelect={handleChapterSelect}
          selectedTopicId={selectedTopicId}
          selectedChapterId={selectedChapterId}
        />
      </div>

      <div className={styles.actions}>
        {hasChanges && selectedTopic && selectedChapter ? (
          <p className={styles.selectionInfo}>
            Selected: <strong>{selectedTopic.label}</strong> → <strong>{selectedChapter.label}</strong>
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending || !hasChanges}
          variant="primary"
        >
          {isPending ? "Updating..." : "Update Progress"}
        </Button>
      </div>
    </form>
  );
}
