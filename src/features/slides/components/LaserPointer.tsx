"use client";

import styles from "./LaserPointer.module.css";

type LaserPointerProps = {
  position?: { x: number; y: number; visible: boolean };
};

export function LaserPointer({ position }: LaserPointerProps) {
  if (!position?.visible) return null;

  return (
    <div
      className={styles.laser}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
      }}
    />
  );
}
