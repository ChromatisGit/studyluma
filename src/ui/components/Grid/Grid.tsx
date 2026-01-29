"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Grid.module.css";

export type GridProps = {
  children: ReactNode;
  minItemWidth?: number;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

export function Grid({ children, minItemWidth = 280, gap = "md", className }: GridProps) {
  return (
    <div
      className={clsx(styles.grid, styles[`gap-${gap}`], className)}
      style={{ "--grid-min-item-width": `${minItemWidth}px` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
