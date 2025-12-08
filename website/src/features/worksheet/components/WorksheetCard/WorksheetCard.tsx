import clsx from "clsx";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import {
  ArrowUpRight,
  FileCheck2,
  FileText,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import type { WorksheetProcess, WorksheetRef } from "@worksheet/worksheetFiles";
import styles from "./WorksheetCard.module.css";

type WorksheetCardProps = WorksheetRef & {
  className?: string;
};

type ProcessMeta = {
  icon: LucideIcon;
  label: string;
  accentClass: string;
  description: string;
  openInNewTab: boolean;
};

const PROCESS_META: Record<WorksheetProcess, ProcessMeta> = {
  web: {
    icon: Globe2,
    label: "Web",
    accentClass: styles.processWeb,
    description: "Direkt im Browser",
    openInNewTab: false,
  },
  pdf: {
    icon: FileText,
    label: "PDF",
    accentClass: styles.processPdf,
    description: "Download als PDF",
    openInNewTab: true,
  },
  pdfSolution: {
    icon: FileCheck2,
    label: "Lösung",
    accentClass: styles.processSolution,
    description: "PDF mit Loesung",
    openInNewTab: true,
  },
};

const EXTERNAL_PROTOCOL = /^(https?:|mailto:|tel:)/;

export default function WorksheetCard({
  href,
  label,
  process,
  className,
}: WorksheetCardProps) {
  const baseHref = useBaseUrl(href);
  const meta = PROCESS_META[process];
  const isExternalHref = EXTERNAL_PROTOCOL.test(href);
  const linkTarget = meta.openInNewTab || isExternalHref ? "_blank" : undefined;
  const rel = linkTarget ? "noreferrer noopener" : undefined;
  const linkProps = isExternalHref ? { href } : { to: baseHref };

  return (
    <div className={clsx("col", "col--6", styles.column)}>
      <Link
        {...linkProps}
        className={clsx(styles.card, meta.accentClass, className)}
        target={linkTarget}
        rel={rel}
        aria-label={`${label} (${meta.label})`}
      >
        <div className={styles.iconBubble}>
          <meta.icon size={22} aria-hidden />
        </div>

        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.title}>{label}</h3>
            <span className={styles.badge}>{meta.label}</span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaText}>{meta.description}</span>
            <ArrowUpRight size={16} aria-hidden />
          </div>
        </div>
      </Link>
    </div>
  );
}
