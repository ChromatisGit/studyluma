import type { CalloutMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<CalloutMacro>;

export default function CalloutRenderer({ macro }: Props) {
  const content = getMarkdown(macro.content);
  return (
    <div className={styles.callout}>
      <MarkdownRenderer markdown={content ?? ""} />
    </div>
  );
}
