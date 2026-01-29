"use client";

import clsx from "clsx";
import { ChevronRight, House } from "lucide-react";

import { AppLink } from "@components/AppLink";
import { useRouteContext } from "@ui/contexts/RouteContext";
import type { SidebarDTO } from "@schema/sidebarDTO";
import styles from "./Breadcrumbs.module.css";
import LAYOUT_TEXT from "../layout.de.json";

type BreadcrumbsProps = {
  data: SidebarDTO;
};

export function Breadcrumbs({ data }: BreadcrumbsProps) {
  const {
    hasTopicContext,
    courseId,
    groupKey,
    subjectKey,
    topic,
    chapter,
    worksheet,
  } = useRouteContext();

  if (!hasTopicContext) {
    return null;
  }

  const items: Array<{ label: string; href: string }> = [];

  let homeUrl = "/";
  if (courseId) {
    homeUrl = groupKey && subjectKey ? `/${groupKey}/${subjectKey}` : "/";
  }

  let topicLabel = topic;
  let chapterLabel = chapter;
  let worksheetLabel = worksheet;

  if (courseId) {
    const topicData = data.topics.find((entry) => entry.topicId === topic);
    topicLabel = topicData?.label ?? topicLabel;
    const chapterData = topicData?.chapters.find((entry) => entry.chapterId === chapter);
    chapterLabel = chapterData?.label ?? chapterLabel;
    const worksheetData = chapterData?.worksheets?.find(
      (entry) => entry.worksheetId === worksheet
    );
    worksheetLabel = worksheetData?.label ?? worksheetLabel;
  }

  if (topic) {
    const topicUrl =
      groupKey && subjectKey
        ? `/${groupKey}/${subjectKey}/${topic}`
        : "/";

    items.push({
      label: topicLabel || topic,
      href: topicUrl,
    });
  }

  if (chapter) {
    const chapterUrl =
      groupKey && subjectKey && topic
        ? `/${groupKey}/${subjectKey}/${topic}/${chapter}`
        : "/";

    items.push({
      label: chapterLabel || chapter,
      href: chapterUrl,
    });
  }

  if (worksheet) {
    const worksheetUrl =
      groupKey && subjectKey && topic && chapter
        ? `/${groupKey}/${subjectKey}/${topic}/${chapter}/${worksheet}`
        : "/";

    items.push({
      label: worksheetLabel || worksheet,
      href: worksheetUrl,
    });
  }

  return (
    <nav className={styles.breadcrumbs} aria-label={LAYOUT_TEXT.breadcrumbs.ariaLabel}>
      <ol className={styles.list}>
        <li className={styles.item}>
          <AppLink href={homeUrl} className={clsx(styles.link, styles.home)}>
            <House size={16} />
          </AppLink>
        </li>

        {items.flatMap((item, index) => [
          <li key={`sep-${item.href}`} className={styles.separator} aria-hidden="true">
            <ChevronRight size={12} />
          </li>,
          <li key={item.href} className={styles.item}>
            <AppLink
              href={item.href}
              className={styles.link}
              active={index === items.length - 1}
              activeClassName={styles.linkActive}
            >
              {item.label}
            </AppLink>
          </li>,
        ])}
      </ol>
    </nav>
  );
}
