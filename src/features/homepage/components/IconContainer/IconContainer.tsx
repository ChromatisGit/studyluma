import clsx from "clsx";
import type { CSSProperties, ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import styles from "./IconContainer.module.css";

interface IconContainerProps {
  Icon: ComponentType<LucideProps>;
  size?: "sm" | "md" | "lg";
  variant?: "square" | "circle";
  backgroundColor?: string;
  foregroundColor?: string;
}

const SIZE_CLASSES = {
  sm: { container: styles.iconSm, icon: 18 },
  md: { container: styles.iconMd, icon: 20 },
  lg: { container: styles.iconLg, icon: 22 },
} as const;

const DEFAULT_BACKGROUND = "var(--accent-surface, var(--sn-purple-accent-soft-bg))";
const DEFAULT_FOREGROUND = "var(--accent-strong, var(--sn-purple-accent-strong))";

/**
 * Reusable icon container with consistent styling
 */
export function IconContainer({
  Icon,
  size = "lg",
  variant = "square",
  backgroundColor = DEFAULT_BACKGROUND,
  foregroundColor = DEFAULT_FOREGROUND,
}: IconContainerProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const roundedClass = variant === "circle" ? styles.iconCircle : undefined;
  const style: CSSProperties = {
    backgroundColor,
    color: foregroundColor,
  };

  return (
    <div className={clsx(styles.icon, sizeClasses.container, roundedClass)} style={style}>
      <Icon size={sizeClasses.icon} aria-hidden />
    </div>
  );
}
