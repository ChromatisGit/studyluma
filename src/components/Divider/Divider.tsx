import clsx from "clsx";
import styles from "./Divider.module.css";

export type DividerProps = {
  spacing?: "sm" | "md" | "lg";
  className?: string;
};

export function Divider({ spacing = "md", className }: DividerProps) {
  return (
    <hr className={clsx(styles.divider, styles[`spacing-${spacing}`], className)} />
  );
}
