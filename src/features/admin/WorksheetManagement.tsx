import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AppLink } from "@components/AppLink";
import type { CourseId } from "@schema/courseTypes";
import type { AdminWorksheetRef } from "@services/courseService";
import { useDemoOverrides } from "@ui/demo/DemoOverrideContext";
import { useAdminAction } from "./useAdminAction";
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
  const { getOverride, setWorksheetHidden, setSolutionHidden } = useDemoOverrides();
  const { isDemoMode, runAdminAction } = useAdminAction();

  const [isHidden, setIsHidden] = useState(worksheet.isHidden);
  const [isSolutionHidden, setIsSolutionHidden] = useState(worksheet.isSolutionHidden);

  // Sync state from demo override store after localStorage loads
  useEffect(() => {
    if (!isDemoMode) return;
    const wsOverride = getOverride(courseId).worksheets?.[worksheet.worksheetId];
    if (wsOverride?.isHidden !== undefined) setIsHidden(wsOverride.isHidden);
    if (wsOverride?.isSolutionHidden !== undefined) setIsSolutionHidden(wsOverride.isSolutionHidden);
  }, [isDemoMode, getOverride, courseId, worksheet.worksheetId]);

  const handleToggle = () => {
    const newHidden = !isHidden;
    setIsHidden(newHidden);

    runAdminAction({
      payload: {
        intent: "toggle-worksheet-visibility",
        courseId,
        worksheetId: worksheet.worksheetId,
        isHidden: newHidden,
      },
      demo: () => setWorksheetHidden(courseId, worksheet.worksheetId, newHidden),
      onError: () => setIsHidden(!newHidden),
      toastErrors: false,
    });
  };

  const handleSolutionToggle = () => {
    const newHidden = !isSolutionHidden;
    setIsSolutionHidden(newHidden);

    runAdminAction({
      payload: {
        intent: "toggle-worksheet-solution-visibility",
        courseId,
        worksheetId: worksheet.worksheetId,
        isSolutionHidden: newHidden,
      },
      demo: () => setSolutionHidden(courseId, worksheet.worksheetId, newHidden),
      onError: () => setIsSolutionHidden(!newHidden),
      toastErrors: false,
    });
  };

  const isPdfCourse = worksheet.worksheetFormat === "pdfSolution";
  const worksheetHref = `${courseSlug}/${worksheet.topicId}/${worksheet.chapterId}/${worksheet.worksheetId}`;

  return (
    <div className={styles.worksheetRow}>
      <div className={styles.worksheetMain}>
        <div className={styles.worksheetInfo}>
          <AppLink href={worksheetHref} target="_blank" className={styles.worksheetLabel}>
            {worksheet.label}
            <ExternalLink size={12} className={styles.worksheetLabelIcon} />
          </AppLink>
          <span className={styles.worksheetFilename}>{worksheet.sourceFilename}</span>
        </div>
        <div className={styles.worksheetActions}>
          {isPdfCourse && (
            <button
              className={isSolutionHidden ? styles.solutionHidden : styles.solutionVisible}
              onClick={handleSolutionToggle}
              title={isSolutionHidden ? TEXT.solutionHidden : TEXT.solutionVisible}
            >
              {isSolutionHidden ? TEXT.solutionHidden : TEXT.solutionVisible}
            </button>
          )}
          <button
            className={isHidden ? styles.toggleHidden : styles.toggleVisible}
            onClick={handleToggle}
            title={isHidden ? TEXT.hidden : TEXT.visible}
          >
            {isHidden ? TEXT.hidden : TEXT.visible}
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
    let chapterWorksheets = byChapter[ws.chapterId];
    if (!chapterWorksheets) {
      chapterWorksheets = [];
      byChapter[ws.chapterId] = chapterWorksheets;
      chapterOrder.push(ws.chapterId);
    }
    chapterWorksheets.push(ws);
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
            {(byChapter[id] ?? []).map((ws) => {
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
