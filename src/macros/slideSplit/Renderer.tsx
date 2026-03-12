import type { SlideSplitMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { renderMacro } from "@macros/registry";
import styles from "./styles.module.css";

type Props = MacroComponentProps<SlideSplitMacro>;

export default function SlideSplitRenderer({ macro, context }: Props) {
  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        {macro.left.map((item, i) => renderMacro(item, context, i))}
      </div>
      <div className={styles.col}>
        {macro.right.map((item, i) => renderMacro(item, context, i))}
      </div>
    </div>
  );
}
