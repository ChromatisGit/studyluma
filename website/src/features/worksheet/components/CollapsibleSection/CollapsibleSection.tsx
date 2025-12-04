import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import styles from './CollapsibleSection.module.css';
import { strings } from '@features/worksheet/config/strings';

interface CollapsibleSectionProps {
  type: 'hint' | 'solution';
  content: React.ReactNode;
}

export function CollapsibleSection({ type, content }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const config = type === 'hint'
    ? {
      icon: Lightbulb,
      label: strings.sections.hint,
      variant: styles.collapsibleHint,
    }
    : {
      icon: BookOpen,
      label: strings.sections.solution,
      variant: styles.collapsibleSolution,
    };

  const Icon = config.icon;

  return (
    <div className={`${styles.collapsible} ${config.variant}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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
            <p className={styles.bodyText}>{content}</p>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  );
}
