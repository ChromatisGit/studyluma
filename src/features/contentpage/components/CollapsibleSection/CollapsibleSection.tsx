"use client";

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import styles from './CollapsibleSection.module.css';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import sharedStyles from '@features/contentpage/styles/shared.module.css';

interface CollapsibleSectionProps {
  type: 'hint' | 'solution';
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ type, content, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const config = type === 'hint'
    ? {
      icon: Lightbulb,
      label: CONTENTPAGE_TEXT.sections.hint,
      variant: styles.collapsibleHint,
    }
    : {
      icon: BookOpen,
      label: CONTENTPAGE_TEXT.sections.solution,
      variant: styles.collapsibleSolution,
    };

  const Icon = config.icon;

  return (
    <div className={`${styles.collapsible} ${config.variant}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={styles.collapsibleHeader}
      >
        {isOpen ? (
          <ChevronDown className={styles.collapsibleCaret} />
        ) : (
          <ChevronRight className={styles.collapsibleCaret} />
        )}
        <Icon className={styles.collapsibleIcon} />
        <span className={styles.collapsibleLabel}>{config.label}</span>
      </button>

      {isOpen && (
        <div className={styles.collapsibleContent}>
          {typeof content === 'string' ? (
            <p className={`${sharedStyles.bodyText} ${sharedStyles.bodyTextNoMargin}`}>{content}</p>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  );
}
