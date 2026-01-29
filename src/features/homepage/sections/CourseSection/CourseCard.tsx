"use client";

import { Card } from "@components/Card";
import type { IconName } from "@components/ConfigableIcon/ConfigableIcon";
import { AccentColor } from "@schema/accentColors";
import type { CourseDTO } from "@schema/courseDTO";
import HOMEPAGE_TEXT from "@homepage/homepage.de.json";

const coursesText = HOMEPAGE_TEXT.courses;

type CourseCardProps = {
  course: CourseDTO;
  href?: string;
  actionLabel?: string;
};

export function CourseCard({ course, href, actionLabel }: CourseCardProps) {
  const { label, description, tags, icon, color, slug } = course;
  const iconKey = (icon ?? "book-open") as IconName;
  const targetHref = href ?? slug;

  return (
    <Card
      title={label}
      subtitle={description}
      icon={iconKey}
      tags={tags}
      actionLabel={actionLabel ?? coursesText.openActionLabel}
      href={targetHref}
      color={color as AccentColor}
    />
  );
}
