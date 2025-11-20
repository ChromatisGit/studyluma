import Link from "@docusaurus/Link";
import type { RoadmapTopic, Status } from "@schema/overview";
import { Check, Circle, ChevronDown, ChevronRight, LockKeyholeIcon, LockKeyholeOpenIcon } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Roadmap.module.css";

interface RoadmapTrackerProps {
  roadmap: RoadmapTopic[];
}

const PRIMARY_COLOR_VAR = "var(--ifm-color-primary)";
const SECONDARY_COLOR_VAR = "var(--ifm-color-primary-lighter)"
const EMPHASIS_500 = "var(--ifm-color-emphasis-500)";
const BACKGROUND = "var(--ifm-background-surface-color, var(--ifm-color-emphasis-0))";
const BULLET_COL_WIDTH = 36;

export default function Roadmap({ roadmap }: RoadmapTrackerProps) {
  const lastIndex = roadmap.length - 1;

  const currentIndex = useMemo(
    () => roadmap.findIndex((t) => t.status === "current"),
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

  // expand the current topic initially
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(
    () => new Set(currentIndex >= 0 ? [currentIndex] : [])
  );

  const toggleTopic = (index: number) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // -------------------------
  // STYLES
  // -------------------------

  const getCircleStyle = (status: Status): CSSProperties => {
    const base: CSSProperties = {
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "all 0.2s ease",
      borderStyle: "solid",
      width: BULLET_COL_WIDTH,
      height: BULLET_COL_WIDTH,
    };

    if (status === "finished") {
      return {
        ...base,
        backgroundColor: PRIMARY_COLOR_VAR,
        borderColor: PRIMARY_COLOR_VAR,
        borderWidth: 2,
      };
    }

    if (status === "current") {
      return {
        ...base,
        backgroundColor: BACKGROUND,
        borderColor: PRIMARY_COLOR_VAR,
        borderWidth: 4,
      };
    }

    return {
      ...base,
      backgroundColor: BACKGROUND,
      borderColor: EMPHASIS_500,
      borderWidth: 2,
    };
  };

  const getTopicColor = (status: Status): string => {
    if (status === "finished") return SECONDARY_COLOR_VAR;
    if (status === "current") return PRIMARY_COLOR_VAR;
    return EMPHASIS_500;
  };

  const getTopicFontWeight = (status: Status): number => {
    if (status === "current") return 600;
    return 400;
  };

  const getChapterStyle = (status: Status): CSSProperties => {
    const base: CSSProperties = {
      padding: "0.4rem var(--ifm-spacing-horizontal)",
      textDecoration: "none",
      display: "block",
      borderRadius: "var(--ifm-global-radius)",
      fontSize: "var(--ifm-h4-font-size)",
      transition: "background-color 0.2s ease",
    };

    if (status === "finished") {
      return {
        ...base,
        color: SECONDARY_COLOR_VAR,
        fontWeight: 400,
      };
    }

    if (status === "current") {
      return {
        ...base,
        color: PRIMARY_COLOR_VAR,
        fontWeight: 600,
      };
    }

    return {
      ...base,
      color: EMPHASIS_500,
      fontWeight: 400,
    };
  };

  // -------------------------
  // MEASURE BULLETS FOR LINES
  // -------------------------

  useEffect(() => {
    if (!containerRef.current || roadmap.length === 0) {
      setSegments(null);
      return;
    }

    const measure = () => {
      const containerEl = containerRef.current;
      if (!containerEl) {
        setSegments(null);
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();

      const centers = bulletRefs.current
        .slice(0, roadmap.length)
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2 - containerRect.top;
        })
        .filter((v): v is number => v !== null);

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

  const bulletCenterX = BULLET_COL_WIDTH / 2;

  // -------------------------
  // RENDER
  // -------------------------

  return (
    <div
      ref={containerRef}
      className="margin-vert--lg"
      style={{
        padding: "var(--ifm-spacing-vertical)",
        fontFamily: "var(--ifm-font-family-base)",
        position: "relative",
      }}
    >
      {/* Continuous vertical lines */}
      {segments && (
        <>
          {segments.finishedHeight > 0 && (
            <div
              style={{
                position: "absolute",
                left: bulletCenterX,
                top: segments.finishedTop,
                width: 3,
                height: segments.finishedHeight,
                backgroundColor: PRIMARY_COLOR_VAR,
                transform: "translateX(14.7px)",
                zIndex: 0,
              }}
            />
          )}
          {segments.plannedHeight > 0 && (
            <div
              style={{
                position: "absolute",
                left: bulletCenterX,
                top: segments.plannedTop,
                width: 3,
                height: segments.plannedHeight,
                backgroundColor: EMPHASIS_500,
                transform: "translateX(14.7px)",
                zIndex: 0,
              }}
            />
          )}
        </>
      )}

      {roadmap.map((topic, index) => {
        const isExpanded = expandedTopics.has(index);
        const status = topic.status;
        const panelId = `roadmap-topic-${index}-panel`;
        const isLocked = status === "locked";
        const isClickable = !isLocked && !!topic.link;

        return (
          <div
            key={index}
            style={{
              marginBottom: index === lastIndex ? 0 : "var(--ifm-spacing-vertical)",
              position: "relative",
            }}
          >
            {/* Topic row */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--ifm-spacing-horizontal)",
              }}
            >
              {/* Bullet column */}
              <div
                ref={(el) => {
                  bulletRefs.current[index] = el;
                }}
                style={{
                  width: BULLET_COL_WIDTH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <div style={getCircleStyle(status)}>
                  {status === "finished" && (
                    <Check size={24} color="white" strokeWidth={4} />
                  )}
                  {status === "current" && (
                    <Circle size={22} color={PRIMARY_COLOR_VAR} fill={PRIMARY_COLOR_VAR} />
                  )}
                  {status === "planned" && (
                    <LockKeyholeOpenIcon size={22} color={EMPHASIS_500} strokeWidth={2} />
                  )}
                  {status === "locked" && (
                    <LockKeyholeIcon size={22} color={EMPHASIS_500} strokeWidth={2} />
                  )}
                </div>
              </div>

              {/* Topic label + arrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  gap: "var(--ifm-spacing-horizontal)",
                }}
              >
                {isClickable ? (
                  <Link
                    to={topic.link!}
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
                      cursor: "not-allowed", // or "default" if you prefer
                    }}
                  >
                    {topic.label}
                  </span>
                )}

                {topic.chapters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleTopic(index)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className={styles.chevronHoverBox}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--ifm-color-emphasis-600)",
                    }}
                  >
                    {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </button>
                )}
              </div>
            </div>

            {/* Chapters (unchanged) */}
            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-label={`Kapitel zu ${topic.label}`}
                style={{
                  marginLeft: `calc(${BULLET_COL_WIDTH}px + var(--ifm-spacing-horizontal))`,
                  marginTop: "0.5rem",
                }}
              >
                {topic.chapters.map((chapter, i) => (
                  <Link
                    key={i}
                    to={chapter.link}
                    className={styles.chapterHoverBox}
                    style={getChapterStyle(chapter.status)}
                  >
                    {chapter.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}