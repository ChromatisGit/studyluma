import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./SectionShell.module.css";

export type SectionShellProps = {
  id?: string | undefined;
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  children: ReactNode;
  align?: "left" | "center" | undefined;
  className?: string | undefined;
  innerClassName?: string | undefined;
  cardClassName?: string | undefined;
  headerClassName?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
};

export function SectionShell({
  id,
  title,
  subtitle,
  children,
  align = "left",
  className,
  innerClassName,
  cardClassName,
  headerClassName,
  titleClassName,
  subtitleClassName,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={clsx(
        styles.section,
        align === "center" ? styles.alignCenter : null,
        className
      )}
    >
      <div className={clsx(styles.inner, innerClassName)}>
        <div className={clsx(styles.card, cardClassName)}>
          <div className={clsx(styles.header, headerClassName)}>
            <h2 className={clsx(styles.title, titleClassName)}>{title}</h2>
            {subtitle ? (
              <p className={clsx(styles.subtitle, subtitleClassName)}>{subtitle}</p>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
