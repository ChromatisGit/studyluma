"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Container.module.css";

export type ContainerProps = {
  children: ReactNode;
  size?: "narrow" | "wide" | "full";
  gutters?: boolean;
  className?: string;
};

export function Container({ children, size = "wide", gutters = true, className }: ContainerProps) {
  return (
    <div className={clsx(styles.container, styles[size], !gutters && styles.noGutters, className)}>
      {children}
    </div>
  );
}
