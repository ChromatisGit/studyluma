"use client";

import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function useResponsiveCols(opts: {
  minItemWidth: number;
  gap: number;
  maxCols?: number;
}) {
  const { minItemWidth, gap, maxCols = Infinity } = opts;
  const ref = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(
    maxCols !== Infinity ? Math.min(4, maxCols) : 4
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const raw = Math.floor((width + gap) / (minItemWidth + gap));
      setCols(clamp(raw, 1, maxCols));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [minItemWidth, gap, maxCols]);

  return { ref, cols };
}
