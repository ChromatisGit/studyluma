import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  describeGraphic,
  fitPlot,
  GraphicPlot,
  shownOf,
  SliderRow,
  slidersByGraph,
  valuesOf,
} from "../../content-renderer";
import type { GraphicSlides } from "../domain/lesson";
import type { GraphicChange } from "../domain/session";
import type { Slide } from "../domain/deck";

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

/** The size the plot may take; it fits the axes into it with equal units. */
function useSize() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!element) {
      return;
    }
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { setElement, size };
}

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

/** The body of a Grafikfolie: the functions at the left, the graph filling the rest. */
export function GraphicSlideBody({ slide }: { slide: GraphicSlideOf }) {
  const { changes, onChange } = useContext(GraphicSlideContext);
  const { graphic, title } = slide.graphicSlide;
  const own = changes[slide.id];
  const values = valuesOf(graphic, own);
  const shown = shownOf(graphic, own);
  const sliders = slidersByGraph(graphic);
  const { setElement, size } = useSize();
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
      </div>
      <div className="lf__graphic-plot" ref={setElement}>
        {fit && (
          <GraphicPlot
            graphic={graphic}
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
