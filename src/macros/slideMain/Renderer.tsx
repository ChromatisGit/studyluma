import type { SlideMainMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { renderMacro } from "@macros/registry";
import styles from "./styles.module.css";

type Props = MacroComponentProps<SlideMainMacro>;

export default function SlideMainRenderer({ macro, context }: Props) {
  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        {macro.main.map((item, i) => renderMacro(item, context, i))}
      </div>
      <div className={styles.col}>
        {macro.aside.map((item, i) => renderMacro(item, context, i))}
      </div>
    </div>
  );
}
