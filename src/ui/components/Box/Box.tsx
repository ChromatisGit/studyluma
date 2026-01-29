"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Box.module.css";

export type BoxProps = {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
};

export function Box({ children, className, padding = "md", hoverable = false }: BoxProps) {
  return (
    <div
      className={clsx(
        styles.box,
        styles[`padding-${padding}`],
        hoverable && styles.hoverable,
        className
      )}
    >
      {children}
    </div>
  );
}
