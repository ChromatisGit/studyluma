import { Link, useFetcher } from "react-router";
import { useSite } from "./SiteContext";
import { chapterPath, chaptersInOrder, type Course } from "../../courses";

/** Everything a course offers, chapter by chapter: presentations and worksheets. */
export function Inhalte({
  course,
  showHidden = false,
}: {
  course: Course;
  showHidden?: boolean;
}) {
  const site = useSite();
  const fetcher = useFetcher();
  const { catalog } = site;
  return (
    <div className="stack stack-500">
      {chaptersInOrder(course).map((chapter) => {
        const entry = catalog.chapters.find((item) => item.id === chapter.id);
        const summary = catalog.summaries.find(
          (item) => item.chapterId === chapter.id,
        );
        const presentations = catalog.presentations.filter((item) => {
          const set = catalog.foliensaetze.find(
            (candidate) => candidate.id === item.rootFoliensatzId,
          );
          return (
            item.chapterId === chapter.id && (showHidden || set?.inOverview)
          );
        });
        const sheets = (entry?.worksheetIds ?? []).flatMap((id) => {
          const sheet = catalog.worksheets.find((item) => item.id === id);
          return sheet ? [sheet] : [];
        });
        const base = chapterPath(course.id, chapter.id);
        return (
          <section key={chapter.id} className="content-section">
            <h2 className="h2">
              {chapter.number} {chapter.title}
            </h2>
            {site.viewer === "teacher" &&
              summary &&
              !site.releasedSummaries.includes(chapter.id) && (
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="releaseSummary" />
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <button type="submit">Inhalt freigeben</button>
                </fetcher.Form>
              )}
            {presentations.map((item) => (
              <p key={item.id}>
                <Link
                  to={`${base}/lesson?presentation=${encodeURIComponent(item.id)}`}
                >
                  {item.title}
                </Link>
              </p>
            ))}
            {sheets.map((sheet) => (
              <p key={sheet.id}>
                <Link to={`${base}/sheets/${encodeURIComponent(sheet.id)}`}>
                  {sheet.title}
                </Link>
              </p>
            ))}
          </section>
        );
      })}
    </div>
  );
}
