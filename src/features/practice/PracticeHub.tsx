"use client";

import { Play, Clock, Target, Zap } from "lucide-react";
import { Button } from "@components/Button";
import { PageHeader } from "@ui/components/PageHeader/PageHeader";
import type { SidebarCourseDTO } from "@schema/courseTypes";
import styles from "./PracticeHub.module.css";

type PracticeHubProps = {
  courses: SidebarCourseDTO[];
  xp?: number;
  badge?: string;
};

// Mock per-course data until backend is ready
const MOCK_TOPICS = ["Lineare Gleichungen", "Quadratische Gleichungen", "Vektoren", "Trigonometrie", "Differentialrechnung"];

function getMockModule(courseId: string, index: number) {
  return {
    topic: MOCK_TOPICS[index % MOCK_TOPICS.length] ?? "Aktuelles Thema",
    courseXp: 200 + index * 130,
    rank: 3 + index * 4,
    total: 20 + index * 4,
    progress: Math.min(100, 30 + index * 19),
  };
}

export function PracticeHub({ courses, xp, badge: _badge }: PracticeHubProps) {
  const hasPausedSession = false; // TODO: wire to real paused session state

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <PageHeader
          title="Work in Progress"
          subtitle="Dieses Feature wird gerade noch entwickelt und funktioniert noch nicht!"
          actions={xp !== undefined ? (
            <div className={styles.xpCard}>
              <Zap size={16} className={styles.xpIcon} aria-hidden />
              <div className={styles.xpInfo}>
                <span className={styles.xpLabel}>Total XP</span>
                <span className={styles.xpValue}>{xp}</span>
              </div>
            </div>
          ) : undefined}
        />

        {/* Resume session */}
        {hasPausedSession && (
          <div className={styles.resumeCard}>
            <div className={styles.resumeLeft}>
              <Play size={18} className={styles.resumeIcon} aria-hidden />
              <div>
                <p className={styles.resumeTitle}>Resume Your Session</p>
                <p className={styles.resumeDesc}>You have a paused practice session waiting</p>
              </div>
            </div>
            <Button href="/practice/session" variant="primary" size="sm">
              Continue Practice
            </Button>
          </div>
        )}

        {/* Practice modules */}
        {courses.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>📚</span>
            <p className={styles.emptyTitle}>Keine Übungsmodule</p>
            <p className={styles.emptyDesc}>Tritt einem Kurs bei, um loszulegen.</p>
            <Button href="/" variant="primary" size="md">Zum Kurs</Button>
          </div>
        ) : (
          <section>
            <h2 className={styles.sectionTitle}>Practice Modules</h2>
            <div className={styles.modulesList}>
              {courses.map((course, i) => {
                const mock = getMockModule(course.id, i);
                return (
                  <div key={course.id} className={styles.moduleCard}>
                    {/* Top row: title + chips */}
                    <div className={styles.moduleTop}>
                      <div>
                        <p className={styles.moduleName}>{course.label}</p>
                        <p className={styles.moduleTopic}>{mock.topic}</p>
                      </div>
                      <div className={styles.moduleChips}>
                        <span className={styles.xpChip}>
                          <Zap size={11} aria-hidden />
                          {mock.courseXp} XP
                        </span>
                        <span className={styles.rankChip}>
                          #{mock.rank} of {mock.total}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className={styles.progressRow}>
                      <span className={styles.progressLabel}>Progress</span>
                      <span className={styles.progressPct}>{mock.progress}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${mock.progress}%` }} />
                    </div>

                    {/* Session buttons */}
                    <div className={styles.sessionButtons}>
                      <button type="button" className={styles.sessionBtn}>
                        <Clock size={18} aria-hidden />
                        <span className={styles.sessionBtnLabel}>Quick</span>
                        <span className={styles.sessionBtnSub}>3 min</span>
                      </button>
                      <button type="button" className={styles.sessionBtn}>
                        <Play size={18} aria-hidden />
                        <span className={styles.sessionBtnLabel}>Full</span>
                        <span className={styles.sessionBtnSub}>15 min</span>
                      </button>
                      <button type="button" className={styles.sessionBtn}>
                        <Target size={18} aria-hidden />
                        <span className={styles.sessionBtnLabel}>Focus</span>
                        <span className={styles.sessionBtnSub}>Custom</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
