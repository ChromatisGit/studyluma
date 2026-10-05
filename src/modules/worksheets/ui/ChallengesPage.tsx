import { fill } from "../../../helper/text";
import { openChallenges } from "../domain/structure";
import { AufgabeView } from "./AufgabeView";
import { SheetHeader } from "./SheetHeader";
import { ReleasedNotice, TeacherBar } from "./TeacherBar";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/** The chapter's challenge pool: a dark head, harder and optional. */
export function ChallengesPage() {
  const { chapter, state, index, teacher } = useWorksheet();
  const open = openChallenges(chapter, state).length;
  return (
    <>
      <SheetHeader
        meta={fill(TEXT.challenges.meta, { chapter: chapter.number })}
        title={TEXT.challenges.title}
        dark
      />
      <div className="ch-band">
        <div className="ch-band__inner">
          <p className="ch-band__lead">{TEXT.challenges.lead}</p>
          <p className="ch-band__count">
            {fill(TEXT.challenges.count, {
              open,
              total: chapter.challenges.length,
            })}
          </p>
        </div>
      </div>
      <div className="ws">
        {teacher ? (
          <TeacherBar aufgaben={chapter.challenges} />
        ) : (
          <ReleasedNotice aufgaben={chapter.challenges} />
        )}
        <section className="ws-section" aria-label={TEXT.challenges.title}>
          {chapter.challenges.map((challenge) => {
            const info = index.aufgaben.get(challenge.id);
            return info ? <AufgabeView key={challenge.id} info={info} /> : null;
          })}
        </section>
      </div>
    </>
  );
}
