import { useState } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { buttonClassName } from "@chromatis/base/ui";
import { useSite } from "../../classroom";
import type { Course } from "../../courses";
import { beginUnit } from "../application/unitLifecycle";
import { useRunningUnit } from "../application/useLessonSession";
import TEXT from "./lessons.de.json";

/**
 * "Öffnen" for a deck of the Inhalte: the slides only exist inside a unit, so
 * where none runs yet one is started with this deck, as "Unterricht starten" does.
 */
export function OpenSlides({
  course,
  path,
  presentationId,
}: {
  course: Course;
  path: string;
  presentationId: string;
}) {
  const site = useSite();
  const unit = useRunningUnit();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const style = buttonClassName({ role: "secondary", size: "sm" });
  if (unit) {
    return (
      <Link className={style} to={path}>
        {TEXT.unit.open}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        className={style}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setFailed(false);
          void beginUnit({
            courseId: course.id,
            presentationId,
            path,
            periods: site.catalog.timetable.periods,
            classroom: site.classroomEnabled,
            existingCode:
              site.classroom?.role === "controller"
                ? site.classroom.code
                : null,
            refresh: async () => {
              await revalidator.revalidate();
            },
          }).then((started) => {
            setBusy(false);
            if (started) {
              void navigate(path);
            } else {
              setFailed(true);
            }
          });
        }}
      >
        {TEXT.unit.open}
      </button>
      {failed && <span role="alert">{TEXT.unit.failed}</span>}
    </>
  );
}
