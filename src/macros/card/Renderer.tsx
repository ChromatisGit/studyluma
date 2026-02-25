import type { CardMacro, CardKind } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import PairsRenderer from "../pairs/Renderer";
import { Info, BookOpen, FlaskConical, Check, HelpCircle, CheckSquare, Star, RefreshCw, Bookmark, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<CardMacro>;

const ICONS: Record<CardKind, React.ComponentType<{ className?: string }>> = {
  definition: BookOpen,
  concept: Info,
  example: FlaskConical,
  check: Check,
  prompt: HelpCircle,
  task: CheckSquare,
  highlight: Star,
  recap: RefreshCw,
  remember: Bookmark,
  warning: AlertTriangle,
};

const KIND_STYLE: Record<CardKind, string> = {
  definition: styles.neutral,
  concept: styles.neutral,
  example: styles.neutral,
  check: styles.neutral,
  prompt: styles.task,
  task: styles.task,
  highlight: styles.emphasis,
  recap: styles.emphasis,
  remember: styles.emphasis,
  warning: styles.warning,
};

export default function CardRenderer({ macro, context }: Props) {
  const content = getMarkdown(macro.content);
  const Icon = ICONS[macro.kind];
  const label = MACROS_TEXT.card[macro.kind];
  const hasPairs = macro.pairs && macro.pairs.length > 0;
  const hasText = content && content.trim().length > 0;

  return (
    <div className={clsx(styles.card, KIND_STYLE[macro.kind])}>
      <div className={styles.header}>
        <Icon className={styles.icon} />
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.content}>
        {hasText && <MarkdownRenderer markdown={content} />}
        {hasPairs && (
          <PairsRenderer
            macro={{ type: "pairs", items: macro.pairs! }}
            context={context}
          />
        )}
      </div>
    </div>
  );
}
