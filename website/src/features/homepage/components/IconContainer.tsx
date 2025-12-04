import type { CSSProperties } from 'react';
import { LucideIcon } from 'lucide-react';
import styles from '@features/homepage/components/IconContainer.module.css';

interface IconContainerProps {
  Icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'square' | 'circle';
  bgColor?: string;
  iconColor?: string;
}

const SIZE_CLASSES = {
  sm: { container: styles.iconSm, icon: 18 },
  md: { container: styles.iconMd, icon: 20 },
  lg: { container: styles.iconLg, icon: 22 },
} as const;

const DEFAULT_BG = 'var(--accent-surface, var(--sn-purple-accent-soft-bg))';
const DEFAULT_ICON = 'var(--accent-strong, var(--sn-purple-accent-strong))';

/**
 * Reusable icon container with consistent styling
 */
export function IconContainer({
  Icon,
  size = 'lg',
  variant = 'square',
  bgColor = DEFAULT_BG,
  iconColor = DEFAULT_ICON,
}: IconContainerProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const roundedClass = variant === 'circle' ? styles.iconCircle : undefined;
  const style: CSSProperties = {
    backgroundColor: bgColor,
    color: iconColor,
  };

  return (
    <div className={`${styles.icon} ${sizeClasses.container} ${roundedClass || ''}`} style={style}>
      <Icon size={sizeClasses.icon} aria-hidden />
    </div>
  );
}
