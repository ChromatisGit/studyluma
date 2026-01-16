"use client";

import clsx from "clsx";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConfigableIcon, type IconName } from "@/components/ConfigableIcon/ConfigableIcon";
import styles from "./Card.module.css";
import { AccentColor } from "@/domain/accentColors";

export type CardProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  tags?: string[];
  actionLabel?: string;
  href: string;
  color?: AccentColor;
  className?: string;
};

export function Card({
  title,
  subtitle,
  icon,
  tags,
  actionLabel,
  href,
  color = "purple",
  className,
}: CardProps) {
  const colorClass = styles[`color-${color}`];

  return (
    <Link
      href={href}
      className={clsx(styles.card, colorClass, className)}
      aria-label={actionLabel ? `${actionLabel}: ${title}` : title}
    >
      <div className={styles.header}>
        {icon ? (
          <div className={styles.iconContainer}>
            <ConfigableIcon iconKey={icon} />
          </div>
        ) : null}
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      </div>

      {tags && tags.length > 0 ? (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {actionLabel ? (
        <div className={styles.footer}>
          <span>{actionLabel}</span>
          <ArrowRight size={16} aria-hidden />
        </div>
      ) : null}
    </Link>
  );
}
