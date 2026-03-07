"use client";

import type { QuizMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<QuizMacro>;

/**
 * Slide-only renderer for quiz questions.
 * Displays the question and options as static text — no interactive elements.
 * Students answer on their own devices via the quiz session UI.
 */
export default function QuizRenderer({ macro }: Props) {
  const question = getMarkdown(macro.question);

  return (
    <div className={styles.quiz}>
      <div className={styles.questionLabel}>Quiz</div>
      {question && (
        <div className={styles.question}>
          <MarkdownRenderer markdown={question} />
        </div>
      )}
      <ol className={styles.options}>
        {macro.options.map((option, i) => {
          const text = getMarkdown(option);
          return (
            <li key={i} className={styles.option}>
              {text && <MarkdownRenderer markdown={text} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
