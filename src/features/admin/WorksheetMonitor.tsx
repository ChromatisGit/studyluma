"use client";

import { useState, useEffect, useCallback } from "react";
import type { CourseId } from "@schema/courseTypes";
import type { WorksheetMonitorData } from "@services/worksheetService";
import { getWorksheetMonitorAction } from "@actions/adminActions";
import styles from "./WorksheetMonitor.module.css";
import ADMIN_TEXT from "./admin.de.json";

const TEXT = ADMIN_TEXT.courseDetail.worksheetManagement;

const CAUSE_ORDER = ["topic", "task", "approach", "execution", "mistake", "other"] as const;

interface WorksheetMonitorProps {
  courseId: CourseId;
  worksheetId: string;
}

export function WorksheetMonitor({ courseId, worksheetId }: WorksheetMonitorProps) {
  const [data, setData] = useState<WorksheetMonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getWorksheetMonitorAction(courseId, worksheetId);
    setData(result);
    setLoading(false);
  }, [courseId, worksheetId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPresence = data?.presence.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <div className={styles.monitor}>
      {/* Presence */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>{TEXT.presenceTitle}</h4>
          <button
            className={styles.refreshButton}
            onClick={() => void fetchData()}
            disabled={loading}
          >
            {loading ? TEXT.loading : TEXT.refreshButton}
          </button>
        </div>
        <p className={styles.presenceNote}>{TEXT.presenceNote}</p>

        {!loading && data && (
          data.presence.length === 0 ? (
            <p className={styles.noData}>{TEXT.noPresence}</p>
          ) : (
            <div className={styles.presenceBars}>
              {data.presence.map((stat) => {
                const pct = totalPresence > 0 ? Math.round((stat.count / totalPresence) * 100) : 0;
                return (
                  <div key={stat.sectionIndex} className={styles.presenceRow}>
                    <span className={styles.presenceLabel}>
                      {TEXT.presenceSection} {stat.sectionIndex + 1}
                    </span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.presenceCount}>
                      {stat.count} {TEXT.presenceStudents}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Checkpoint */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{TEXT.checkpointTitle}</h4>

        {!loading && data && (
          data.checkpoints === null ? (
            <p className={styles.noData}>{TEXT.noData}</p>
          ) : (
            <>
              <div className={styles.trafficRow}>
                <span className={styles.green}>🟢 {data.checkpoints.green}</span>
                <span className={styles.yellow}>🟡 {data.checkpoints.yellow}</span>
                <span className={styles.red}>🔴 {data.checkpoints.red}</span>
              </div>

              {(data.checkpoints.yellow > 0 || data.checkpoints.red > 0) && (
                <div className={styles.causes}>
                  <p className={styles.causesTitle}>{TEXT.checkpointCauses}</p>
                  {CAUSE_ORDER.map((cause) => {
                    const count = data.checkpoints?.causes[cause] ?? 0;
                    if (count === 0) return null;
                    return (
                      <div key={cause} className={styles.causeRow}>
                        <span className={styles.causeLabel}>
                          {TEXT.causeLabels[cause as keyof typeof TEXT.causeLabels]}
                        </span>
                        <span className={styles.causeCount}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
