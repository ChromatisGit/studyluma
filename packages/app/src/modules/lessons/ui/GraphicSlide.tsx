import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Plus, X } from "lucide-react";
import { fill } from "../../../helper/text";
import {
  describeGraphic,
  fitPlot,
  GraphicPlot,
  shownOf,
  SliderRow,
  slidersByGraph,
  useBoxSize,
  valuesOf,
  withOwn,
  type OwnFunction,
} from "../../content-renderer";
import { MathEntry } from "../../worksheets";
import type { GraphicSlides } from "../domain/lesson";
import type { GraphicChange } from "../domain/session";
import type { Slide } from "../domain/deck";
import TEXT from "./lessons.de.json";

/**
 * What the lesson changed on the Grafikfolien, and how to change it. Only the
 * teacher's stage can: the projector and the overview show the state.
 */
export const GraphicSlideContext = createContext<{
  changes: GraphicSlides;
  onChange?: (slideId: string, change: GraphicChange) => void;
}>({ changes: {} });

/** The Grafikfolien of a lesson as the teacher's stage changes them. */
export function useGraphicSlides(
  changes: GraphicSlides | undefined,
  dispatch: (action: {
    type: "graphic";
    slideId: string;
    change: GraphicChange;
  }) => void,
) {
  return useMemo(
    () => ({
      changes: changes ?? {},
      onChange: (slideId: string, change: GraphicChange) =>
        dispatch({ type: "graphic", slideId, change }),
    }),
    [changes, dispatch],
  );
}

/** The curve line width on a Grafikfolie; the projector is read from afar. */
const CURVE_WEIGHT = 4;

function FormulaLine({
  slide,
  index,
  shown,
  children,
}: {
  slide: GraphicSlideOf;
  index: number;
  shown: boolean;
  children?: ReactNode;
}) {
  const { onChange } = useContext(GraphicSlideContext);
  const graph = slide.graphicSlide.graphic.graphs[index];
  return (
    <div className="lf-fn">
      <button
        type="button"
        className={`lf-fn__line${shown ? "" : " is-off"}`}
        style={{ "--lf-curve": `var(--graphic-c${index % 4})` } as never}
        aria-pressed={shown}
        aria-label={graph?.label?.source ?? graph?.source}
        disabled={!onChange}
        onClick={() =>
          onChange?.(slide.id, { kind: "visible", index, visible: !shown })
        }
      >
        <span className="lf-fn__swatch" aria-hidden="true" />
        {graph?.label ? (
          <span
            className="math-inline lf-fn__formula"
            dangerouslySetInnerHTML={{ __html: graph.label.display }}
          />
        ) : (
          <span className="lf-fn__formula">{graph?.source}</span>
        )}
      </button>
      {children}
    </div>
  );
}

type GraphicSlideOf = Slide & {
  graphicSlide: NonNullable<Slide["graphicSlide"]>;
};

/** A function typed in during the lesson: swatch, `y =` and the field. */
function OwnLine({
  slideId,
  index,
  color,
  own,
  fresh,
  onLeave,
}: {
  slideId: string;
  /** Among the functions typed in. */
  index: number;
  /** Among all curves, for the color. */
  color: number;
  own: OwnFunction;
  fresh: boolean;
  onLeave: () => void;
}) {
  const { onChange } = useContext(GraphicSlideContext);
  const set = (next: OwnFunction | null) =>
    onChange?.(slideId, { kind: "own", index, own: next });
  const shown = !own.hidden;
  return (
    <div
      className={`lf-fn__line lf-fn__line--own${shown ? "" : " is-off"}`}
      style={{ "--lf-curve": `var(--graphic-c${color % 4})` } as never}
    >
      <button
        type="button"
        className="lf-fn__toggle"
        aria-pressed={shown}
        aria-label={TEXT.graphicSlide.toggle}
        disabled={!onChange}
        onClick={() => set(shown ? { ...own, hidden: true } : { row: own.row })}
      >
        <span className="lf-fn__swatch" aria-hidden="true" />
      </button>
      <span className="lf-fn__formula lf-fn__y">
        <i>y</i> =
      </span>
      <MathEntry
        row={own.row}
        label={fill(TEXT.graphicSlide.own, { number: index + 1 })}
        locked={!onChange}
        autoFocus={fresh}
        onChange={(row) => set({ ...own, row })}
        // An entry left empty is not kept.
        onDone={() => {
          onLeave();
          if (!own.row.length) {
            set(null);
          }
        }}
      />
      {onChange && (
        <button
          type="button"
          className="lf-fn__remove"
          aria-label={TEXT.graphicSlide.remove}
          // The field keeps the focus: leaving it would drop an empty entry first.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => set(null)}
        >
          <X className="icon" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** The functions typed in during the lesson, and on the stage the way to add one. */
function OwnLines({
  slideId,
  own,
  first,
}: {
  slideId: string;
  own: OwnFunction[];
  /** How many curves come before, for the colors. */
  first: number;
}) {
  const { onChange } = useContext(GraphicSlideContext);
  // The entry just added takes the focus.
  const [fresh, setFresh] = useState<number | null>(null);
  return (
    <>
      {own.map((entry, index) => (
        <OwnLine
          key={index}
          slideId={slideId}
          index={index}
          color={first + index}
          own={entry}
          fresh={fresh === index}
          onLeave={() => setFresh(null)}
        />
      ))}
      {onChange && (
        <button
          type="button"
          className="lf-fn__add"
          aria-label={TEXT.graphicSlide.addLabel}
          onClick={() => {
            setFresh(own.length);
            onChange(slideId, {
              kind: "own",
              index: own.length,
              own: { row: [] },
            });
          }}
        >
          <Plus className="icon" aria-hidden="true" />
          {TEXT.graphicSlide.add}
        </button>
      )}
    </>
  );
}

/** The body of a Grafikfolie: the functions at the left, the graph filling the rest. */
export function GraphicSlideBody({ slide }: { slide: GraphicSlideOf }) {
  const { changes, onChange } = useContext(GraphicSlideContext);
  const { graphic, title } = slide.graphicSlide;
  const own = changes[slide.id];
  const values = valuesOf(graphic, own);
  const shown = shownOf(graphic, own);
  const sliders = slidersByGraph(graphic);
  // The plot fits the axes into the space it gets, with equal units.
  const { setElement, size } = useBoxSize();
  const fit =
    size && size.width > 0 && size.height > 0
      ? fitPlot(graphic.axes, size.width, size.height)
      : undefined;
  return (
    <div className="lf__graphic graphic">
      <div className="lf__graphic-side">
        {graphic.graphs.map((_, index) => (
          <FormulaLine
            key={index}
            slide={slide}
            index={index}
            shown={shown[index] ?? true}
          >
            {sliders[index]?.map((parameter) => (
              <SliderRow
                key={parameter.name}
                parameter={parameter}
                value={values[parameter.name] ?? parameter.start}
                fixed={!onChange}
                onChange={(value) =>
                  onChange?.(slide.id, {
                    kind: "value",
                    name: parameter.name,
                    value,
                  })
                }
              />
            ))}
          </FormulaLine>
        ))}
        <OwnLines
          slideId={slide.id}
          own={own?.own ?? []}
          first={graphic.graphs.length}
        />
      </div>
      <div className="lf__graphic-plot" ref={setElement}>
        {fit && (
          <GraphicPlot
            graphic={withOwn(graphic, own)}
            values={values}
            shown={shown}
            fit={fit}
            weight={CURVE_WEIGHT}
            label={title || describeGraphic(graphic)}
          />
        )}
      </div>
    </div>
  );
}

export const isGraphicSlide = (slide: Slide): slide is GraphicSlideOf =>
  slide.graphicSlide !== undefined;
