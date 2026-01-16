import clsx from "clsx";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import styles from "./IconBox.module.css";

export type IconBoxSize = "sm" | "md" | "lg";
export type IconBoxVariant = "square" | "circle";
export type IconBoxColor = "purple" | "blue" | "green" | "orange" | "teal" | "red" | "neutral";

type IconBoxProps = {
  icon: ComponentType<LucideProps>;
  size?: IconBoxSize;
  variant?: IconBoxVariant;
  color?: IconBoxColor;
  className?: string;
};

const ICON_SIZES = {
  sm: 18,
  md: 20,
  lg: 22,
} as const;

export function IconBox({
  icon: Icon,
  size = "md",
  variant = "square",
  color = "purple",
  className,
}: IconBoxProps) {
  return (
    <div
      className={clsx(
        styles.iconBox,
        styles[`size-${size}`],
        styles[`color-${color}`],
        variant === "circle" && styles.circle,
        className
      )}
    >
      <Icon size={ICON_SIZES[size]} aria-hidden />
    </div>
  );
}
