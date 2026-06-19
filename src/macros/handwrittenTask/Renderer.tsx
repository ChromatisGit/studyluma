"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import type { HandwrittenTaskMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroCheck } from "@macros/state/useMacroCheck";
import { Stack } from "@components/Stack";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<HandwrittenTaskMacro> & {
  /** Absolute URL to the generated PDF, if available. */
  pdfUrl?: string | undefined;
};

export default function HandwrittenTaskRenderer({ macro, context, pdfUrl }: Props) {
  const [isChecked, setIsChecked] = useState(false);
  const [isIos, setIsIos] = useState(false);

  // Client-side iOS detection — avoids SSR mismatch
  useEffect(() => {
    setIsIos(/iPad|iPhone/.test(navigator.userAgent));
  }, []);

  // handwritten tasks are always "attempted" — the student has to work on paper
  useMacroCheck(context, true, () => setIsChecked(true));

  const instruction = getMarkdown(macro.instruction);
  const hint = getMarkdown(macro.hint);
  const answer = getMarkdown(macro.answer);

  const goodnotesUrl = pdfUrl
    ? `goodnotes://open?url=${encodeURIComponent(pdfUrl)}`
    : undefined;

  if (context.pdfSection) {
    return (
      <Stack gap="md">
        {instruction && <MarkdownRenderer markdown={instruction} />}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {instruction && <MarkdownRenderer markdown={instruction} />}

      {pdfUrl ? (
        isIos && goodnotesUrl ? (
          <a href={goodnotesUrl} className={styles.pdfButton}>
            <FileText className={styles.pdfButtonIcon} aria-hidden />
            {MACROS_TEXT.handwrittenTask.openInGoodnotes}
          </a>
        ) : (
          <a href={pdfUrl} download className={styles.pdfButton}>
            <FileText className={styles.pdfButtonIcon} aria-hidden />
            {MACROS_TEXT.handwrittenTask.downloadPdf}
          </a>
        )
      ) : (
        <div className={styles.noPdf}>
          <FileText className={styles.pdfButtonIcon} aria-hidden />
          {MACROS_TEXT.handwrittenTask.downloadPdf}
        </div>
      )}

      {(hint || (isChecked && answer)) && (
        <Stack gap="sm">
          {hint && (
            <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
          )}
          {isChecked && answer && (
            <CollapsibleSection
              type="answer"
              defaultOpen={false}
              content={<MarkdownRenderer markdown={answer} />}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
