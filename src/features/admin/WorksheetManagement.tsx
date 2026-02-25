"use client";

import { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { CourseId } from "@schema/courseTypes";
import type { AdminWorksheetRef } from "@services/courseService";
import { toggleWorksheetVisibilityAction } from "@actions/adminActions";
import { WorksheetMonitor } from "./WorksheetMonitor";
import styles from "./WorksheetManagement.module.css";
import ADMIN_TEXT from "./admin.de.json";

const TEXT = ADMIN_TEXT.courseDetail.worksheetManagement;

interface WorksheetManagementProps {
  courseId: CourseId;
  courseSlug: string;
  worksheets: AdminWorksheetRef[];
  chapterId?: string;
}

interface WorksheetRowProps {
  courseId: CourseId;
  courseSlug: string;
  worksheet: AdminWorksheetRef;
  isMonitorOpen: boolean;
  onToggleMonitor: () => void;
}

function WorksheetRow({ courseId, courseSlug, worksheet, isMonitorOpen, onToggleMonitor }: WorksheetRowProps) {
  const [optimisticHidden, setOptimisticHidden] = useOptimistic(worksheet.isHidden);
  const [, startTransition] = useTransition();

  const handleToggle = () => {
    const newHidden = !optimisticHidden;
    startTransition(async () => {
      setOptimisticHidden(newHidden);
      await toggleWorksheetVisibilityAction(courseId, worksheet.worksheetId, newHidden);
    });
  };

  const worksheetHref = `${courseSlug}/${worksheet.topicId}/${worksheet.chapterId}/${worksheet.worksheetId}`;

  return (
    <div className={styles.worksheetRow}>
      <div className={styles.worksheetMain}>
        <div className={styles.worksheetInfo}>
          <Link href={worksheetHref} target="_blank" className={styles.worksheetLabel}>
            {worksheet.label}
            <ExternalLink size={12} className={styles.worksheetLabelIcon} />
          </Link>
          <span className={styles.worksheetFilename}>{worksheet.sourceFilename}</span>
        </div>
        <div className={styles.worksheetActions}>
          <button
            className={optimisticHidden ? styles.toggleHidden : styles.toggleVisible}
            onClick={handleToggle}
            title={optimisticHidden ? TEXT.hidden : TEXT.visible}
          >
            {optimisticHidden ? TEXT.hidden : TEXT.visible}
          </button>
          <button
            className={isMonitorOpen ? styles.monitorButtonActive : styles.monitorButton}
            onClick={onToggleMonitor}
          >
            {isMonitorOpen ? TEXT.closeMonitor : TEXT.monitorButton}
          </button>
        </div>
      </div>
      {isMonitorOpen && (
        <WorksheetMonitor courseId={courseId} worksheetId={worksheet.worksheetId} />
      )}
    </div>
  );
}

export function WorksheetManagement({ courseId, courseSlug, worksheets, chapterId }: WorksheetManagementProps) {
  const [openMonitorId, setOpenMonitorId] = useState<string | null>(null);

  // Group worksheets by chapterId, preserving order
  const chapterOrder: string[] = [];
  const byChapter: Record<string, AdminWorksheetRef[]> = {};
  for (const ws of worksheets) {
    if (!byChapter[ws.chapterId]) {
      byChapter[ws.chapterId] = [];
      chapterOrder.push(ws.chapterId);
    }
    byChapter[ws.chapterId].push(ws);
  }

  // When a chapterId filter is provided, show only that chapter
  const visibleChapterOrder = chapterId
    ? chapterOrder.filter((id) => id === chapterId)
    : chapterOrder;

  if (visibleChapterOrder.length === 0) {
    return <p className={styles.empty}>{TEXT.noData}</p>;
  }

  return (
    <div className={styles.container}>
      {visibleChapterOrder.map((id) => (
        <div key={id} className={styles.chapter}>
          <div className={styles.worksheetList}>
            {byChapter[id].map((ws) => {
              const monitorKey = `${ws.chapterId}:${ws.worksheetId}`;
              return (
                <WorksheetRow
                  key={ws.worksheetId}
                  courseId={courseId}
                  courseSlug={courseSlug}
                  worksheet={ws}
                  isMonitorOpen={openMonitorId === monitorKey}
                  onToggleMonitor={() =>
                    setOpenMonitorId((prev) => (prev === monitorKey ? null : monitorKey))
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
