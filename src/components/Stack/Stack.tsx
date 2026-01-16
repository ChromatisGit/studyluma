"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Stack.module.css";

export type StackProps = {
  children: ReactNode;
  gap?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
};

export function Stack({ children, gap = "md", className }: StackProps) {
  return (
    <div className={clsx(styles.stack, styles[`gap-${gap}`], className)}>
      {children}
    </div>
  );
}
