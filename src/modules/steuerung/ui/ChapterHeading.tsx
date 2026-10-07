import type { ChapterInCourse } from "../../courses";
import { Pictogram } from "../../courses";

export function ChapterHeading({
  chapter,
  status,
}: {
  chapter: ChapterInCourse;
  status?: string;
}) {
  return (
    <div className="steuerung-chapter-heading">
      {status && <p className="steuerung-chapter-heading__status">{status}</p>}
      <header className="kapitel-head">
        <Pictogram
          id={chapter.topic.icon}
          fallbackLabel={chapter.topic.title}
        />
        <div className="kapitel-head__text">
          <p className="kapitel-head__meta">{chapter.topic.title}</p>
          <h2 className="h2 kapitel-head__title">
            {chapter.number} {chapter.title}
          </h2>
        </div>
      </header>
    </div>
  );
}
