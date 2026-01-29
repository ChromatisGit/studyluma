import "server-only";

import { notFound } from "next/navigation";
import type { ProgressTopicDTO } from "@schema/progressDTO";
import type { CourseId } from "./courseService";
import { getProgressDTO } from "./getProgressDTO";

/**
 * Get a single topic with progress filtering applied.
 * Returns 404 if the topic is locked or doesn't exist.
 */
export async function getTopicDTO({
  courseId,
  topicId,
}: {
  courseId: CourseId;
  topicId: string;
}): Promise<ProgressTopicDTO> {
  const progressDTO = await getProgressDTO(courseId);
  const topic = progressDTO.topics.find((t) => t.topicId === topicId);

  if (!topic || topic.status === "locked") {
    notFound();
  }

  return topic;
}

