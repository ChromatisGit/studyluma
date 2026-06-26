import { Card } from "@components/Card";
import type { IconName } from "@components/ConfigableIcon/ConfigableIcon";
import type { AccentColor } from "@schema/accentColors";
import type { CourseDTO } from "@schema/courseTypes";

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
      actionLabel={actionLabel ?? "Öffnen"}
      href={targetHref}
      color={color as AccentColor}
    />
  );
}
