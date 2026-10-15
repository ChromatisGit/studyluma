import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Sets each card's minimum height so that, row by row, the cards are equally
 * high while all are closed or all are open, but a closed card keeps its
 * closed height when its neighbour opens (it neither shrinks nor grows).
 */
function equalizeCards(grid: HTMLElement) {
  const cards = [...grid.children] as HTMLElement[];
  grid.style.alignItems = "start";
  for (const card of cards) {
    card.style.minHeight = "";
  }
  const measured = cards.map((card) => {
    const box = card.getBoundingClientRect();
    const open =
      card
        .querySelector(".merkkarte__toggle")
        ?.getAttribute("aria-expanded") === "true";
    const example = card.querySelector<HTMLElement>(".merkkarte__example");
    const gap = example?.parentElement
      ? parseFloat(getComputedStyle(example.parentElement).rowGap) || 0
      : 0;
    const exampleHeight =
      open && example ? example.getBoundingClientRect().height + gap : 0;
    return {
      card,
      row: Math.round(box.top),
      open,
      natural: box.height,
      closed: box.height - exampleHeight,
    };
  });
  const rows = new Map<number, typeof measured>();
  for (const item of measured) {
    rows.set(item.row, [...(rows.get(item.row) ?? []), item]);
  }
  for (const items of rows.values()) {
    const open = items.filter((item) => item.open);
    const height =
      open.length === items.length
        ? Math.max(...items.map((item) => item.natural))
        : Math.max(...items.map((item) => item.closed));
    for (const item of items) {
      if (!item.open || open.length === items.length) {
        item.card.style.minHeight = `${height}px`;
      }
    }
  }
}

/** Two or more Merkkarten in a row: a grid with two columns where it fits. */
export function MerkkartenGruppe({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) {
      return;
    }
    const layout = () => equalizeCards(grid);
    layout();
    // Cards change size with the width, fonts and rendered math. Our own
    // min-heights settle on the same sizes, so this does not loop.
    let frame = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    });
    resize.observe(grid);
    // The content itself, not the cards: their size follows our min-heights.
    for (const part of grid.querySelectorAll(
      ".merkkarte__head, .merkkarte__body > *",
    )) {
      resize.observe(part);
    }
    const mutation = new MutationObserver(layout);
    mutation.observe(grid, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-expanded", "hidden"],
    });
    void document.fonts?.ready.then(layout);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className="merkkarten-gruppe">
      {children}
    </div>
  );
}
