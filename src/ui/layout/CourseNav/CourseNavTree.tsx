import { Link, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";
import type { ProgressDTO } from "@schema/courseTypes";

type Props = {
  progress: ProgressDTO;
  currentTopic: string;
  currentChapter: string | undefined;
  courseHref: string;
};

export function CourseNavTree({ progress, currentTopic, currentChapter, courseHref }: Props) {
  const location = useLocation();
  const topic = progress.topics.find((t) => t.topicId === currentTopic);
  if (!topic) return null;

  const visibleChapters = topic.chapters.filter(
    (c) => c.status === "finished" || c.status === "current",
  );

  return (
    <div className="flex flex-col gap-0.5">
      <Link
        to={courseHref}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors no-underline"
      >
        <ArrowLeft size={13} className="flex-shrink-0" aria-hidden />
        <span>Kursübersicht</span>
      </Link>

      <div className="px-3 pt-2 pb-1">
        <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
          {topic.label}
        </span>
      </div>

      {visibleChapters.map((chapter) => {
        const isActive = location.pathname === chapter.href || chapter.chapterId === currentChapter;

        return (
          <Link
            key={chapter.chapterId}
            to={chapter.href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm no-underline transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={clsx(
                "h-2 w-2 flex-shrink-0 rounded-full transition-colors",
                isActive
                  ? "bg-primary"
                  : "bg-foreground/18",
              )}
              aria-hidden
            />
            <span className="truncate">{chapter.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
