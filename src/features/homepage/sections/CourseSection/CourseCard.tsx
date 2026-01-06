"use client";

import clsx from "clsx";
import type { ComponentType } from "react";
import { ArrowRight, type LucideProps } from "lucide-react";
import Link from "next/link";
import HOMEPAGE_TEXT from "@homepage/homepage.de.json";
import { IconContainer } from "@homepage/components/IconContainer/IconContainer";
import { ConfigableIcon, type IconName } from "@/components/ConfigableIcon/ConfigableIcon";
import styles from "@homepage/sections/CourseSection/CourseCard.module.css";
import { CourseDTO } from "@/domain/courseDTO";

const coursesText = HOMEPAGE_TEXT.courses;

type CourseCardProps = {
  course: CourseDTO;
  href?: string;
  actionLabel?: string;
};

export function CourseCard({ course, href, actionLabel }: CourseCardProps) {
  const { label, description, tags, icon, color, slug } = course;
  const colorClass = styles[`${color}Color`] ?? styles.purpleColor;
  const iconKey = (icon ?? "book-open") as IconName;
  const IconComponent: ComponentType<LucideProps> = (props) => (
    <ConfigableIcon iconKey={iconKey} {...props} />
  );
  const targetHref = href ?? slug;

  return (
    <Link
      href={targetHref}
      className={clsx(styles.courseCard, colorClass)}
      aria-label={`Open course ${label}`}
    >
      <div className={styles.accentBar} />

      <div className={styles.cardBody}>
        <div className={styles.iconRow}>
          <IconContainer
            Icon={IconComponent}
            size="md"
            backgroundColor="var(--accent-surface)"
            foregroundColor="var(--accent-strong)"
          />
        </div>

        <h3 className={styles.cardTitle}>{label}</h3>
        <p className={styles.cardDescription}>{description}</p>

        <div className={styles.tagRow}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span>{actionLabel ?? coursesText.openActionLabel}</span>
        <ArrowRight size={16} aria-hidden />
      </div>
    </Link>
  );
}
