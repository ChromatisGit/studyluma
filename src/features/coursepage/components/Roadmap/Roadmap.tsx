"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  LockKeyhole,
  LockKeyholeOpen,
} from "lucide-react";

import type { RoadmapViewModel, Status } from "@domain/roadmap";
import styles from "./Roadmap.module.css";

type RoadmapTrackerProps = {
  roadmap: RoadmapViewModel;
  isAdmin?: boolean;
};

const ACCENT_COLOR = "var(--sn-purple-accent)";
const ACCENT_SOFT_BORDER_COLOR = "var(--sn-purple-accent-soft-border)";
const MUTED_TEXT_COLOR = "var(--sn-text-muted)";
const SURFACE_COLOR = "var(--sn-surface)";
const BULLET_SIZE_PX = 32;

export default function Roadmap({ roadmap, isAdmin = false }: RoadmapTrackerProps) {
  const lastIndex = roadmap.length - 1;

  const currentIndex = useMemo(
    () => roadmap.findIndex((topic) => topic.status === "current"),
    [roadmap]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bulletRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [segments, setSegments] = useState<null | {
    finishedTop: number;
    finishedHeight: number;
    plannedTop: number;
    plannedHeight: number;
  }>(null);

  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(
    () =>
      new Set(
        roadmap
          .map((topic, index) => (topic.isExpanded ? index : null))
          .filter((index): index is number => index !== null)
      )
  );

  useEffect(() => {
    if (expandedTopics.size > 0) return;
    if (currentIndex >= 0) {
      setExpandedTopics(new Set([currentIndex]));
    }
  }, [currentIndex, expandedTopics.size]);

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

  const getCircleStyle = (status: Status): CSSProperties => {
    const base: CSSProperties = {
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "all 0.2s ease",
      borderStyle: "solid",
      width: BULLET_SIZE_PX,
      height: BULLET_SIZE_PX,
    };

    if (status === "finished") {
      return {
        ...base,
        backgroundColor: ACCENT_COLOR,
        borderColor: ACCENT_COLOR,
        borderWidth: 2,
      };
    }

    if (status === "current") {
      return {
        ...base,
        backgroundColor: SURFACE_COLOR,
        borderColor: ACCENT_COLOR,
        borderWidth: 4,
      };
    }

    return {
      ...base,
      backgroundColor: SURFACE_COLOR,
      borderColor: MUTED_TEXT_COLOR,
      borderWidth: 2,
    };
  };

  const getTopicColor = (status: Status): string => {
    if (status === "finished") return ACCENT_SOFT_BORDER_COLOR;
    if (status === "current") return ACCENT_COLOR;
    return MUTED_TEXT_COLOR;
  };

  const getTopicFontWeight = (status: Status): number => {
    if (status === "current") return 600;
    return 400;
  };

  const getChapterStyle = (status: Status): CSSProperties => {
    const base: CSSProperties = {
      padding: "0.4rem var(--sn-space-md)",
      textDecoration: "none",
      display: "block",
      borderRadius: "var(--sn-radius-md)",
      fontSize: "var(--sn-font-size-h4)",
      transition: "background-color 0.2s ease",
    };

    if (status === "finished") {
      return {
        ...base,
        color: ACCENT_SOFT_BORDER_COLOR,
        fontWeight: 400,
      };
    }

    if (status === "current") {
      return {
        ...base,
        color: ACCENT_COLOR,
        fontWeight: 600,
      };
    }

    return {
      ...base,
      color: MUTED_TEXT_COLOR,
      fontWeight: 400,
    };
  };

  useEffect(() => {
    const measure = () => {
      const containerEl = containerRef.current;
      if (!containerEl || roadmap.length === 0) {
        setSegments(null);
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();

      const centers = bulletRefs.current
        .slice(0, roadmap.length)
        .map((el) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return rect.top + rect.height / 2 - containerRect.top;
        })
        .filter((value): value is number => value !== null);

      if (centers.length < 2) {
        setSegments(null);
        return;
      }

      const first = centers[0];
      const last = centers[centers.length - 1];

      let finishedEnd = first;
      if (currentIndex >= 0 && currentIndex < centers.length) {
        finishedEnd = centers[currentIndex];
      }

      const finishedHeight = Math.max(0, finishedEnd - first);
      const plannedHeight = Math.max(0, last - finishedEnd);

      setSegments({
        finishedTop: first,
        finishedHeight,
        plannedTop: finishedEnd,
        plannedHeight,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [roadmap, currentIndex, expandedTopics]);

  const bulletCenterX = BULLET_SIZE_PX / 2;

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: "var(--sn-font-body)",
        position: "relative",
      }}
    >
      {segments ? (
        <>
          {segments.finishedHeight > 0 ? (
            <div
              style={{
                position: "absolute",
                left: bulletCenterX,
                top: segments.finishedTop,
                width: 3,
                height: segments.finishedHeight,
                backgroundColor: ACCENT_COLOR,
                transform: "translateX(-1.5px)",
                zIndex: 0,
              }}
            />
          ) : null}
          {segments.plannedHeight > 0 ? (
            <div
              style={{
                position: "absolute",
                left: bulletCenterX,
                top: segments.plannedTop,
                width: 3,
                height: segments.plannedHeight,
                backgroundColor: MUTED_TEXT_COLOR,
                transform: "translateX(-1.5px)",
                zIndex: 0,
              }}
            />
          ) : null}
        </>
      ) : null}

      {roadmap.map((topic, index) => {
        const isExpanded = expandedTopics.has(index);
        const status = topic.status;
        const panelId = `roadmap-topic-${index}-panel`;
        const isLocked = status === "locked";
        const isClickable = (isAdmin || !isLocked) && Boolean(topic.link);

        return (
          <div
            key={topic.id}
            style={{
              marginBottom: index === lastIndex ? 0 : "var(--sn-space-md)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div
                ref={(el) => {
                  bulletRefs.current[index] = el;
                }}
                style={{
                  width: BULLET_SIZE_PX,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                  position: "relative",
                  top: "3px",
                }}
              >
                <div style={getCircleStyle(status)}>
                  {status === "finished" ? (
                    <Check
                      size={20}
                      color="var(--sn-text-on-accent)"
                      strokeWidth={4}
                    />
                  ) : null}
                  {status === "current" ? (
                    <Circle size={18} color={ACCENT_COLOR} fill={ACCENT_COLOR} />
                  ) : null}
                  {status === "planned" ? (
                    <LockKeyholeOpen size={18} color={MUTED_TEXT_COLOR} strokeWidth={2} />
                  ) : null}
                  {status === "locked" ? (
                    <LockKeyhole size={18} color={MUTED_TEXT_COLOR} strokeWidth={2} />
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  gap: "16px",
                }}
              >
                {isClickable ? (
                  <Link
                    href={topic.link}
                    className={styles.linkHoverBox}
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      fontSize: "1.05rem",
                      color: getTopicColor(status),
                      fontWeight: getTopicFontWeight(status),
                      lineHeight: 1.3,
                      cursor: "pointer",
                    }}
                  >
                    {topic.label}
                  </Link>
                ) : (
                  <span
                    className={styles.linkHoverBox}
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      fontSize: "1.05rem",
                      color: getTopicColor(status),
                      fontWeight: getTopicFontWeight(status),
                      lineHeight: 1.3,
                      cursor: "not-allowed",
                    }}
                  >
                    {topic.label}
                  </span>
                )}

                {topic.chapters.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggleTopic(index)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className={styles.chevronHoverBox}
                    style={{
                      border: "none",
                      cursor: "pointer",
                      color: MUTED_TEXT_COLOR,
                    }}
                  >
                    {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </button>
                ) : null}
              </div>
            </div>

            {isExpanded ? (
              <div style={{ paddingLeft: "44px" }}>
                <div
                  id={panelId}
                  role="region"
                  aria-label={`Kapitel zu ${topic.label}`}
                >
                  {topic.chapters.map((chapter) => (
                    <Link
                      key={chapter.id}
                      href={chapter.link}
                      className={styles.chapterHoverBox}
                      style={getChapterStyle(chapter.status)}
                    >
                      {chapter.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
