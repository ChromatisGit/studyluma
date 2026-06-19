"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ProgressTopicDTO, CourseId } from "@schema/courseTypes";
import { Button } from "@components/Button";
import { Roadmap } from "@components/Roadmap";
import { useDemoOverrides } from "@ui/demo/DemoOverrideContext";
import { postAdminAction } from "./routeActions";
import styles from "./ProgressControl.module.css";
import ADMIN_TEXT from "./admin.de.json";

type ProgressControlProps = {
  courseId: CourseId;
  currentTopicId: string;
  currentChapterId: string;
  topics: ProgressTopicDTO[];
  onProgressUpdate?: (topicId: string, chapterId: string) => void;
};

export function ProgressControl({
  courseId,
  currentTopicId,
  currentChapterId,
  topics,
  onProgressUpdate,
}: ProgressControlProps) {
  const { isDemoMode, setProgress: setDemoProgress } = useDemoOverrides();

  const [selectedTopicId, setSelectedTopicId] = useState(currentTopicId);
  const [selectedChapterId, setSelectedChapterId] = useState(currentChapterId);
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    selectedTopicId !== currentTopicId || selectedChapterId !== currentChapterId;

  const handleChapterSelect = (topicId: string, chapterId: string) => {
    setSelectedTopicId(topicId);
    setSelectedChapterId(chapterId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTopicId || !selectedChapterId) {
      toast.error(ADMIN_TEXT.courseDetail.progressControl.selectChapter);
      return;
    }

    if (isDemoMode) {
      setDemoProgress(courseId, selectedTopicId, selectedChapterId);
      onProgressUpdate?.(selectedTopicId, selectedChapterId);
      toast.success(ADMIN_TEXT.courseDetail.progressControl.successMessage);
      return;
    }

    startTransition(async () => {
      const result = await postAdminAction({
        intent: "set-progress",
        courseId,
        topicId: selectedTopicId,
        chapterId: selectedChapterId,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(ADMIN_TEXT.courseDetail.progressControl.successMessage);
      onProgressUpdate?.(selectedTopicId, selectedChapterId);
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
          {isPending ? ADMIN_TEXT.courseDetail.progressControl.updating : ADMIN_TEXT.courseDetail.progressControl.updateButton}
        </Button>
      </div>
    </form>
  );
}
