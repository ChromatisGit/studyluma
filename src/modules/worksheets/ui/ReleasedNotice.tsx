import { LockOpen } from "lucide-react";
import { Link } from "react-router";
import type { Aufgabe } from "../domain/contract";
import { isReleased } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { refLabel, TEXT } from "./texts";

/** For students: which solutions the teacher released on this page. */
export function ReleasedNotice({ aufgaben }: { aufgaben: Aufgabe[] }) {
  const { state, index, setUi } = useWorksheet();
  const released = aufgaben.filter((aufgabe) => isReleased(aufgabe, state));
  if (!released.length) {
    return null;
  }
  return (
    <p className="freigabe">
      <LockOpen className="icon" aria-hidden="true" />
      <span>
        {TEXT.released.text}{" "}
        {released.map((aufgabe, i) => {
          const info = index.aufgaben.get(aufgabe.id);
          return (
            <span key={aufgabe.id}>
              {i > 0 && ", "}
              <Link
                className="link"
                to={`#${aufgabe.id}`}
                onClick={() =>
                  setUi((current) => ({
                    ...current,
                    solutionOpen: {
                      ...current.solutionOpen,
                      [aufgabe.id]: true,
                    },
                  }))
                }
              >
                {info ? refLabel(info) : aufgabe.title}
              </Link>
            </span>
          );
        })}
      </span>
    </p>
  );
}
