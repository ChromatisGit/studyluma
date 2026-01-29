"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Container.module.css";

export type ContainerProps = {
  children: ReactNode;
  size?: "narrow" | "wide" | "full";
  className?: string;
};

export function Container({ children, size = "wide", className }: ContainerProps) {
  return (
    <div className={clsx(styles.container, styles[size], className)}>
      {children}
    </div>
  );
}
