import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, type LucideIcon } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { IconContainer } from "@features/homepage/components/IconContainer";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";
import styles from "@features/homepage/sections/CourseSection/CourseCard.module.css";
import { Course } from "@builder/transformer/courses";
import Link from "@docusaurus/Link";

const COLOR_CLASS_MAP: Record<Course['color'], string> = {
  purple: styles.colorPurple,
  blue: styles.colorBlue,
  green: styles.colorGreen,
  orange: styles.colorOrange,
  teal: styles.colorTeal,
  red: styles.colorRed,
};

const ICON_CACHE = new Map<string, LucideIcon>();
const FALLBACK_ICON = BookOpen;
const COURSE_COPY = HOMEPAGE_COPY.courses;

function normalizeIconName(iconName?: string) {
  if (!iconName) return undefined;

  return iconName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function useCourseIcon(iconName?: string) {
  const [IconComponent, setIconComponent] = useState<LucideIcon>(() => FALLBACK_ICON);

  useEffect(() => {
    const normalizedName = normalizeIconName(iconName);
    if (!normalizedName) {
      setIconComponent(() => FALLBACK_ICON);
      return;
    }

    const cachedIcon = ICON_CACHE.get(normalizedName);
    if (cachedIcon) {
      setIconComponent(() => cachedIcon);
      return;
    }

    const importer = (dynamicIconImports as Record<string, () => Promise<{ default: LucideIcon }>>)[normalizedName];
    if (!importer) {
      setIconComponent(() => FALLBACK_ICON);
      return;
    }

    let active = true;

    importer()
      .then((mod) => {
        if (!active) return;
        const LoadedIcon = mod.default as LucideIcon;
        ICON_CACHE.set(normalizedName, LoadedIcon);
        setIconComponent(() => LoadedIcon);
      })
      .catch(() => {
        if (!active) return;
        setIconComponent(() => FALLBACK_ICON);
      });

    return () => {
      active = false;
    };
  }, [iconName]);

  return IconComponent;
}

export function CourseCard({ course }: { course: Course }) {
  const { title, description, tags, icon, color, group, slug } = course;
  const colorClass = COLOR_CLASS_MAP[color] ?? styles.colorPurple;
  const IconComponent = useCourseIcon(icon);

  return (
    <Link
      to={[group, slug].join('/')}
      className={`${styles.courseCard} ${colorClass}`}
      aria-label={`Enter ${title} course`}
    >
      <div className={styles.accentBar} />

      <div className={styles.cardBody}>
        <div className={styles.iconRow}>
          <IconContainer
            Icon={IconComponent}
            size="md"
            bgColor="var(--accent-surface)"
            iconColor="var(--accent-strong)"
          />
        </div>

        <h3 className={styles.cardTitle}>{title}</h3>
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
        <span>{COURSE_COPY.openActionLabel}</span>
        <ArrowRight size={16} aria-hidden style={{ marginLeft: "0.2rem" }} />
      </div>
    </Link>
  );
}
