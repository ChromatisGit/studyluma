import type { MouseEvent, ReactNode } from "react";
import type { CheckState } from "../domain/contract";
import type { Cursor } from "../domain/editor";
import type { MathNode, MathRow } from "../../content-renderer";

type Place = (row: MathRow, i: number) => void;

function charClass(v: string) {
  if (/[0-9,π]/.test(v)) {
    return "m-n";
  }
  if (/\p{L}/u.test(v)) {
    return "m-i";
  }
  return /[()]/.test(v) ? "m-p" : "m-o";
}

/** A click on a character puts the cursor before or after it. */
function hit(row: MathRow, i: number, place: Place | undefined) {
  if (!place) {
    return undefined;
  }
  return (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    place(row, event.clientX > box.left + box.width / 2 ? i + 1 : i);
  };
}

function nodeView(
  row: MathRow,
  node: MathNode,
  i: number,
  props: RowProps,
): ReactNode {
  const onClick = hit(row, i, props.place);
  switch (node.t) {
    case "frac":
      return (
        <span key={i} className="m-frac" onClick={onClick}>
          <span className="m-num">
            <RowView {...props} row={node.n} segments={undefined} />
          </span>
          <span className="m-den">
            <RowView {...props} row={node.d} segments={undefined} />
          </span>
        </span>
      );
    case "sqrt":
      return (
        <span key={i} className="m-sqrt" onClick={onClick}>
          <span className="m-radic">√</span>
          <span className="m-rad">
            <RowView {...props} row={node.b} segments={undefined} />
          </span>
        </span>
      );
    case "sup":
      return (
        <span key={i} className="m-sup" onClick={onClick}>
          <RowView {...props} row={node.e} segments={undefined} />
        </span>
      );
    default:
      return node.v === ";" ? (
        <span key={i} className="m-sep" onClick={onClick}>
          ;
        </span>
      ) : (
        <span key={i} className={charClass(node.v)} onClick={onClick}>
          {node.v}
        </span>
      );
  }
}

type RowProps = {
  row: MathRow;
  cursor?: Cursor | null | undefined;
  place?: Place | undefined;
  /** Per solution in a set: its tint after checking. */
  segments?: (CheckState | undefined)[] | undefined;
};

const caret = <span className="m-caret" aria-hidden="true" />;

function RowView({ row, cursor, place, segments }: RowProps) {
  const here = cursor?.row === row;
  if (!row.length) {
    return (
      <span
        className="m-slot"
        data-empty=""
        onClick={place ? () => place(row, 0) : undefined}
      >
        {here && caret}
      </span>
    );
  }
  const props = { row, cursor, place };
  const out: ReactNode[] = [];
  let current: ReactNode[] = [];
  let segment = 0;
  const flush = () => {
    out.push(
      segments ? (
        <span
          key={`seg-${segment}`}
          className="m-seg"
          data-state={segments[segment]}
        >
          {current}
        </span>
      ) : (
        current
      ),
    );
    current = [];
    segment++;
  };
  row.forEach((node, i) => {
    if (here && cursor?.i === i) {
      current.push(<span key={`caret-${i}`}>{caret}</span>);
    }
    if (segments && node.t === "c" && node.v === ";") {
      flush();
      out.push(nodeView(row, node, i, props));
    } else {
      current.push(nodeView(row, node, i, props));
    }
  });
  if (here && cursor?.i === row.length) {
    current.push(<span key="caret-end">{caret}</span>);
  }
  flush();
  return <>{out}</>;
}

export function MathView(props: RowProps) {
  return <RowView {...props} />;
}
