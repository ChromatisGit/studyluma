import { Button } from "@chromatis/base/ui";
import { Link } from "react-router";
import TEXT from "./lessons.de.json";

/** Shown where no unit runs in this browser, e.g. after it ended or on a stale link. */
export function NoUnit({
  onStart,
  failed,
  overviewPath,
}: {
  onStart: () => void;
  failed: boolean;
  overviewPath: string;
}) {
  return (
    <div className="lt lt--none">
      <h1>{TEXT.none.title}</h1>
      <p>{TEXT.none.description}</p>
      <div className="lt-none__actions">
        <Button onClick={onStart}>{TEXT.none.start}</Button>
        <Link className="lt-none__back" to={overviewPath}>
          {TEXT.none.back}
        </Link>
      </div>
      {failed && <p role="alert">{TEXT.none.failed}</p>}
    </div>
  );
}
