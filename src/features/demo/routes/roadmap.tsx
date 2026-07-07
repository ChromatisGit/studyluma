import clsx from "clsx";
import {
  BookOpen,
  Check,
  CircleDot,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Presentation,
  Rocket,
  School,
  Shapes,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@components/Container";
import { buildMeta } from "@core/seo";
import { LightField } from "../components/LightField/LightField";
import { SiteFooter } from "./SiteFooter";
import TEXT from "./roadmap.de.json";
import styles from "./roadmap.module.css";

type RoadmapStatus = "finished" | "current" | "planned";

type RoadmapItem = {
  date: string;
  title: string;
  body: string[];
  bullets: string[];
  current?: boolean;
};

type RoadmapBulletProps = {
  status: RoadmapStatus;
  icon: LucideIcon;
};

const ROADMAP_ICONS: LucideIcon[] = [
  Rocket,
  School,
  CircleDot,
  Presentation,
  Shapes,
  BookOpen,
  Clock3,
  GraduationCap,
  Users,
  HeartHandshake,
];

export function meta() {
  return buildMeta({
    title: TEXT.meta.title,
    description: TEXT.meta.description,
    path: "/roadmap",
  });
}

export default function RoadmapPage() {
  return (
    <>
      <main className={styles.page}>
        <LightField />
        <div className={styles.pageGlow} aria-hidden />
        <Container size="narrow">
          <div className={styles.card}>
            <nav className={clsx(styles.backNav, "md:hidden")}>
              <a href="/" className={styles.backLink}>
                <span aria-hidden>←</span>
                {TEXT.page.backLink}
              </a>
            </nav>

            <header className={styles.header}>
              <h1 className={styles.title}>{TEXT.page.title}</h1>
              <p className={styles.intro}>{TEXT.page.intro}</p>
            </header>

            <ProjectRoadmap items={TEXT.roadmap} />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

function ProjectRoadmap({ items }: { items: RoadmapItem[] }) {
  const currentIndex = items.findIndex((item) => item.current);

  return (
    <ol className={styles.roadmap} aria-label={TEXT.page.title}>
      {items.map((item, index) => {
        const status = getRoadmapStatus(index, currentIndex);
        const Icon = ROADMAP_ICONS[index] ?? CircleDot;
        const isLast = index === items.length - 1;

        return (
          <RoadmapEntry
            key={`${item.date}-${item.title}`}
            item={item}
            status={status}
            icon={Icon}
            isLast={isLast}
          />
        );
      })}
    </ol>
  );
}

function RoadmapEntry({
  item,
  status,
  icon,
  isLast,
}: {
  item: RoadmapItem;
  status: RoadmapStatus;
  icon: LucideIcon;
  isLast: boolean;
}) {
  return (
    <li className={clsx(styles.item, !isLast && styles.itemSpaced)}>
      {!isLast && (
        <div
          className={clsx(
            styles.segment,
            status === "finished" ? styles.segmentFinished : styles.segmentPlanned,
          )}
          aria-hidden
        />
      )}

      <div className={styles.itemRow}>
        <div className={styles.bulletWrapper}>
          <RoadmapBullet status={status} icon={icon} />
        </div>

        <article className={styles.content}>
          <div className={styles.heading}>
            <span className={styles.date}>{item.date}</span>
            <div className={styles.titleRow}>
              <h2 className={styles.entryTitle}>{item.title}</h2>
              {status === "current" && (
                <span className={styles.currentBadge}>Aktueller Stand</span>
              )}
            </div>
          </div>

          <div className={styles.body}>
            {item.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <ul className={styles.bulletList}>
            {item.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
      </div>
    </li>
  );
}

function RoadmapBullet({ status, icon: Icon }: RoadmapBulletProps) {
  return (
    <div className={clsx(styles.bullet, styles[`bullet${capitalize(status)}`])}>
      {status === "finished" ? (
        <Check size={18} strokeWidth={4} aria-hidden />
      ) : (
        <Icon size={18} strokeWidth={2.25} aria-hidden />
      )}
    </div>
  );
}

function getRoadmapStatus(index: number, currentIndex: number): RoadmapStatus {
  if (currentIndex < 0) return "planned";
  if (index < currentIndex) return "finished";
  if (index === currentIndex) return "current";
  return "planned";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
