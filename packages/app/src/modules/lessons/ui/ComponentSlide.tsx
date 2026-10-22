import { createContext, useContext, useMemo } from "react";
import type { JsonValue } from "../../catalog";
import { ComponentHost } from "../../content-renderer";
import type { Slide } from "../domain/deck";
import type { ComponentSlides } from "../domain/lesson";

/**
 * The state of the Komponentenfolien in the lesson, and how to change it.
 * Only the teacher's stage can: the projector and the overview show it.
 */
export const ComponentSlideContext = createContext<{
  states: ComponentSlides;
  onChange?: (slideId: string, state: JsonValue) => void;
}>({ states: {} });

/** The Komponentenfolien of a lesson as the teacher's stage changes them. */
export function useComponentSlides(
  states: ComponentSlides | undefined,
  dispatch: (action: {
    type: "component";
    slideId: string;
    state: JsonValue;
  }) => void,
) {
  return useMemo(
    () => ({
      states: states ?? {},
      onChange: (slideId: string, state: JsonValue) =>
        dispatch({ type: "component", slideId, state }),
    }),
    [states, dispatch],
  );
}

type ComponentSlideOf = Slide & {
  componentSlide: NonNullable<Slide["componentSlide"]>;
};

/** The body of a Komponentenfolie: the component fills the slide below the tab. */
export function ComponentSlideBody({ slide }: { slide: ComponentSlideOf }) {
  const { states, onChange } = useContext(ComponentSlideContext);
  const current = states[slide.id];
  return (
    <div className="lf__component">
      <ComponentHost
        use={slide.componentSlide}
        placement="folie"
        state={current}
        onState={
          onChange &&
          ((update) => onChange(slide.id, update(current) as JsonValue))
        }
      />
    </div>
  );
}

export const isComponentSlide = (slide: Slide): slide is ComponentSlideOf =>
  slide.componentSlide !== undefined;
