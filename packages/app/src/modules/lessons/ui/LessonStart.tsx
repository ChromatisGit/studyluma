import { useState } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { Alert, Button, Dialog, buttonClassName } from "@chromatis/base/ui";
import { useSharedClassroom, useSite } from "../../classroom";
import { chapterPathById, type Course } from "../../courses";
import { fill } from "../../../helper/text";
import {
  beginUnit,
  finishUnit,
  useEndedSessionGuard,
} from "../application/unitLifecycle";
import { useRunningUnit } from "../application/useLessonSession";
import type { Unit } from "../domain/unit";
import TEXT from "./lessons.de.json";

/** A unit that runs: back to the slides, or end it. */
function RunningUnit({ unit }: { unit: Unit }) {
  const site = useSite();
  const { snapshot } = useSharedClassroom(
    site.classroom?.role === "controller",
  );
  const [confirm, setConfirm] = useState(false);
  const view = snapshot?.role === "controller" ? snapshot : null;
  const joined =
    view?.participants.filter((item) => item.connected).length ?? 0;
  return (
    <div className="stack stack-300">
      <Alert status="success" title={TEXT.unit.running}>
        {view?.inviteOpen && (
          <p>{fill(TEXT.unit.invited, { code: view.code, count: joined })}</p>
        )}
      </Alert>
      <div className="teacher-controls-actions">
        <Link className={buttonClassName({})} to={unit.resumePath}>
          {TEXT.unit.resume}
        </Link>
        <Button role="secondary" onClick={() => setConfirm(true)}>
          {TEXT.unit.end}
        </Button>
      </div>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        closeLabel={TEXT.unit.close}
        title={TEXT.unit.endTitle}
        actions={
          <>
            <Button role="secondary" onClick={() => setConfirm(false)}>
              {TEXT.unit.cancel}
            </Button>
            <Button
              onClick={() => {
                void finishUnit(unit).then(() => setConfirm(false));
              }}
            >
              {TEXT.unit.end}
            </Button>
          </>
        }
      >
        <p>{TEXT.unit.endDescription}</p>
      </Dialog>
    </div>
  );
}

/** Starting a unit with one of the chapter's presentations: the ones the overview lists. */
function StartUnit({
  course,
  chapterId,
}: {
  course: Course;
  chapterId: string;
}) {
  const site = useSite();
  const { catalog } = site;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const presentations = catalog.presentations.filter((item) => {
    const set = catalog.foliensaetze.find(
      (candidate) => candidate.id === item.rootFoliensatzId,
    );
    return item.chapterId === chapterId && !!set?.inOverview;
  });
  const chosen =
    presentations.find((item) => item.id === selected) ?? presentations[0];
  if (!presentations.length) {
    return <Alert status="info">{TEXT.unit.noPresentation}</Alert>;
  }

  async function start() {
    if (!chosen) {
      return;
    }
    setBusy(true);
    setFailed(false);
    const path = `${chapterPathById(course, chapterId)}/lesson?presentation=${encodeURIComponent(chosen.id)}`;
    const unit = await beginUnit({
      courseId: course.id,
      presentationId: chosen.id,
      path,
      periods: catalog.timetable.periods,
      classroom: site.classroomEnabled,
      existingCode:
        site.classroom?.role === "controller" ? site.classroom.code : null,
      refresh: async () => {
        await revalidator.revalidate();
      },
    });
    setBusy(false);
    if (unit) {
      void navigate(path);
    } else {
      setFailed(true);
    }
  }

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {TEXT.unit.start}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        closeLabel={TEXT.unit.close}
        title={TEXT.unit.start}
      >
        <div className="teacher-controls-start-options">
          {presentations.map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="presentation"
                value={item.id}
                checked={chosen?.id === item.id}
                onChange={() => setSelected(item.id)}
              />
              {item.title}
            </label>
          ))}
        </div>
        {failed && <Alert status="error">{TEXT.unit.failed}</Alert>}
        <div className="teacher-controls-actions">
          <Button role="secondary" onClick={() => setOpen(false)}>
            {TEXT.unit.cancel}
          </Button>
          <Button disabled={busy} onClick={() => void start()}>
            {busy ? TEXT.unit.starting : TEXT.unit.start}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/**
 * "Unterricht starten" in the overview, or, while a unit runs in this
 * browser, the way back to it and the way to end it.
 */
export function LessonStart({
  course,
  chapterId,
}: {
  course: Course;
  chapterId: string;
}) {
  const unit = useRunningUnit();
  useEndedSessionGuard(unit);
  return unit ? (
    <RunningUnit unit={unit} />
  ) : (
    <StartUnit course={course} chapterId={chapterId} />
  );
}
