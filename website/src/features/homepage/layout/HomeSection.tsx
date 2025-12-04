import type { ReactNode } from 'react';
import layout from '@features/homepage/layout/HomepageLayout.module.css';

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
    <section id={id} className={layout.section}>
      <div className={layout.sectionInner}>
        <div className={layout.sectionCard}>
          <div className={layout.sectionHeader}>
            <h2 className={layout.sectionTitle}>{title}</h2>
            {subtitle ? <p className={layout.sectionSubtitle}>{subtitle}</p> : null}
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
