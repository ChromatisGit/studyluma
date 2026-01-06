"use client";

import type { ReactNode } from "react";

import { SectionShell } from "@components/SectionShell";
import styles from "./Homepage.module.css";

interface HomeSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared shell for homepage sections to keep spacing and typography consistent.
 */
export function HomeSection({ id, title, subtitle, children }: HomeSectionProps) {
  return (
    <SectionShell
      id={id}
      title={title}
      subtitle={subtitle}
      align="center"
      className={styles.homeSection}
    >
      {children}
    </SectionShell>
  );
}
